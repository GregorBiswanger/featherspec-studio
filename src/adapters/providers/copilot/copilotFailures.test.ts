import { describe, expect, it } from 'vitest';
import type { DeliveredEvent } from '../../../core/ports/agentProvider';
import { INSTALL_URL, MIN_CLI_VERSION } from './cliLocator';
import type { CopilotEvent } from './client';
import { recordedRows, syntheticRows, toSteps } from './testing/recorded';
import { CLI_PATH, createCopilotWorld, ROOT, type CopilotWorldOptions } from './testing/world';

const SIGN_IN = 'Run `copilot` in a terminal and sign in, then retry.';
const PROTOCOL_MISMATCH = 'SDK protocol version mismatch: SDK supports versions 3-3, but server reports version 4. Please update your SDK or server to ensure compatibility.';
const textOnly = () => toSteps(recordedRows('M-03'));
const callsOf = (world: ReturnType<typeof createCopilotWorld>): string[] => world.scripted.log.map((entry) => entry.call);

describe('availability (AC-002, AC-003, AC-004, AC-020)', () => {
    it('AC-002: no CLI found is not installed with the locator\'s hint, and no runtime is started', async () => {
        const world = createCopilotWorld({ location: { kind: 'not-installed', hint: `Not found. Install it (${INSTALL_URL}).` } });
        const report = await world.provider.checkAvailability();
        expect(report).toEqual({ result: 'not-installed', hint: `Not found. Install it (${INSTALL_URL}).` });
        expect(callsOf(world)).toEqual([]);
    });

    it('AC-003: a CLI whose version cannot be read is unknown with that reason', async () => {
        const world = createCopilotWorld({ location: { kind: 'unknown', reason: 'The version of /x could not be read: no output' } });
        expect(await world.provider.checkAvailability()).toEqual({ result: 'unknown', hint: 'The version of /x could not be read: no output' });
    });

    it('AC-004: a signed-in runtime is available; the runtime is started, asked and stopped', async () => {
        const world = createCopilotWorld();
        expect(await world.provider.checkAvailability()).toEqual({ result: 'available' });
        expect(callsOf(world)).toEqual(['factory', 'start', 'getAuthStatus', 'stop']);
    });

    it('AC-004: not authenticated is not signed in with the sign-in hint, and the runtime is stopped', async () => {
        const world = createCopilotWorld({ client: { auth: { isAuthenticated: false } } });
        expect(await world.provider.checkAvailability()).toEqual({ result: 'not-signed-in', hint: SIGN_IN });
        expect(callsOf(world).at(-1)).toBe('stop');
    });

    it('AC-003: a protocol Copilot and the SDK do not share is unknown, naming both versions, and the runtime is stopped', async () => {
        const world = createCopilotWorld({ client: { startError: new Error(PROTOCOL_MISMATCH) } });
        const report = await world.provider.checkAvailability();
        expect(report.result).toBe('unknown');
        expect(report.hint).toContain('3-3');
        expect(report.hint).toContain('version 4');
        expect(report.hint).toContain('1.0.87');
        expect(callsOf(world).at(-1)).toBe('stop');
    });

    it('AC-002: a CLI that cannot be spawned is not installed; any other start failure is unknown with Copilot\'s message', async () => {
        const spawn = createCopilotWorld({ client: { startError: new Error('spawn /usr/local/bin/copilot EACCES') } });
        const refused = await spawn.provider.checkAvailability();
        expect(refused.result).toBe('not-installed');
        expect(refused.hint).toContain('EACCES');
        expect(refused.hint).toContain(INSTALL_URL);
        const other = createCopilotWorld({ client: { startError: new Error('CLI server connection closed during startup') } });
        expect(await other.provider.checkAvailability()).toEqual({ result: 'unknown', hint: 'CLI server connection closed during startup' });
    });

    it('AC-004: a runtime whose auth status cannot be read is unknown with Copilot\'s message, and is stopped', async () => {
        const world = createCopilotWorld({ client: { authError: new Error('auth.getStatus failed') } });
        expect(await world.provider.checkAvailability()).toEqual({ result: 'unknown', hint: 'auth.getStatus failed' });
        expect(callsOf(world).at(-1)).toBe('stop');
    });
});

