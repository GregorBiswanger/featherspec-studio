import { describe, expect, it } from 'vitest';
import { createAssistantWiring, type AssistantWiring } from '../../core/assistant/wiring';
import { plainSendViewOf } from '../../core/assistant/sendView';
import { CLI_FORMS, cliText } from '../../core/assistant/references';
import { createFakeSource } from '../../core/board/testing/boardWorld';
import type { SettingPort } from '../../core/ports/host';
import { createSetupClock } from '../../core/setup/testing/setupClock';
import { createMemorySpecSource } from '../../core/specs/testing/memorySpecSource';
import type { SendOutcomeView } from '../../shared/protocol/assistant';
import { CLAUDE_NOT_INSTALLED_CAUSE, CLAUDE_NOT_INSTALLED_TEXT, CLAUDE_NOT_READY_NOW_CAUSE, CLAUDE_UNTRUSTED_CAUSE, CLAUDE_UNTRUSTED_TEXT, CLAUDE_WAITING_TEXT, agentNotInstalledCause, agentNotInstalledText, agentNotReadyCause, agentNotReadyNowCause, agentUntrustedText, agentWaitingText } from '../../shared/protocol/assistantTexts';
import { createBridge } from './bridge';
import type { CoreConfig, NativeHost } from './contract';
import { CLI_AGENTS, createJetBrainsAssistants, JETBRAINS_SEND_TARGETS, pluginPresent, TERMINAL_COMMAND } from './assistants';
import { createMirrors } from './mirrors';
import { createEmbeddedPorts } from './ports';

const TERMINAL = 'org.jetbrains.plugins.terminal';
const LINE = '/sdd-plan .specs/active/0001-tip-splitter.md';
const SPEC = '.specs/active/0001-tip-splitter.md';
const PLAN = '.specs/active/0001-tip-splitter.plan.md';
const AGENTS = [
    { id: 'junie', name: 'Junie', command: 'junie', presence: 'cli:junie' },
    { id: 'claudeCode', name: 'Claude Code', command: 'claude', presence: 'cli:claude' },
    { id: 'copilot', name: 'Copilot', command: 'copilot', presence: 'cli:copilot' },
] as const;

function config(plugins: readonly string[], settings: Record<string, unknown> = {}): CoreConfig {
    return { host: 'jetbrains', platform: 'linux', studioVersion: '1.0.0', settings, trusted: true, folders: [], memory: {}, plugins };
}

interface Rig {
    wiring: AssistantWiring;
    frames: Array<Record<string, unknown>>;
    written: string[];
    blocks: string[][];
    warned: string[];
    clock: ReturnType<typeof createSetupClock>;
    answers: Map<string, (args: unknown) => { ok: unknown } | { error: string } | 'never'>;
}

function rig(plugins: readonly string[], stored: unknown, failClipboard = false, viaPorts = false): Rig {
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
    const cfg = config(plugins, viaPorts && stored !== undefined ? { assistant: stored } : {});
    const mirrors = createMirrors(cfg);
    const ports = createEmbeddedPorts(bridge, mirrors, cfg);
    const state = { value: stored };
    const setting: SettingPort = viaPorts ? ports.setting('assistant') : { read: () => state.value, onDidChange: () => ({ dispose: () => undefined }) };
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
    return { wiring, frames, written, blocks, warned, clock, answers };
}

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const CLI_IDS = ['cli:junie', 'cli:claude', 'cli:copilot'];
const SUBSETS: string[][] = Array.from({ length: 16 }, (_unused, mask) => [TERMINAL, ...CLI_IDS].filter((_id, index) => (mask & (1 << index)) !== 0));

