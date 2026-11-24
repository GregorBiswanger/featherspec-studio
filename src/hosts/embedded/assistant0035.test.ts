import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createAssistantWiring, type AssistantWiring } from '../../core/assistant/wiring';
import { ASSISTANTS } from '../../core/assistant/assistants';
import type { Offer } from '../../core/assistant/offer';
import { offerOf } from '../../core/assistant/offer';
import { plainSendViewOf } from '../../core/assistant/sendView';
import { welcomeOf } from '../../core/assistant/welcome';
import { CASE_WORLDS, caseModel } from '../../core/assistant/testing/caseWorlds';
import { buildDetail } from '../../core/board/detail';
import { createFakeSource, modelOf } from '../../core/board/testing/boardWorld';
import { projectNow } from '../../core/overview/rows';
import type { SettingPort } from '../../core/ports/host';
import { parseStepTipSettings } from '../../core/settings/stepTipSettings';
import { createSetupClock } from '../../core/setup/testing/setupClock';
import { createMemorySpecSource } from '../../core/specs/testing/memorySpecSource';
import type { SendOutcomeView } from '../../shared/protocol/assistant';
import { STEP_GUIDES, type StepCase } from '../../shared/protocol/nextStepTexts';
import { createMessageRouter } from '../../core/shell/messageRouter';
import { PROTOCOL_VERSION } from '../../shared/protocol/envelope';
import { createBridge } from './bridge';
import type { CoreConfig, NativeHost } from './contract';
import { createJetBrainsAssistants, JETBRAINS_SEND_TARGETS } from './assistants';
import { createMirrors } from './mirrors';
import { CLAUDE_NOT_INSTALLED_CAUSE, CLAUDE_NOT_INSTALLED_TEXT, CLAUDE_NOT_READY_NOW_CAUSE, CLAUDE_UNTRUSTED_CAUSE, CLAUDE_UNTRUSTED_TEXT, CLAUDE_WAITING_TEXT } from '../../shared/protocol/assistantTexts';
import { createEmbeddedPorts } from './ports';

const TERMINAL = 'org.jetbrains.plugins.terminal';
const CLAUDE_CLI = 'cli:claude';
const LINE = '/sdd-plan .specs/active/0001-tip-splitter.md';
const SPEC = '.specs/active/0001-tip-splitter.md';
const PLAN = '.specs/active/0001-tip-splitter.plan.md';

function config(plugins: readonly string[]): CoreConfig {
    return { host: 'jetbrains', platform: 'linux', studioVersion: '1.0.0', settings: {}, trusted: true, folders: [], memory: {}, plugins };
}

interface Rig {
    wiring: AssistantWiring;
    frames: Array<Record<string, unknown>>;
    mirrors: ReturnType<typeof createMirrors>;
    written: string[];
    blocks: string[][];
    warned: string[];
    clock: ReturnType<typeof createSetupClock>;
    stored: { value: unknown };
    answers: Map<string, (args: unknown) => { ok: unknown } | { error: string } | 'never'>;
}