describe('failures before a session exists (AC-004, AC-009, AC-018, AC-021)', () => {
    async function failing(options: CopilotWorldOptions, request: { model?: string } = {}) {
        const world = createCopilotWorld({ ...options, client: { onSend: textOnly(), ...options.client } });
        await world.provider.start(world.request(request), world.sink);
        await world.settle();
        return world;
    }
    const failedPayload = (world: ReturnType<typeof createCopilotWorld>) => world.sink.events.at(0)?.payload as { category: string; providerMessage?: string; hint?: string };
    const noSessionStarted = (world: ReturnType<typeof createCopilotWorld>) => {
        expect(world.sink.kinds()).toEqual(['run.failed']);
        expect(world.scripted.count('send')).toBe(0);
        expect(world.scripted.count('disconnect')).toBe(0);
        expect(world.sink.events[0]?.source).toBe('provider');
    };
    const noSession = (world: ReturnType<typeof createCopilotWorld>) => {
        noSessionStarted(world);
        expect(world.scripted.count('createSession')).toBe(0);
        expect(world.scripted.count('resumeSession')).toBe(0);
    };

    it('AC-002: no runtime found is run.failed runtime_missing with the install hint, no client at all', async () => {
        const world = await failing({ location: { kind: 'not-installed', hint: `Install it: ${INSTALL_URL}` } });
        noSession(world);
        expect(failedPayload(world)).toMatchObject({ category: 'runtime_missing', hint: `Install it: ${INSTALL_URL}` });
        expect(callsOf(world)).toEqual([]);
    });

    it('AC-003: an unreadable version is run.failed runtime_missing with that reason', async () => {
        const world = await failing({ location: { kind: 'unknown', reason: 'no version' } });
        noSession(world);
        expect(failedPayload(world)).toMatchObject({ category: 'runtime_missing', hint: 'no version' });
    });

    it('AC-004: a runtime that cannot be started is runtime_missing with Copilot\'s message, and is stopped', async () => {
        const world = await failing({ client: { startError: new Error('spawn EACCES') } });
        noSession(world);
        expect(failedPayload(world)).toMatchObject({ category: 'runtime_missing', providerMessage: 'spawn EACCES' });
        expect(callsOf(world).at(-1)).toBe('stop');
    });

    it('BR-12 §9: a runtime that cannot be started in a run carries the hint of §9, the found and required version and the install link', async () => {
        const world = await failing({ location: { kind: 'found', path: CLI_PATH, version: '1.0.90' }, client: { startError: new Error('spawn EACCES') } });
        const payload = failedPayload(world);
        expect(payload.category).toBe('runtime_missing');
        expect(payload.hint).toContain('1.0.90');
        expect(payload.hint).toContain(MIN_CLI_VERSION);
        expect(payload.hint).toContain(INSTALL_URL);
        expect(payload.hint).toContain(CLI_PATH);
    });

    it('BR-12 OP-008: an installed CLI whose protocol the SDK does not share fails the run as unknown naming both versions, no session, runtime stopped', async () => {
        const world = await failing({ client: { startError: new Error(PROTOCOL_MISMATCH) } });
        noSession(world);
        const payload = failedPayload(world);
        expect(payload).toMatchObject({ category: 'unknown', providerMessage: PROTOCOL_MISMATCH });
        expect(payload.hint).toContain('1.0.87');
        expect(payload.hint).toContain('3-3');
        expect(payload.hint).toContain('version 4');
        expect(callsOf(world).at(-1)).toBe('stop');
    });

    it('AC-004: not signed in is run.failed auth with the sign-in hint, no session, no prompt, runtime stopped', async () => {
        const world = await failing({ client: { auth: { isAuthenticated: false } } });
        noSession(world);
        expect(failedPayload(world)).toMatchObject({ category: 'auth', hint: SIGN_IN });
        expect(callsOf(world)).toEqual(['factory', 'start', 'getAuthStatus', 'stop']);
    });

    it('AC-009: a model Copilot does not list is run.failed model_unavailable naming the model and the offered ones, with the hint of §9', async () => {
        const world = await failing({ client: { models: ['auto', 'claude-sonnet-5'] } }, { model: 'gpt-nope' });
        noSession(world);
        const payload = failedPayload(world);
        expect(payload.category).toBe('model_unavailable');
        expect(payload.providerMessage).toContain('gpt-nope');
        expect(payload.hint).toBe('The model "gpt-nope" is not available. Offered models: auto, claude-sonnet-5. Change the setting featherspec-studio.copilot.model.');
        expect(callsOf(world)).toEqual(['factory', 'start', 'getAuthStatus', 'listModels', 'stop']);
    });

    it('AC-009: a listed model passes the check; no model named means no list is asked for', async () => {
        const listed = await failing({ client: { models: ['auto', 'claude-sonnet-5'], sessionId: 's' } }, { model: 'claude-sonnet-5' });
        expect(listed.sink.kinds()[0]).toBe('session.started');
        expect(listed.scripted.count('listModels')).toBe(1);
        const none = await failing({ client: { sessionId: 's' } });
        expect(none.scripted.count('listModels')).toBe(0);
    });

    it('AC-004 BR-12: the checks run in the order runtime, sign-in, model', async () => {
        const signedOut = await failing({ client: { auth: { isAuthenticated: false }, models: [] } }, { model: 'gpt-nope' });
        expect(failedPayload(signedOut).category).toBe('auth');
        expect(signedOut.scripted.count('listModels')).toBe(0);
        const missing = await failing({ location: { kind: 'not-installed', hint: 'h' }, client: { auth: { isAuthenticated: false } } }, { model: 'gpt-nope' });
        expect(failedPayload(missing).category).toBe('runtime_missing');
        expect(missing.scripted.count('getAuthStatus')).toBe(0);
    });

    it('AC-021: a session Copilot no longer knows is run.failed unknown with Copilot\'s message, no session, no prompt, runtime stopped', async () => {
        const world = createCopilotWorld({ client: { resumeError: new Error('Session not found: gone-session') } });
        await world.provider.resume({ runId: 'run-2', workingDirectory: ROOT, sessionRef: 'gone-session', continuationText: 'go on' }, world.sink);
        await world.settle();
        noSessionStarted(world);
        expect(world.scripted.count('createSession')).toBe(0);
        expect(failedPayload(world)).toMatchObject({ category: 'unknown', providerMessage: 'Session not found: gone-session' });
        expect(callsOf(world).at(-1)).toBe('stop');
    });

    it('AC-004: a resume checks runtime and sign-in like a start, and never asks for a model', async () => {
        const signedOut = createCopilotWorld({ client: { auth: { isAuthenticated: false } } });
        await signedOut.provider.resume({ runId: 'run-2', workingDirectory: ROOT, sessionRef: 's', continuationText: 'x' }, signedOut.sink);
        await signedOut.settle();
        noSession(signedOut);
        expect(failedPayload(signedOut)).toMatchObject({ category: 'auth', hint: SIGN_IN });
        const missing = createCopilotWorld({ location: { kind: 'not-installed', hint: 'h' } });
        await missing.provider.resume({ runId: 'run-2', workingDirectory: ROOT, sessionRef: 's', continuationText: 'x' }, missing.sink);
        await missing.settle();
        expect(failedPayload(missing).category).toBe('runtime_missing');
        const fine = createCopilotWorld({ client: { onResume: [] } });
        void fine.provider.resume({ runId: 'run-2', workingDirectory: ROOT, sessionRef: 's', continuationText: 'x' }, fine.sink);
        await fine.settle(2_000);
        expect(fine.scripted.count('listModels')).toBe(0);
    });

    it('AC-018: a session that cannot be created is run.failed unknown with Copilot\'s message, never cancelled or tool_failure', async () => {
        const world = await failing({ client: { createError: new Error('createSession blew up') } });
        noSessionStarted(world);
        expect(failedPayload(world)).toMatchObject({ category: 'unknown', providerMessage: 'createSession blew up' });
        expect(callsOf(world).at(-1)).toBe('stop');
    });
});