describe('0035 PD-112 AC-045: the JetBrains offer by value and available agents', () => {
    for (const value of ['none', 'copilot', 'claudeCode', 'junie', '', 42, undefined]) {
        for (const plugins of SUBSETS) {
            it(`AC-045 the value ${JSON.stringify(value) ?? 'unset'} with ${plugins.join(' + ') || 'nothing'}`, () => {
                const agent = AGENTS.find((candidate) => candidate.id === (value === undefined ? 'junie' : value));
                const expected = agent !== undefined && plugins.includes(TERMINAL) && plugins.includes(agent.presence)
                    ? { assistant: agent.id, target: 'current', targets: ['current', 'new'] }
                    : undefined;
                expect(plainSendViewOf(rig(plugins, value, false, true).wiring.offer.read())).toEqual(expected);
            });
        }
    }

    it('AC-045 the Terminal plugin alone, or an agent without it, offers nothing; null is unset', () => {
        expect(rig([TERMINAL], 'junie', false, true).wiring.offer.read()).toBeUndefined();
        expect(rig(['cli:junie'], 'junie', false, true).wiring.offer.read()).toBeUndefined();
        expect(plainSendViewOf(rig([TERMINAL, 'cli:junie'], null, false, true).wiring.offer.read())?.assistant).toBe('junie');
    });

    it('AC-045 a value of the retired Copy for era acts as none and never throws', () => {
        for (const old of ['copyForJunie', 'copyForAssistant', 'copyFor', 'Copy for Copilot', {}, [], true]) {
            expect(rig([TERMINAL, ...CLI_IDS], old, false, true).wiring.offer.read(), JSON.stringify(old)).toBeUndefined();
        }
    });

    it('AC-045 the presence ids: an agent needs the Terminal plugin and its own cli id, nothing else counts', () => {
        expect(pluginPresent('cli:junie', [TERMINAL, 'cli:junie'])).toBe(true);
        expect(pluginPresent('cli:junie', ['cli:junie'])).toBe(false);
        expect(pluginPresent('cli:junie', [TERMINAL, 'cli:claude'])).toBe(false);
        expect(pluginPresent('cli:copilot', ['com.github.copilot', 'org.jetbrains.junie', 'com.intellij.ml.llm', TERMINAL])).toBe(false);
    });

    it('AC-045 the send targets of the router: current and new for all three', () => {
        expect(JETBRAINS_SEND_TARGETS).toEqual({ 'copilot': ['current', 'new'], claudeCode: ['current', 'new'], junie: ['current', 'new'] });
    });
});