function rig(plugins: readonly string[], stored: unknown = 'none', failClipboard = false): Rig {
    const frames: Array<Record<string, unknown>> = [];
    const answers: Rig['answers'] = new Map();
    let bridge: ReturnType<typeof createBridge>;
    const native: NativeHost = {
        send(frame) {
            const parsed = JSON.parse(frame) as Record<string, unknown>;
            const calls = parsed.k === 'calls' ? (parsed.calls as Array<Record<string, unknown>>) : parsed.k === 'call' ? [parsed] : [];
            for (const call of calls) {
                frames.push({ k: 'call', ...call });
                const answer = answers.get(String(call.name))?.(call.args);
                if (answer !== undefined && answer !== 'never') {
                    bridge.resolve(String(call.id), JSON.stringify(answer));
                }
            }
        },
    };
    bridge = createBridge(native);
    const cfg = config(plugins);
    const mirrors = createMirrors(cfg);
    const ports = createEmbeddedPorts(bridge, mirrors, cfg);
    const state = { value: stored };
    const listeners = new Set<() => void>();
    const setting: SettingPort = { read: () => state.value, onDidChange: (listener) => (listeners.add(listener), { dispose: () => void listeners.delete(listener) }) };
    const written: string[] = [];
    const blocks: string[][] = [];
    const warned: string[] = [];
    const clock = createSetupClock();
    const wiring = createAssistantWiring({
        setting,
        host: ports.assistantHost,
        ...(ports.assistantTable === undefined ? {} : { table: ports.assistantTable }),
        clipboard: { writeText: async (text) => (failClipboard ? Promise.reject(new Error('no clipboard')) : void written.push(text)) },
        ui: { warn: (text) => void warned.push(text) },
        output: { appendBlock: (lines) => void blocks.push([...lines]) },
        clock,
        platform: 'linux',
        source: createFakeSource(),
        specs: createMemorySpecSource(),
    });
    return { wiring, frames, mirrors, written, blocks, warned, clock, stored: state, answers };
}

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('0035 T-007 / AC-011, AC-013 (core part): Send to Claude Code through the host', () => {
    const table = createJetBrainsAssistants();

    it('AC-011 the row: Terminal presence, targets current and new, the 20000 ms budget, attaching', () => {
        const row = table.claudeCode!;
        expect(row.extensionId).toBe(CLAUDE_CLI);
        expect(row.handover).toBe('send');
        expect(row.targets).toEqual(['current', 'new']);
        expect(row.timeoutMs).toBe(20000);
        expect(row.attachesSpec).toBe(true);
    });

    it('AC-009, AC-011 the call carries the target and the text of §6.2 with one @ mention per path, in order', () => {
        const calls = table.claudeCode!.callsFor('current', LINE, [{ uri: undefined, path: SPEC }, { uri: undefined, path: PLAN }]);
        expect(calls).toEqual([{ command: 'featherspec.terminal', args: [{ assistant: 'claudeCode', target: 'current', text: `${LINE} @${SPEC} @${PLAN}` }] }]);
        expect(table.claudeCode!.callsFor('new', LINE)).toEqual([{ command: 'featherspec.terminal', args: [{ assistant: 'claudeCode', target: 'new', text: LINE }] }]);
    });

    it('AC-009 a path that contains whitespace is left out of the text', () => {
        const calls = table.claudeCode!.callsFor('new', LINE, [{ uri: undefined, path: '.specs/active/0002 odd.md' }, { uri: undefined, path: PLAN }]);
        expect(calls[0]?.args).toEqual([{ assistant: 'claudeCode', target: 'new', text: `${LINE} @${PLAN}` }]);
    });

    it('AC-011 the main part types through assistant.terminal and reports Opened; the clipboard stays unchanged', async () => {
        const world = rig([TERMINAL, CLAUDE_CLI], 'claudeCode');
        world.answers.set('assistant.terminal', () => ({ ok: 'typed' }));
        const result = await world.wiring.send.send({ assistant: 'claudeCode', target: 'current', line: LINE });
        expect(result).toEqual<SendOutcomeView>({ outcome: 'opened', text: "The prompt is in Claude Code's chat. Check it, then send it there." });
        expect(world.frames.filter((frame) => frame.k === 'call').map((frame) => [frame.name, frame.args])).toEqual([['assistant.terminal', { assistant: 'claudeCode', target: 'current', text: LINE }]]);
        expect(world.written).toEqual([]);
        expect(world.warned).toEqual([]);
    });

    it('AC-013 the Terminal plugin gone before the call: the line is copied, the cause is the Terminal text, no call is made', async () => {
        const world = rig([], 'claudeCode');
        const result = await world.wiring.send.send({ assistant: 'claudeCode', target: 'current', line: LINE });
        expect(result.outcome).toBe('copied');
        expect(world.written).toEqual([LINE]);
        expect(world.blocks).toEqual([['Send to Claude Code failed (the Terminal plugin is not available); the prompt was copied instead.']]);
        expect(world.frames).toEqual([]);
    });

    it('AC-013 a failing terminal call: the cause is terminal call failed with the host message', async () => {
        const world = rig([TERMINAL, CLAUDE_CLI], 'claudeCode');
        world.answers.set('assistant.terminal', () => ({ error: 'the tab closed' }));
        const result = await world.wiring.send.send({ assistant: 'claudeCode', target: 'new', line: LINE });
        expect(result.outcome).toBe('copied');
        expect(world.blocks).toEqual([['Send to Claude Code failed (terminal call failed: the tab closed); the prompt was copied instead.']]);
    });

    it('AC-013 the host reports that Claude Code was not ready: that is the cause, as written in §7', async () => {
        const world = rig([TERMINAL, CLAUDE_CLI], 'claudeCode');
        world.answers.set('assistant.terminal', () => ({ error: 'Claude Code was not ready within 15000 ms' }));
        await world.wiring.send.send({ assistant: 'claudeCode', target: 'new', line: LINE });
        expect(world.blocks).toEqual([['Send to Claude Code failed (Claude Code was not ready within 15000 ms); the prompt was copied instead.']]);
    });

    it('AC-013 a call that never answers falls back after 20000 ms, not after 5000, and says so', async () => {
        const world = rig([TERMINAL, CLAUDE_CLI], 'claudeCode');
        world.answers.set('assistant.terminal', () => 'never');
        let result: SendOutcomeView | undefined;
        void world.wiring.send.send({ assistant: 'claudeCode', target: 'current', line: LINE }).then((value) => (result = value));
        await settle();
        world.clock.advance(19999);
        await settle();
        expect(result).toBeUndefined();
        world.clock.advance(1);
        await settle();
        expect(result?.outcome).toBe('copied');
        expect(world.blocks).toEqual([['Send to Claude Code failed (no result within 20000 ms); the prompt was copied instead.']]);
    });

    it('AC-013 (late result) nothing is typed again after the fallback: one call only', async () => {
        const world = rig([TERMINAL, CLAUDE_CLI], 'claudeCode');
        world.answers.set('assistant.terminal', () => 'never');
        void world.wiring.send.send({ assistant: 'claudeCode', target: 'current', line: LINE });
        await settle();
        world.clock.advance(20000);
        await settle();
        expect(world.frames.filter((frame) => frame.k === 'call')).toHaveLength(1);
    });
});

