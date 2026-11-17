import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createProviderRegistry } from '../../../core/providers/registry';
import { CAPABILITIES } from '../../../core/providers/vocabulary';
import { COPILOT_CAPABILITIES, COPILOT_DISCLOSURE, COPILOT_DISPLAY_NAME, COPILOT_PERMISSION_LABEL } from './copilotProvider';
import { createRecordingSink } from '../fake/testing/recordingSink';
import { recordedRows, toSteps } from './testing/recorded';
import { CLI_PATH, createCopilotWorld, ROOT } from './testing/world';

const RECORDED_SESSION = '1488aad6-283c-422a-9763-3ca334e77457';
const textOnly = () => toSteps(recordedRows('M-03'));

describe('registration (AC-001, AC-023)', () => {
    it('AC-001: registers under the ID copilot with exactly the capability declaration of BR-01', () => {
        const { provider } = createCopilotWorld();
        const registry = createProviderRegistry();
        expect(registry.register(provider)).toEqual({ kind: 'ok' });
        expect(provider.id).toBe('copilot');
        expect(provider.displayName).toBe(COPILOT_DISPLAY_NAME);
        const expected: Record<string, { value: string; experimental?: true }> = {};
        for (const capability of CAPABILITIES) {
            expected[capability] = { value: 'native' };
        }
        Object.assign(expected, {
            fileChanges: { value: 'native', experimental: true },
            typedErrors: { value: 'derived' },
            mcp: { value: 'none' },
            customTools: { value: 'none' },
        });
        expect(provider.capabilities).toEqual(expected);
        expect(registry.list()[0]?.capabilities).toEqual(expected);
        expect(COPILOT_CAPABILITIES).toBe(provider.capabilities);
    });

    it('AC-023: the disclosure and the permission mode are the texts of BR-14 and OP-006 a, byte for byte', () => {
        const { provider } = createCopilotWorld();
        expect(provider.disclosure).toBe(
            'Runs with GitHub Copilot send the prompt, every file the agent reads, command output and your answers to GitHub, and each prompt counts against your Copilot plan.',
        );
        expect(provider.disclosure).toBe(COPILOT_DISCLOSURE);
        expect(provider.permissionModeLabel).toBe('Asks before every tool action (Copilot manual mode)');
        expect(provider.permissionModeLabel).toBe(COPILOT_PERMISSION_LABEL);
        const registry = createProviderRegistry();
        registry.register(provider);
        expect(registry.list()[0]).toMatchObject({ disclosure: COPILOT_DISCLOSURE, permissionModeLabel: COPILOT_PERMISSION_LABEL });
    });
});

