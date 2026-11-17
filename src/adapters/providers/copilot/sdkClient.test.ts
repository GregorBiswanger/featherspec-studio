import { describe, expect, it } from 'vitest';
import { createFakeRuntimeClock } from '../../../core/runtime/testing/fakes';
import type { CopilotEvent, CopilotRuntimeExit, CopilotSessionConfig } from './client';
import { createSdkClientFactory, PING_INTERVAL_MS, type SdkClientLike, type SdkModule, type SdkSessionLike } from './sdkClient';

const flush = async (): Promise<void> => {
    for (let index = 0; index < 5; index++) {
        await new Promise<void>((resolve) => setImmediate(resolve));
    }
};

interface Recorder {
    constructed: Record<string, unknown>[];
    connections: { path: string }[];
    sessionConfigs: Record<string, unknown>[];
    resumed: { id: string; config: Record<string, unknown> }[];
    calls: string[];
    pingFailure: Error | undefined;
    loads: number;
    sessions: SdkSessionLike[];
}

function stubSdk(): { module: SdkModule; recorder: Recorder } {
    const recorder: Recorder = { constructed: [], connections: [], sessionConfigs: [], resumed: [], calls: [], pingFailure: undefined, loads: 0, sessions: [] };
    const makeSession = (id: string): SdkSessionLike => {
        const session: SdkSessionLike = {
            sessionId: id,
            send: (prompt) => {
                recorder.calls.push(`send:${prompt}`);
                return Promise.resolve('message-1');
            },
            abort: () => {
                recorder.calls.push('abort');
                return Promise.resolve();
            },
            disconnect: () => {
                recorder.calls.push('disconnect');
                return Promise.resolve();
            },
            rpc: { plan: { readSqlTodosWithDependencies: () => Promise.resolve({ rows: [{ title: 'Write test', status: 'done' }, { title: 'Write code', status: 'pending' }] }) } },
        };
        recorder.sessions.push(session);
        return session;
    };
    class StubClient implements SdkClientLike {
        constructor(options: Record<string, unknown>) {
            recorder.constructed.push(options);
        }
        start(): Promise<void> {
            recorder.calls.push('start');
            return Promise.resolve();
        }
        stop(): Promise<unknown> {
            recorder.calls.push('stop');
            return Promise.resolve([]);
        }
        forceStop(): Promise<void> {
            recorder.calls.push('forceStop');
            return Promise.resolve();
        }
        ping(): Promise<unknown> {
            recorder.calls.push('ping');
            return recorder.pingFailure === undefined ? Promise.resolve({ message: 'pong' }) : Promise.reject(recorder.pingFailure);
        }
        getStatus(): Promise<{ version: string; protocolVersion: number }> {
            return Promise.resolve({ version: '1.0.87', protocolVersion: 3 });
        }
        getAuthStatus(): Promise<{ isAuthenticated: boolean; authType?: string }> {
            return Promise.resolve({ isAuthenticated: true, authType: 'gh-cli' });
        }
        listModels(): Promise<{ id: string }[]> {
            return Promise.resolve([{ id: 'auto' }, { id: 'claude-sonnet-5' }]);
        }
        createSession(config: Record<string, unknown>): Promise<SdkSessionLike> {
            recorder.sessionConfigs.push(config);
            return Promise.resolve(makeSession('session-created'));
        }
        resumeSession(id: string, config: Record<string, unknown>): Promise<SdkSessionLike> {
            recorder.resumed.push({ id, config });
            return Promise.resolve(makeSession(id));
        }
    }
    const module: SdkModule = {
        CopilotClient: StubClient,
        RuntimeConnection: {
            forStdio(options) {
                recorder.connections.push(options);
                return { kind: 'stdio', ...options };
            },
        },
    };
    return { module, recorder };
}

function sessionConfig(overrides: Partial<CopilotSessionConfig> = {}): CopilotSessionConfig {
    return {
        workingDirectory: '/project',
        trustWorkingDirectory: true,
        onEvent: () => undefined,
        onPermission: () => Promise.resolve({ kind: 'reject' }),
        onUserInput: () => Promise.resolve({ answer: '', wasFreeform: true }),
        onElicitation: () => Promise.resolve({ action: 'decline' }),
        ...overrides,
    };
}

function arrange(environment: Record<string, string | undefined> = { PATH: '/bin', HOME: '/home/dev' }) {
    const { module, recorder } = stubSdk();
    const clock = createFakeRuntimeClock();
    const factory = createSdkClientFactory({
        loadSdk: () => {
            recorder.loads++;
            return Promise.resolve(module);
        },
        environment,
        clock,
    });
    return { factory, recorder, clock };
}

const OPTIONS = { cliPath: '/usr/bin/copilot', workingDirectory: '/project' };