describe('0035 amendment 2026-11-23 / AC-032: Claude Code waits for an answer in the terminal', () => {
    const WAITING = 'Claude Code is waiting for you in the terminal. Answer it there, then send again. The prompt is copied.';
    const GENERAL = "Could not open Claude Code's chat. The prompt is copied: paste it there with Ctrl+V.";

    it('AC-032 the text of section 7 is literal', () => {
        expect(CLAUDE_WAITING_TEXT).toBe(WAITING);
        expect(CLAUDE_NOT_READY_NOW_CAUSE).toBe('Claude Code was not ready for input');
    });

    for (const [place, message, cause] of [
        ['a new tab, not ready within 15000 ms', 'Claude Code was not ready within 15000 ms', 'Claude Code was not ready within 15000 ms'],
        ['an existing tab, not ready now', 'Claude Code was not ready for input', 'Claude Code was not ready for input'],
    ] as const) {
        it(`AC-032 ${place}: the prompt is copied, the one warning is the waiting text, the control shows it, the log names the cause`, async () => {
            const world = rig([TERMINAL, CLAUDE_CLI], 'claudeCode');
            world.answers.set('assistant.terminal', () => ({ error: message }));
            const result = await world.wiring.send.send({ assistant: 'claudeCode', target: 'current', line: LINE });
            expect(result).toEqual<SendOutcomeView>({ outcome: 'copied', text: WAITING });
            expect(world.written).toEqual([LINE]);
            expect(world.warned).toEqual([WAITING]);
            expect(world.blocks).toEqual([[`Send to Claude Code failed (${cause}); the prompt was copied instead.`]]);
            expect(JSON.stringify(world.blocks)).not.toContain(LINE);
        });
    }

    it('AC-032 every other failure keeps the general warning: a failing call, the Terminal plugin gone, no result in time', async () => {
        const failing = rig([TERMINAL, CLAUDE_CLI], 'claudeCode');
        failing.answers.set('assistant.terminal', () => ({ error: 'the tab closed' }));
        await failing.wiring.send.send({ assistant: 'claudeCode', target: 'new', line: LINE });
        expect(failing.warned).toEqual([GENERAL]);
        const gone = rig([], 'claudeCode');
        await gone.wiring.send.send({ assistant: 'claudeCode', target: 'new', line: LINE });
        expect(gone.warned).toEqual([GENERAL]);
        const silent = rig([TERMINAL, CLAUDE_CLI], 'claudeCode');
        silent.answers.set('assistant.terminal', () => 'never');
        void silent.wiring.send.send({ assistant: 'claudeCode', target: 'current', line: LINE });
        await settle();
        silent.clock.advance(20000);
        await settle();
        expect(silent.warned).toEqual([GENERAL]);
    });

    it('AC-032 a prompt that could not be copied is not announced as copied: the general warning, outcome copyFailed', async () => {
        const world = rig([TERMINAL, CLAUDE_CLI], 'claudeCode', true);
        world.answers.set('assistant.terminal', () => ({ error: 'Claude Code was not ready for input' }));
        const result = await world.wiring.send.send({ assistant: 'claudeCode', target: 'current', line: LINE });
        expect(result.outcome).toBe('copyFailed');
        expect(result.text).not.toBe(WAITING);
        expect(world.warned).toEqual(["Could not open Claude Code's chat, and the prompt could not be copied."]);
    });

    it('AC-032 the markers of the host are told apart in one place: both not-ready causes are waiting, nothing else is', () => {
        const row = createJetBrainsAssistants().claudeCode!;
        expect(row.causes?.notice?.('Claude Code was not ready within 15000 ms')).toBe(WAITING);
        expect(row.causes?.notice?.('Claude Code was not ready for input')).toBe(WAITING);
        for (const other of ['the tab closed', 'the terminal has no shell integration', 'Claude Code was not ready within 5000 ms', 'a Send to Claude Code is still starting', '']) {
            expect(row.causes?.notice?.(other), other).toBeUndefined();
        }
        expect(row.causes?.failed('Claude Code was not ready for input')).toBe('Claude Code was not ready for input');
    });
});