describe('errors during a run (AC-018)', () => {
    const errorAfterStart = (data: Record<string, unknown>): CopilotEvent[] => [
        { type: 'assistant.turn_start', id: 't', data: {} },
        { type: 'session.error', id: 'e', data },
    ];

    it('AC-018: session.error ends the run as run.failed with the category and hint of §7 and §9, after session.started, and stops the runtime', async () => {
        const world = createCopilotWorld({ client: { sessionId: 's', onSend: errorAfterStart({ errorType: 'rate_limit', message: 'slow down', statusCode: 429 }).map((event) => ({ kind: 'event', event }) as const) } });
        await world.provider.start(world.request(), world.sink);
        await world.settle();
        expect(world.sink.kinds()).toEqual(['session.started', 'turn.started', 'run.failed']);
        expect(world.sink.events[2]).toMatchObject({
            source: 'provider',
            payload: { category: 'quota_or_rate_limit', providerMessage: 'slow down', hint: 'Your Copilot allowance or rate limit is reached; retry later.' },
        });
        expect(callsOf(world).slice(-2)).toEqual(['disconnect', 'stop']);
    });

    it('AC-018: an error §7 does not map is category unknown with Copilot\'s message; no category is cancelled or tool_failure', async () => {
        for (const errorType of ['query', 'mystery', 'context_limit', undefined]) {
            const world = createCopilotWorld({ client: { onSend: errorAfterStart({ errorType, message: 'odd' }).map((event) => ({ kind: 'event', event }) as const) } });
            await world.provider.start(world.request(), world.sink);
            await world.settle();
            const failed = world.sink.events.find((event) => event.kind === 'run.failed');
            expect(failed?.payload).toMatchObject({ category: 'unknown', providerMessage: 'odd' });
        }
    });

    it('AC-018: the synthetic rate-limit error of the fixture ends the run the same way', async () => {
        const world = createCopilotWorld({ client: { onSend: toSteps(syntheticRows('S-error')) } });
        await world.provider.start(world.request(), world.sink);
        await world.settle();
        expect(world.sink.events.at(-1)).toMatchObject({ kind: 'run.failed', payload: { category: 'quota_or_rate_limit' } });
    });

    it('AC-018: a prompt that cannot be sent is run.failed unknown with Copilot\'s message after session.started, and the runtime is stopped', async () => {
        const world = createCopilotWorld({ client: { sessionId: 's', sendError: new Error('send failed') } });
        await world.provider.start(world.request(), world.sink);
        await world.settle();
        expect(world.sink.kinds()).toEqual(['session.started', 'run.failed']);
        expect(world.sink.events[1]).toMatchObject({ source: 'provider', payload: { category: 'unknown', providerMessage: 'send failed' } });
        expect(callsOf(world).slice(-2)).toEqual(['disconnect', 'stop']);
    });
});