describe('createSdkClientFactory', () => {
    it('AC-005: loads the SDK only when the client starts, not when it is created', async () => {
        const { factory, recorder } = arrange();
        const client = factory(OPTIONS);
        expect(recorder.loads).toBe(0);
        await client.start();
        expect(recorder.loads).toBe(1);
        expect(recorder.constructed).toHaveLength(1);
    });

    it('AC-005: starts the given CLI over stdio, uses the logged-in user and passes no token option', async () => {
        const { factory, recorder } = arrange();
        await factory({ ...OPTIONS, baseDirectory: '/storage/copilot-home' }).start();
        expect(recorder.connections).toEqual([{ path: '/usr/bin/copilot' }]);
        const options = recorder.constructed[0] ?? {};
        expect(options.connection).toEqual({ kind: 'stdio', path: '/usr/bin/copilot' });
        expect(options.useLoggedInUser).toBe(true);
        expect(options.logLevel).toBe('error');
        expect(options.workingDirectory).toBe('/project');
        expect(options.baseDirectory).toBe('/storage/copilot-home');
        expect(options).not.toHaveProperty('gitHubToken');
        expect(Object.keys(options).filter((key) => /token/i.test(key))).toEqual([]);
    });

    it('AC-024: passes no base directory when none is given', async () => {
        const { factory, recorder } = arrange();
        await factory(OPTIONS).start();
        expect(recorder.constructed[0]).not.toHaveProperty('baseDirectory');
    });

    it('AC-005: the runtime environment has no token variable in any case and sets telemetry off, everything else stays', async () => {
        const { factory, recorder } = arrange({
            PATH: '/bin',
            COPILOT_GITHUB_TOKEN: 'a',
            GH_TOKEN: 'b',
            github_token: 'c',
            Gh_Token: 'd',
            GITHUB_TOKEN: 'e',
            COPILOT_TELEMETRY_DISABLED: 'false',
            UNSET: undefined,
        });
        await factory(OPTIONS).start();
        const env = (recorder.constructed[0]?.env ?? {}) as Record<string, string | undefined>;
        expect(env).toEqual({ PATH: '/bin', COPILOT_TELEMETRY_DISABLED: 'true' });
    });

    it('AC-005 AC-006: sessions run in manual mode with streaming, session telemetry off and the working directory trusted for the session on create only', async () => {
        const { factory, recorder } = arrange();
        const client = factory(OPTIONS);
        await client.start();
        await client.createSession(sessionConfig({ model: 'claude-sonnet-5' }));
        const created = recorder.sessionConfigs[0] ?? {};
        expect(created).toMatchObject({
            workingDirectory: '/project',
            model: 'claude-sonnet-5',
            permissionMode: 'manual',
            streaming: true,
            enableSessionTelemetry: false,
            trustWorkingDirectory: 'session',
        });
        expect(created).not.toHaveProperty('gitHubToken');
        await client.resumeSession('session-9', sessionConfig());
        const resumed = recorder.resumed[0];
        expect(resumed?.id).toBe('session-9');
        expect(resumed?.config).toMatchObject({ workingDirectory: '/project', permissionMode: 'manual', streaming: true, enableSessionTelemetry: false });
        expect(resumed?.config).not.toHaveProperty('trustWorkingDirectory');
        expect(resumed?.config).not.toHaveProperty('model');
    });

    it('AC-006: the working directory is trusted only when the caller says the workspace is trusted', async () => {
        const { factory, recorder } = arrange();
        const client = factory(OPTIONS);
        await client.start();
        await client.createSession(sessionConfig({ trustWorkingDirectory: false }));
        expect(recorder.sessionConfigs[0]).not.toHaveProperty('trustWorkingDirectory');
    });

    it('AC-008: no model key on create when none is named', async () => {
        const { factory, recorder } = arrange();
        const client = factory(OPTIONS);
        await client.start();
        await client.createSession(sessionConfig());
        expect(recorder.sessionConfigs[0]).not.toHaveProperty('model');
    });

    it('AC-010: events, permission requests, user input and elicitations reach the callbacks and their answers go back unchanged', async () => {
        const { factory, recorder } = arrange();
        const client = factory(OPTIONS);
        await client.start();
        const seen: CopilotEvent[] = [];
        await client.createSession(
            sessionConfig({
                onEvent: (event) => void seen.push(event),
                onPermission: (request) => Promise.resolve(request.kind === 'write' ? { kind: 'reject', feedback: 'no' } : { kind: 'approve-once' }),
                onUserInput: (request) => Promise.resolve({ answer: `${request.question}!`, wasFreeform: true }),
                onElicitation: () => Promise.resolve({ action: 'accept', content: { name: 'x' } }),
            }),
        );
        const config = recorder.sessionConfigs[0] ?? {};
        (config.onEvent as (event: CopilotEvent) => void)({ type: 'session.idle', id: 'e1', data: {} });
        expect(seen).toEqual([{ type: 'session.idle', id: 'e1', data: {} }]);
        const permission = config.onPermissionRequest as (request: unknown, invocation: unknown) => Promise<unknown>;
        expect(await permission({ kind: 'write' }, { sessionId: 's' })).toEqual({ kind: 'reject', feedback: 'no' });
        expect(await permission({ kind: 'shell' }, { sessionId: 's' })).toEqual({ kind: 'approve-once' });
        const input = config.onUserInputRequest as (request: unknown, invocation: unknown) => Promise<unknown>;
        expect(await input({ question: 'Name?' }, { sessionId: 's' })).toEqual({ answer: 'Name?!', wasFreeform: true });
        const elicitation = config.onElicitationRequest as (context: unknown) => Promise<unknown>;
        expect(await elicitation({ sessionId: 's', message: 'm' })).toEqual({ action: 'accept', content: { name: 'x' } });
    });

    it('AC-010: send, abort and disconnect reach the session; readTodos returns title and status of the rows', async () => {
        const { factory, recorder } = arrange();
        const client = factory(OPTIONS);
        await client.start();
        const session = await client.createSession(sessionConfig());
        expect(session.sessionId).toBe('session-created');
        await session.send('do it');
        await session.abort();
        expect(await session.readTodos()).toEqual([
            { title: 'Write test', status: 'done' },
            { title: 'Write code', status: 'pending' },
        ]);
        await session.disconnect();
        expect(recorder.calls).toEqual(['start', 'send:do it', 'abort', 'disconnect']);
    });

    it('AC-004: status, auth status and the model list come through; models are IDs', async () => {
        const { factory } = arrange();
        const client = factory(OPTIONS);
        await client.start();
        expect(await client.getStatus()).toEqual({ version: '1.0.87', protocolVersion: 3 });
        expect(await client.getAuthStatus()).toEqual({ isAuthenticated: true, authType: 'gh-cli' });
        expect(await client.listModels()).toEqual(['auto', 'claude-sonnet-5']);
    });

    it('AC-020: while a session is open the runtime is pinged every 5 s; before a session and after the last disconnect it is not', async () => {
        const { factory, recorder, clock } = arrange();
        const client = factory(OPTIONS);
        await client.start();
        clock.advance(PING_INTERVAL_MS * 3);
        await flush();
        expect(recorder.calls.filter((call) => call === 'ping')).toHaveLength(0);
        const session = await client.createSession(sessionConfig());
        clock.advance(PING_INTERVAL_MS - 1);
        await flush();
        expect(recorder.calls.filter((call) => call === 'ping')).toHaveLength(0);
        clock.advance(1);
        await flush();
        expect(recorder.calls.filter((call) => call === 'ping')).toHaveLength(1);
        clock.advance(PING_INTERVAL_MS);
        await flush();
        expect(recorder.calls.filter((call) => call === 'ping')).toHaveLength(2);
        await session.disconnect();
        clock.advance(PING_INTERVAL_MS * 4);
        await flush();
        expect(recorder.calls.filter((call) => call === 'ping')).toHaveLength(2);
        expect(clock.pendingTimers()).toBe(0);
    });

    it('AC-020: a failing ping while a session is open is the runtime exit, with the code the SDK names in its text, reported once', async () => {
        const { factory, recorder, clock } = arrange();
        const client = factory(OPTIONS);
        const exits: CopilotRuntimeExit[] = [];
        client.onExit((exit) => void exits.push(exit));
        await client.start();
        await client.createSession(sessionConfig());
        recorder.pingFailure = new Error('CLI server exited unexpectedly with code 3');
        clock.advance(PING_INTERVAL_MS);
        await flush();
        clock.advance(PING_INTERVAL_MS * 3);
        await flush();
        expect(exits).toEqual([{ code: 3, message: 'CLI server exited unexpectedly with code 3' }]);
    });

    it('AC-020: a failing ping whose text names no code is an exit without a code', async () => {
        const { factory, recorder, clock } = arrange();
        const client = factory(OPTIONS);
        const exits: CopilotRuntimeExit[] = [];
        client.onExit((exit) => void exits.push(exit));
        await client.start();
        await client.createSession(sessionConfig());
        recorder.pingFailure = new Error('Connection closed');
        clock.advance(PING_INTERVAL_MS);
        await flush();
        expect(exits).toEqual([{ message: 'Connection closed' }]);
    });

    it.each(['stop', 'forceStop'] as const)('AC-020: after %s a failing ping is silent', async (stopper) => {
        const { factory, recorder, clock } = arrange();
        const client = factory(OPTIONS);
        const exits: CopilotRuntimeExit[] = [];
        client.onExit((exit) => void exits.push(exit));
        await client.start();
        await client.createSession(sessionConfig());
        recorder.pingFailure = new Error('gone');
        await client[stopper]();
        clock.advance(PING_INTERVAL_MS * 3);
        await flush();
        expect(exits).toEqual([]);
        expect(clock.pendingTimers()).toBe(0);
    });

    it('AC-020: a disposed exit listener is not called', async () => {
        const { factory, recorder, clock } = arrange();
        const client = factory(OPTIONS);
        const exits: CopilotRuntimeExit[] = [];
        client.onExit((exit) => void exits.push(exit)).dispose();
        await client.start();
        await client.createSession(sessionConfig());
        recorder.pingFailure = new Error('gone');
        clock.advance(PING_INTERVAL_MS);
        await flush();
        expect(exits).toEqual([]);
    });
});