const SHOW = parseStepTipSettings(true, {});
const NO_HISTORY = { available: true, entries: [], label: '' } as never;
const CASES = Object.keys(STEP_GUIDES) as StepCase[];
const VS_CODE_OFFER: Offer = { assistant: 'claudeCode' };

function jetBrainsOffer(assistant: 'copilot' | 'claudeCode' | 'junie'): Offer {
    const offer = rig([TERMINAL, 'cli:junie', CLAUDE_CLI, 'cli:copilot'], assistant).wiring.offer.read();
    if (offer === undefined) {
        throw new Error('no offer');
    }
    return offer;
}

const NOW_SPECS = { forEntry: (entry: { key: string }) => ({ key: entry.key }) } as never;

describe('0035 T-007 / AC-006, AC-009: the JetBrains host has a step action exactly where the VS Code host has Send, with the same files', () => {
    for (const stepCase of CASES) {
        it(`AC-006 ${stepCase}: the detail and the first Now row, for each assistant`, async () => {
            const { key } = CASE_WORLDS[stepCase];
            const model = await caseModel(stepCase, '1.11.0');
            const entry = model.lifecycle.entries.find((candidate) => candidate.key === key)!;
            const detailOf = (offer: Offer) => {
                const view = buildDetail({ selection: { stem: entry.stem, path: key }, model, history: NO_HISTORY, tips: SHOW, offer });
                return view.kind === 'spec' && 'lines' in view.nextStep ? view.nextStep.send : undefined;
            };
            const rowOf = (offer: Offer) => projectNow(model, NOW_SPECS, SHOW, offer).rows[0]?.send;
            const reference = [detailOf(VS_CODE_OFFER), rowOf(VS_CODE_OFFER)];
            for (const assistant of ['copilot', 'claudeCode', 'junie'] as const) {
                const offer = jetBrainsOffer(assistant);
                const own = [detailOf(offer), rowOf(offer)];
                expect(own.map((view) => view !== undefined), assistant).toEqual(reference.map((view) => view !== undefined));
                own.forEach((view, index) => {
                    expect(view?.attach, `${assistant} ${index}`).toEqual(reference[index]?.attach);
                    expect(view?.attachAlso, `${assistant} ${index}`).toEqual(reference[index]?.attachAlso);
                });
            }
        });
    }

    it('AC-006 setup not run: the welcome carries the step action of each assistant, as in VS Code', async () => {
        const base = await modelOf({});
        const model = { ...base, project: { ...base.project, setupRun: 'not run' as const } };
        expect(welcomeOf(model, VS_CODE_OFFER)?.send).toBeDefined();
        for (const assistant of ['copilot', 'claudeCode', 'junie'] as const) {
            const send = welcomeOf(model, jetBrainsOffer(assistant))?.send;
            expect(send?.assistant).toBe(assistant);
            expect(send?.attach).toBeUndefined();
        }
        expect(welcomeOf(model, undefined)?.send).toBeUndefined();
    });

    it('AC-006 no webview message names a command, a terminal or a tool window', async () => {
        const source = await fs.readFile(path.resolve(process.cwd(), 'src', 'shared', 'protocol', 'messages.ts'), 'utf8');
        expect(source).not.toMatch(/command|terminal|toolWindow|tool window/i);
        expect('type Open = { command: string };').toMatch(/command/i);
    });
});