describe('runtime exit (AC-020)', () => {
    const open = async (options: CopilotWorldOptions = {}) => {
        const world = createCopilotWorld({ client: { sessionId: 's', onSend: [], ...options.client }, ...options });
        await world.provider.start(world.request(), world.sink);
        await world.settle();
        return world;
    };

    it('AC-020: an exit while the run has no end kind is a derived run.failed unknown with the message of §7 and the exit code', async () => {
        const world = await open();
        world.scripted.exit({ code: 3, message: 'CLI server exited unexpectedly with code 3' });
        await world.settle();
        expect(world.sink.kinds()).toEqual(['session.started', 'run.failed']);
        expect(world.sink.events[1]).toMatchObject({ source: 'derived', payload: { category: 'unknown', providerMessage: 'Copilot runtime stopped unexpectedly (exit code 3)' } });
    });

    it('AC-020: without a known code the message has none; a second exit adds nothing', async () => {
        const world = await open();
        world.scripted.exit({ message: 'Connection closed' });
        world.scripted.exit({ code: 1, message: 'again' });
        await world.settle();
        expect(world.sink.events.filter((event) => event.kind === 'run.failed').map((event) => event.payload)).toEqual([{ category: 'unknown', providerMessage: 'Copilot runtime stopped unexpectedly' }]);
    });

    it('AC-020: after an end kind an exit adds nothing', async () => {
        const world = createCopilotWorld({ client: { onSend: textOnly() } });
        await world.provider.start(world.request(), world.sink);
        await world.settle();
        const before = world.sink.events.length;
        world.scripted.exit({ code: 0, message: 'stopped' });
        await world.settle();
        expect(world.sink.events).toHaveLength(before);
    });

    it('AC-020: the only derived run.failed is the exit one; every other failure of this spec carries source provider', async () => {
        const world = await open();
        world.scripted.exit({ code: 2, message: 'x' });
        await world.settle();
        const derived = world.sink.events.filter((event: DeliveredEvent) => event.kind === 'run.failed' && event.source === 'derived');
        expect(derived).toHaveLength(1);
        const signedOut = createCopilotWorld({ client: { auth: { isAuthenticated: false } } });
        await signedOut.provider.start(signedOut.request(), signedOut.sink);
        await signedOut.settle();
        expect(signedOut.sink.events.map((event) => event.source)).toEqual(['provider']);
    });
});