describe('0035 PD-112 AC-047: one row per agent, the rules of Claude Code for each', () => {
    const table = createJetBrainsAssistants();

    it('the agents of the table are the three of the spec', () => {
        expect(CLI_AGENTS.map((agent) => [agent.id, agent.name, agent.command, agent.presence])).toEqual(AGENTS.map((agent) => [agent.id, agent.name, agent.command, agent.presence]));
    });

    for (const agent of AGENTS) {
        it(`AC-011 ${agent.name}: the row has the presence of the command, send, current and new, 20000 ms, attaching`, () => {
            const row = table[agent.id]!;
            expect(row.extensionId).toBe(agent.presence);
            expect(row.handover).toBe('send');
            expect(row.targets).toEqual(['current', 'new']);
            expect(row.timeoutMs).toBe(20000);
            expect(row.attachesSpec).toBe(true);
            expect(row).not.toHaveProperty('text');
            expect(row).not.toHaveProperty('place');
        });

        it(`AC-046 ${agent.name}: the call carries assistant, target and the cliText of its form, one @ per path, in order`, () => {
            const files = [{ uri: undefined, path: SPEC }, { uri: undefined, path: PLAN }];
            expect(table[agent.id]!.callsFor('current', LINE, files)).toEqual([
                { command: TERMINAL_COMMAND, args: [{ assistant: agent.id, target: 'current', text: cliText(LINE, [SPEC, PLAN], CLI_FORMS[agent.id]) }] },
            ]);
            expect(table[agent.id]!.callsFor('new', '/sdd-specify')).toEqual([
                { command: TERMINAL_COMMAND, args: [{ assistant: agent.id, target: 'new', text: cliText('/sdd-specify', [], CLI_FORMS[agent.id]) }] },
            ]);
        });

        it(`AC-011 ${agent.name}: the main part types through assistant.terminal, reports Opened and leaves the clipboard alone`, async () => {
            const world = rig([TERMINAL, agent.presence], agent.id);
            world.answers.set('assistant.terminal', () => ({ ok: null }));
            const result = await world.wiring.send.send({ assistant: agent.id, target: 'current', line: LINE });
            expect(result).toEqual<SendOutcomeView>({ outcome: 'opened', text: `The prompt is in ${agent.name}'s chat. Check it, then send it there.` });
            expect(world.frames.map((frame) => [frame.name, frame.args])).toEqual([
                ['assistant.terminal', { assistant: agent.id, target: 'current', text: cliText(LINE, [], CLI_FORMS[agent.id]) }],
            ]);
            expect(world.written).toEqual([]);
            expect(world.warned).toEqual([]);
        });

        it(`AC-013 ${agent.name}: an agent that is gone before the call copies the line with the Terminal cause and makes no call`, async () => {
            const world = rig([TERMINAL], agent.id);
            const result = await world.wiring.send.send({ assistant: agent.id, target: 'current', line: LINE });
            expect(result.outcome).toBe('copied');
            expect(world.written).toEqual([LINE]);
            expect(world.blocks).toEqual([[`Send to ${agent.name} failed (the Terminal plugin is not available); the prompt was copied instead.`]]);
            expect(world.frames).toEqual([]);
        });

        it(`AC-013 ${agent.name}: a failing call is told with its message, the general warning stays`, async () => {
            const world = rig([TERMINAL, agent.presence], agent.id);
            world.answers.set('assistant.terminal', () => ({ error: 'the tab closed' }));
            await world.wiring.send.send({ assistant: agent.id, target: 'new', line: LINE });
            expect(world.blocks).toEqual([[`Send to ${agent.name} failed (terminal call failed: the tab closed); the prompt was copied instead.`]]);
            expect(world.warned).toEqual([`Could not open ${agent.name}'s chat. The prompt is copied: paste it there with Ctrl+V.`]);
        });

        it(`AC-013 ${agent.name}: a call that never answers falls back after 20000 ms, not before`, async () => {
            const world = rig([TERMINAL, agent.presence], agent.id);
            world.answers.set('assistant.terminal', () => 'never');
            let result: SendOutcomeView | undefined;
            void world.wiring.send.send({ assistant: agent.id, target: 'current', line: LINE }).then((value) => (result = value));
            await settle();
            world.clock.advance(19999);
            await settle();
            expect(result).toBeUndefined();
            world.clock.advance(1);
            await settle();
            expect(result?.outcome).toBe('copied');
            expect(world.blocks).toEqual([[`Send to ${agent.name} failed (no result within 20000 ms); the prompt was copied instead.`]]);
            expect(world.frames.filter((frame) => frame.k === 'call')).toHaveLength(1);
        });

        const waiting = agentWaitingText(agent.name);
        for (const message of [agentNotReadyCause(agent.name, 15000), agentNotReadyNowCause(agent.name)]) {
            it(`AC-032 ${agent.name}: "${message}" gives the waiting text, the prompt copied, the log names the cause only`, async () => {
                const world = rig([TERMINAL, agent.presence], agent.id);
                world.answers.set('assistant.terminal', () => ({ error: message }));
                const result = await world.wiring.send.send({ assistant: agent.id, target: 'current', line: LINE });
                expect(result).toEqual<SendOutcomeView>({ outcome: 'copied', text: waiting });
                expect(world.written).toEqual([LINE]);
                expect(world.warned).toEqual([waiting]);
                expect(world.blocks).toEqual([[`Send to ${agent.name} failed (${message}); the prompt was copied instead.`]]);
                expect(JSON.stringify(world.blocks)).not.toContain(LINE);
            });
        }

        it(`AC-036 ${agent.name}: the missing command has its own text`, async () => {
            const world = rig([TERMINAL, agent.presence], agent.id);
            world.answers.set('assistant.terminal', () => ({ error: agentNotInstalledCause(agent.command) }));
            const text = agentNotInstalledText(agent.name, agent.command);
            expect(await world.wiring.send.send({ assistant: agent.id, target: 'new', line: LINE })).toEqual<SendOutcomeView>({ outcome: 'copied', text });
            expect(world.warned).toEqual([text]);
            expect(world.blocks).toEqual([[`Send to ${agent.name} failed (the ${agent.command} command was not found on the PATH); the prompt was copied instead.`]]);
        });

        it(`AC-037 ${agent.name}: the untrusted project has its own text`, async () => {
            const world = rig([TERMINAL, agent.presence], agent.id);
            world.answers.set('assistant.terminal', () => ({ error: CLAUDE_UNTRUSTED_CAUSE }));
            const text = agentUntrustedText(agent.command);
            expect(await world.wiring.send.send({ assistant: agent.id, target: 'new', line: LINE })).toEqual<SendOutcomeView>({ outcome: 'copied', text });
            expect(world.warned).toEqual([text]);
        });

        it(`AC-032 ${agent.name}: a prompt that could not be copied is never announced as copied`, async () => {
            const world = rig([TERMINAL, agent.presence], agent.id, true);
            world.answers.set('assistant.terminal', () => ({ error: agentNotReadyNowCause(agent.name) }));
            const result = await world.wiring.send.send({ assistant: agent.id, target: 'current', line: LINE });
            expect(result.outcome).toBe('copyFailed');
            expect(world.warned).toEqual([`Could not open ${agent.name}'s chat, and the prompt could not be copied.`]);
        });

        it(`AC-032 ${agent.name}: the causes of another agent are no notice of this one`, () => {
            const row = table[agent.id]!;
            for (const other of AGENTS.filter((candidate) => candidate.id !== agent.id)) {
                expect(row.causes?.notice?.(agentNotReadyCause(other.name, 15000)), other.name).toBeUndefined();
                expect(row.causes?.notice?.(agentNotReadyNowCause(other.name)), other.name).toBeUndefined();
                expect(row.causes?.notice?.(agentNotInstalledCause(other.command)), other.name).toBeUndefined();
            }
            for (const unknown of ['the tab closed', '', `${agent.name} was not ready within 5000 ms`]) {
                expect(row.causes?.notice?.(unknown), unknown).toBeUndefined();
            }
            expect(row.causes?.failed(agentNotReadyNowCause(agent.name))).toBe(agentNotReadyNowCause(agent.name));
        });
    }
});