describe('0035 T-007 / AC-011, AC-023: the JetBrains router takes the current chat for Claude Code; the shared guard stays strict', () => {
    const request = { v: PROTOCOL_VERSION, kind: 'req', id: 'r1', type: 'sendPrompt', payload: { assistant: 'claudeCode', target: 'current', line: LINE, token: 'a-1' } };

    function router(withTargets: boolean) {
        const handled: unknown[] = [];
        const lines: string[][] = [];
        const instance = createMessageRouter({
            handlers: new Proxy({}, { get: (_target, type) => async (payload: unknown) => void (type === 'sendPrompt' && handled.push(payload)) }) as never,
            output: { appendBlock: (block) => void lines.push([...block]) },
            post: () => undefined,
            ...(withTargets ? { sendTargets: JETBRAINS_SEND_TARGETS } : {}),
        });
        return { instance, handled, lines };
    }

    it('AC-011 with the JetBrains targets the request reaches the handler', async () => {
        const { instance, handled } = router(true);
        await instance.receive(request);
        expect(handled).toEqual([request.payload]);
    });

    it('AC-005 (protocol) without them, as in VS Code, current for Claude Code is ignored', async () => {
        const { instance, handled, lines } = router(false);
        await instance.receive(request);
        expect(handled).toEqual([]);
        expect(lines).toHaveLength(1);
    });

    it('AC-023 an unknown assistant, a target of no list and an extra key stay refused with the JetBrains targets', async () => {
        const { instance, handled } = router(true);
        for (const payload of [{ ...request.payload, assistant: 'codex' }, { ...request.payload, target: 'later' }, { ...request.payload, command: 'x' }, { ...request.payload, assistant: 'copilot', target: 'sometime' }]) {
            await instance.receive({ ...request, payload });
        }
        expect(handled).toEqual([]);
    });
});

describe('0035 review 20 S-2 / AC-036: after the timeout a missing claude command is told by its own text', () => {
    const NOT_FOUND = 'the claude command was not found on the PATH';
    const TEXT = 'Claude Code did not start. Is the claude command installed? The prompt is copied.';
    const GENERAL = "Could not open Claude Code's chat. The prompt is copied: paste it there with Ctrl+V.";

    it('AC-036 the texts of section 7 are literal, in one text module', () => {
        expect(CLAUDE_NOT_INSTALLED_TEXT).toBe(TEXT);
        expect(CLAUDE_NOT_INSTALLED_CAUSE).toBe(NOT_FOUND);
    });

    it('AC-036 the host reports the missing command: the prompt is copied, the one warning is the own text, the log names the cause and not the prompt', async () => {
        const world = rig([TERMINAL, CLAUDE_CLI], 'claudeCode');
        world.answers.set('assistant.terminal', () => ({ error: NOT_FOUND }));
        const result = await world.wiring.send.send({ assistant: 'claudeCode', target: 'new', line: LINE });
        expect(result).toEqual<SendOutcomeView>({ outcome: 'copied', text: TEXT });
        expect(world.written).toEqual([LINE]);
        expect(world.warned).toEqual([TEXT]);
        expect(world.blocks).toEqual([[`Send to Claude Code failed (${NOT_FOUND}); the prompt was copied instead.`]]);
        expect(JSON.stringify(world.blocks)).not.toContain(LINE);
    });

    it('AC-036 a prompt that could not be copied is not announced as copied', async () => {
        const world = rig([TERMINAL, CLAUDE_CLI], 'claudeCode', true);
        world.answers.set('assistant.terminal', () => ({ error: NOT_FOUND }));
        const result = await world.wiring.send.send({ assistant: 'claudeCode', target: 'new', line: LINE });
        expect(result.outcome).toBe('copyFailed');
        expect(world.warned).toEqual(["Could not open Claude Code's chat, and the prompt could not be copied."]);
    });

    it('AC-036 the waiting text and the general warning keep their cases', async () => {
        const waiting = rig([TERMINAL, CLAUDE_CLI], 'claudeCode');
        waiting.answers.set('assistant.terminal', () => ({ error: 'Claude Code was not ready within 15000 ms' }));
        await waiting.wiring.send.send({ assistant: 'claudeCode', target: 'new', line: LINE });
        expect(waiting.warned).toEqual([CLAUDE_WAITING_TEXT]);
        const failing = rig([TERMINAL, CLAUDE_CLI], 'claudeCode');
        failing.answers.set('assistant.terminal', () => ({ error: 'the tab closed' }));
        await failing.wiring.send.send({ assistant: 'claudeCode', target: 'new', line: LINE });
        expect(failing.warned).toEqual([GENERAL]);
    });

    it('AC-036 negative control: the cause alone is told apart from every other message', () => {
        const row = createJetBrainsAssistants().claudeCode!;
        expect(row.causes?.notice?.(NOT_FOUND)).toBe(TEXT);
        expect(row.causes?.failed(NOT_FOUND)).toBe(NOT_FOUND);
        for (const other of ['the claude command was not found', 'the claude command was not found on the PATH.', 'terminal call failed: x']) {
            expect(row.causes?.notice?.(other), other).toBeUndefined();
        }
    });
});