describe('start (AC-006, AC-007, AC-008, AC-024)', () => {
    it('AC-006: creates exactly one session in the project root with the trusted working directory, and sends the prompt byte for byte', async () => {
        const prompt = '  # Spec 0007\r\n\r\nImplement “everything”.\t\n\n  ';
        const world = createCopilotWorld({ client: { onSend: textOnly(), sessionId: RECORDED_SESSION } });
        await world.provider.start(world.request({ prompt }), world.sink);
        await world.settle();
        const log = world.scripted.log;
        expect(log.filter((entry) => entry.call === 'createSession')).toEqual([{ call: 'createSession', workingDirectory: ROOT, model: undefined, trustWorkingDirectory: true }]);
        expect(log.filter((entry) => entry.call === 'send')).toEqual([{ call: 'send', prompt }]);
        expect(log.filter((entry) => entry.call === 'resumeSession')).toEqual([]);
        expect(log.find((entry) => entry.call === 'factory')).toEqual({ call: 'factory', options: { cliPath: CLI_PATH, workingDirectory: ROOT, baseDirectory: '/storage/copilot-home' } });
    });

    it('AC-006: the working directory is trusted for the session only when the workspace is trusted', async () => {
        const world = createCopilotWorld({ trusted: false, client: { onSend: textOnly() } });
        await world.provider.start(world.request(), world.sink);
        await world.settle();
        expect(world.scripted.log.find((entry) => entry.call === 'createSession')).toMatchObject({ trustWorkingDirectory: false });
    });

    it('AC-007: the first event is exactly one session.started with the Copilot session ID, even though Copilot\'s own session.start follows; then the recorded run in order', async () => {
        const world = createCopilotWorld({ client: { onSend: textOnly(), sessionId: RECORDED_SESSION } });
        await world.provider.start(world.request(), world.sink);
        await world.settle();
        expect(world.sink.kinds()).toEqual(['session.started', 'turn.started', 'message.delta', 'usage', 'message.completed', 'turn.completed', 'run.completed']);
        expect(world.sink.events[0]?.payload).toEqual({ sessionRef: RECORDED_SESSION });
        expect(world.sink.events.every((event) => event.source === 'provider')).toBe(true);
        expect(world.sink.events.at(-1)?.payload).toEqual({ finalMessage: 'ok' });
    });

    it('AC-007: session.started is delivered before the prompt is sent, and nothing is delivered before the session exists', async () => {
        const world = createCopilotWorld({ client: { onSend: textOnly() } });
        const seen: { kind: string; sends: number; sessions: number }[] = [];
        const sink = createRecordingSink((event) => void seen.push({ kind: event.kind, sends: world.scripted.count('send'), sessions: world.scripted.count('createSession') }));
        await world.provider.start(world.request(), sink);
        expect(seen).toEqual([{ kind: 'session.started', sends: 0, sessions: 1 }]);
        expect(world.scripted.count('send')).toBe(1);
    });

    it('AC-008: a model named in the call is passed to the session; none named passes none', async () => {
        const named = createCopilotWorld({ client: { onSend: textOnly() } });
        await named.provider.start(named.request({ model: 'claude-sonnet-5' }), named.sink);
        expect(named.scripted.log.find((entry) => entry.call === 'createSession')).toMatchObject({ model: 'claude-sonnet-5' });
        const unnamed = createCopilotWorld({ model: 'from-setting', client: { onSend: textOnly() } });
        await unnamed.provider.start(unnamed.request(), unnamed.sink);
        expect(unnamed.scripted.log.find((entry) => entry.call === 'createSession')).toMatchObject({ model: undefined });
    });

    it('AC-008: the model in session.started is only what Copilot named, never the requested one', async () => {
        const world = createCopilotWorld({
            client: {
                sessionId: 'abc',
                models: ['requested-model'],
                onCreate: [{ kind: 'event', event: { type: 'session.start', id: 's1', data: { sessionId: 'abc', selectedModel: 'gpt-named-by-copilot' } } }],
            },
        });
        await world.provider.start(world.request({ model: 'requested-model' }), world.sink);
        await world.settle();
        expect(world.sink.events[0]?.payload).toEqual({ sessionRef: 'abc', model: 'gpt-named-by-copilot' });
        expect(world.sink.events.filter((event) => event.kind === 'session.started')).toHaveLength(1);
        const plain = createCopilotWorld({ client: { sessionId: 'abc', models: ['requested-model'] } });
        await plain.provider.start(plain.request({ model: 'requested-model' }), plain.sink);
        await plain.settle();
        expect(plain.sink.events[0]?.payload).toEqual({ sessionRef: 'abc' });
    });

    it('AC-008: the next start\'s model is the setting\'s value, none when it is empty or blank', () => {
        expect(createCopilotWorld({ model: 'claude-sonnet-5' }).provider.nextStartModel()).toBe('claude-sonnet-5');
        expect(createCopilotWorld({ model: '  gpt-x  ' }).provider.nextStartModel()).toBe('gpt-x');
        expect(createCopilotWorld({ model: '' }).provider.nextStartModel()).toBeUndefined();
        expect(createCopilotWorld({ model: '   ' }).provider.nextStartModel()).toBeUndefined();
    });

    it('AC-008: the model list comes from the runtime, which is started for it and stopped afterwards', async () => {
        const world = createCopilotWorld({ client: { models: ['auto', 'claude-sonnet-5'] } });
        expect(await world.provider.listModels()).toEqual(['auto', 'claude-sonnet-5']);
        expect(world.scripted.log.map((entry) => entry.call)).toEqual(['factory', 'start', 'listModels', 'stop']);
    });

    it('AC-024: the base directory is passed only when it lies outside every workspace folder', async () => {
        const outside = createCopilotWorld({ baseDirectory: '/storage/copilot-home', folders: ['/work/a', '/work/b'], client: { onSend: textOnly() } });
        await outside.provider.start(outside.request(), outside.sink);
        expect(outside.scripted.log.find((entry) => entry.call === 'factory')).toMatchObject({ options: { baseDirectory: '/storage/copilot-home' } });
        const inside = createCopilotWorld({ baseDirectory: '/work/b/.copilot', folders: ['/work/a', '/work/b'], client: { onSend: textOnly() } });
        await inside.provider.start(inside.request(), inside.sink);
        const factory = inside.scripted.log.find((entry) => entry.call === 'factory');
        expect(factory).toBeDefined();
        expect(factory && 'options' in factory ? factory.options : {}).not.toHaveProperty('baseDirectory');
    });

    it('AC-024: with no storage folder available no base directory is passed at all', async () => {
        const world = createCopilotWorld({ baseDirectory: null, client: { onSend: textOnly() } });
        await world.provider.start(world.request(), world.sink);
        const factory = world.scripted.log.find((entry) => entry.call === 'factory');
        expect(factory && 'options' in factory ? factory.options : { baseDirectory: 'present' }).not.toHaveProperty('baseDirectory');
    });

    it('AC-024: no module of the adapter imports a file-system module, so it creates no file anywhere', () => {
        const folder = __dirname;
        for (const name of ['copilotProvider.ts', 'mapping.ts', 'client.ts', 'sdkClient.ts']) {
            const source = readFileSync(path.join(folder, name), 'utf8');
            expect(source).not.toMatch(/from ['"](node:)?fs(\/promises)?['"]/);
        }
    });

    it('AC-006: the runtime is stopped when the run ends, and the session is disconnected first', async () => {
        const world = createCopilotWorld({ client: { onSend: textOnly() } });
        await world.provider.start(world.request(), world.sink);
        await world.settle();
        const calls = world.scripted.log.map((entry) => entry.call).filter((call) => ['disconnect', 'stop', 'forceStop'].includes(call));
        expect(calls).toEqual(['disconnect', 'stop']);
    });

    it('AC-006: credentials are none, Studio holds no token', () => {
        expect(createCopilotWorld().provider.credentialValues()).toEqual([]);
    });

    it('AC-006: dispose stops a runtime that is still open', async () => {
        const world = createCopilotWorld({ client: { onSend: [] } });
        await world.provider.start(world.request(), world.sink);
        world.provider.dispose();
        await world.settle();
        expect(world.scripted.count('forceStop')).toBe(1);
    });
});

describe('resume (AC-019, AC-008)', () => {
    const resumed = () => toSteps(recordedRows('M-05', 's2-resumed'));

    it('AC-019: resumes the given session, never creates one, and sends the continuation text byte for byte', async () => {
        const continuation = 'Continue where you stopped.\r\n  Keep the tests.\n';
        const steps = resumed();
        const world = createCopilotWorld({ client: { onResume: steps.slice(0, 1), onSend: steps.slice(1) } });
        await world.provider.resume({ runId: 'run-2', workingDirectory: ROOT, sessionRef: RECORDED_SESSION, continuationText: continuation }, world.sink);
        await world.settle();
        expect(world.scripted.count('createSession')).toBe(0);
        expect(world.scripted.log.find((entry) => entry.call === 'resumeSession')).toEqual({
            call: 'resumeSession',
            sessionId: RECORDED_SESSION,
            workingDirectory: ROOT,
            model: undefined,
            trustWorkingDirectory: true,
        });
        expect(world.scripted.log.filter((entry) => entry.call === 'send')).toEqual([{ call: 'send', prompt: continuation }]);
        expect(world.scripted.log.find((entry) => entry.call === 'factory')).toMatchObject({ options: { cliPath: CLI_PATH, workingDirectory: ROOT, baseDirectory: '/storage/copilot-home' } });
    });

    it('AC-007 AC-008: session.started comes from session.resume with the session reference and the model Copilot names, before the prompt is sent, exactly once', async () => {
        const steps = resumed();
        const world = createCopilotWorld({ client: { onResume: steps.slice(0, 1), onSend: steps.slice(1) } });
        await world.provider.resume({ runId: 'run-2', workingDirectory: ROOT, sessionRef: RECORDED_SESSION, continuationText: 'go on' }, world.sink);
        await world.settle();
        expect(world.sink.kinds()).toEqual(['session.started', 'turn.started', 'message.delta', 'usage', 'message.completed', 'reasoning', 'turn.completed', 'run.completed']);
        expect(world.sink.events[0]?.payload).toEqual({ sessionRef: RECORDED_SESSION, model: 'claude-sonnet-5' });
    });

    it('AC-008: when Copilot sends no session.resume within 2 s, session.started carries the session reference with no model and the prompt follows', async () => {
        const world = createCopilotWorld({ client: { onSend: [] } });
        const done = world.provider.resume({ runId: 'run-2', workingDirectory: ROOT, sessionRef: 'known-session', continuationText: 'go on' }, world.sink);
        await world.settle();
        expect(world.scripted.count('send')).toBe(0);
        await world.settle(2_000);
        await done;
        expect(world.sink.events.map((event) => event.payload)).toEqual([{ sessionRef: 'known-session' }]);
        expect(world.scripted.count('send')).toBe(1);
    });

    it('AC-019: a model is never passed on resume', async () => {
        const steps = resumed();
        const world = createCopilotWorld({ model: 'from-setting', client: { onResume: steps.slice(0, 1) } });
        await world.provider.resume({ runId: 'run-2', workingDirectory: ROOT, sessionRef: 'known', continuationText: 'x' }, world.sink);
        await world.settle();
        expect(world.scripted.log.find((entry) => entry.call === 'resumeSession')).toMatchObject({ model: undefined });
    });
});