describe('0035 PD-112: the texts of spec section 16, literally, and the Claude Code instance byte-identical', () => {
    it('the waiting text, the untrusted text, the missing text and the causes per agent', () => {
        expect(agentWaitingText('Junie')).toBe('Junie is waiting for you in the terminal. Answer it there, then send again. The prompt is copied.');
        expect(agentWaitingText('Copilot')).toBe('Copilot is waiting for you in the terminal. Answer it there, then send again. The prompt is copied.');
        expect(agentUntrustedText('junie')).toBe('This project is not trusted, so Studio does not start junie. The prompt is copied.');
        expect(agentNotInstalledText('Copilot', 'copilot')).toBe(`Copilot did not start. Is the ${'copilot'} command installed? The prompt is copied.`);
        expect(agentNotReadyCause('Junie', 15000)).toBe('Junie was not ready within 15000 ms');
        expect(agentNotReadyNowCause('Copilot')).toBe('Copilot was not ready for input');
        expect(agentNotInstalledCause('junie')).toBe('the junie command was not found on the PATH');
    });

    it('the Claude Code constants of section 7 are unchanged and are the instance of the functions', () => {
        expect(CLAUDE_WAITING_TEXT).toBe('Claude Code is waiting for you in the terminal. Answer it there, then send again. The prompt is copied.');
        expect(CLAUDE_UNTRUSTED_TEXT).toBe('This project is not trusted, so Studio does not start claude. The prompt is copied.');
        expect(CLAUDE_NOT_INSTALLED_TEXT).toBe('Claude Code did not start. Is the claude command installed? The prompt is copied.');
        expect(CLAUDE_NOT_READY_NOW_CAUSE).toBe('Claude Code was not ready for input');
        expect(CLAUDE_NOT_INSTALLED_CAUSE).toBe('the claude command was not found on the PATH');
        expect(CLAUDE_WAITING_TEXT).toBe(agentWaitingText('Claude Code'));
        expect(CLAUDE_UNTRUSTED_TEXT).toBe(agentUntrustedText('claude'));
        expect(CLAUDE_NOT_INSTALLED_TEXT).toBe(agentNotInstalledText('Claude Code', 'claude'));
    });
});