describe('0035 review 20 S-3 / PD-110 / AC-037: in a project that is not trusted Send never starts claude', () => {
    const UNTRUSTED = 'the project is not trusted';
    const TEXT = 'This project is not trusted, so Studio does not start claude. The prompt is copied.';

    it('AC-037 the texts of section 7 are literal, in one text module', () => {
        expect(CLAUDE_UNTRUSTED_TEXT).toBe(TEXT);
        expect(CLAUDE_UNTRUSTED_CAUSE).toBe(UNTRUSTED);
    });

    it('AC-037 the host reports the untrusted project: the prompt is copied, the one warning is the own text, the log names the cause and not the prompt', async () => {
        const world = rig([TERMINAL, CLAUDE_CLI], 'claudeCode');
        world.answers.set('assistant.terminal', () => ({ error: UNTRUSTED }));
        const result = await world.wiring.send.send({ assistant: 'claudeCode', target: 'current', line: LINE });
        expect(result).toEqual<SendOutcomeView>({ outcome: 'copied', text: TEXT });
        expect(world.written).toEqual([LINE]);
        expect(world.warned).toEqual([TEXT]);
        expect(world.blocks).toEqual([[`Send to Claude Code failed (${UNTRUSTED}); the prompt was copied instead.`]]);
        expect(JSON.stringify(world.blocks)).not.toContain(LINE);
    });

    it('AC-037 a prompt that could not be copied is not announced as copied', async () => {
        const world = rig([TERMINAL, CLAUDE_CLI], 'claudeCode', true);
        world.answers.set('assistant.terminal', () => ({ error: UNTRUSTED }));
        const result = await world.wiring.send.send({ assistant: 'claudeCode', target: 'new', line: LINE });
        expect(result.outcome).toBe('copyFailed');
        expect(world.warned).toEqual(["Could not open Claude Code's chat, and the prompt could not be copied."]);
    });

    it('AC-037 negative control: the three own texts are told apart, every other message keeps the general warning', () => {
        const row = createJetBrainsAssistants().claudeCode!;
        expect(row.causes?.notice?.(UNTRUSTED)).toBe(TEXT);
        expect(row.causes?.notice?.('the claude command was not found on the PATH')).toBe(CLAUDE_NOT_INSTALLED_TEXT);
        expect(row.causes?.notice?.('Claude Code was not ready for input')).toBe(CLAUDE_WAITING_TEXT);
        expect(row.causes?.failed(UNTRUSTED)).toBe(UNTRUSTED);
        for (const other of ['the project is trusted', 'the project is not trusted.', 'untrusted']) {
            expect(row.causes?.notice?.(other), other).toBeUndefined();
        }
    });
});
