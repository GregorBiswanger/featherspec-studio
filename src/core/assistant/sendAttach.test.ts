import { describe, expect, it } from 'vitest';
import type { AssistantId, AssistantTarget, SendRequest } from '../../shared/protocol/assistant';
import { createFakeSource, modelOf } from '../board/testing/boardWorld';
import { splitterFiles, SPLITTER_SPEC } from '../board/testing/caseFixtures';
import { specText } from '../lifecycle/testing/projects';
import type { ClipboardPort } from '../ports/board';
import type { ShellModel } from '../ports/shell';
import type { SpecSourcePort } from '../ports/specSource';
import { createSetupClock } from '../setup/testing/setupClock';
import { createMemorySpecSource } from '../specs/testing/memorySpecSource';
import { ASSISTANTS } from './assistants';
import { createAttachmentCheck, type AttachmentCheck } from './attachment';
import { createSend } from './send';
import { createFakeAssistantHost, type FakeAssistantHost } from './testing/fakeAssistantHost';

const EXTENSION_A = 'GitHub.copilot-chat';
const EXTENSION_B = 'anthropic.claude-code';
const NEW_CHAT = 'workbench.action.chat.newChat';
const OPEN = 'workbench.action.chat.open';
const CLAUDE_OPEN = 'claude-vscode.editor.open';
const KEY = '.specs/backlog/0002-x.md';
const CLARIFY = `/sdd-clarify ${KEY}`;
const IMPLEMENT = 'Implement T-003 of .specs/active/0001-tip-splitter.plan.md';

interface World {
    host: FakeAssistantHost;
    model: ShellModel;
    root: string;
    stats: string[];
    written: string[];
    warned: string[];
    blocks: string[][];
    clock: ReturnType<typeof createSetupClock>;
    source: ReturnType<typeof createMemorySpecSource>;
    send(request: SendRequest): ReturnType<ReturnType<typeof createSend>['send']>;
}

interface Options {
    files?: Record<string, string>;
    present?: readonly string[];
    attaching?: (id: AssistantId) => boolean;
    stat?: SpecSourcePort['stat'];
    attachment?: AttachmentCheck;
    noFile?: boolean;
}

async function world(assistant: AssistantId, options: Options = {}): Promise<World> {
    const files = options.files ?? { [KEY]: specText() };
    const model = await modelOf(files);
    const root = model.project.root;
    const host = createFakeAssistantHost([NEW_CHAT, OPEN, CLAUDE_OPEN]);
    host.install(EXTENSION_A);
    host.install(EXTENSION_B);
    const source = createMemorySpecSource();
    if (options.noFile !== true) {
        for (const spec of model.project.specs) {
            source.setFile(root, spec.key, 'text');
        }
        for (const plan of model.project.plans) {
            source.setFile(root, plan.key, 'plan');
        }
    }
    const stats: string[] = [];
    const specs: Pick<SpecSourcePort, 'stat'> = {
        stat: (rootArg, relative) => {
            stats.push(relative);
            return (options.stat ?? source.stat.bind(source))(rootArg, relative);
        },
    };
    const written: string[] = [];
    const warned: string[] = [];
    const blocks: string[][] = [];
    const clock = createSetupClock();
    const clipboard: ClipboardPort = { writeText: async (text) => void written.push(text) };
    const sender = createSend({
        host,
        clipboard,
        ui: { warn: (text) => void warned.push(text) },
        output: { appendBlock: (lines) => void blocks.push([...lines]) },
        clock,
        platform: 'win32',
        chosen: { read: () => assistant },
        attachment: options.attachment ?? createAttachmentCheck({ source: createFakeSource(model), specs, host }),
        attaching: options.attaching ?? (() => true),
    });
    return { host, model, root, stats, written, warned, blocks, clock, source, send: (request) => sender.send(request) };
}

function request(assistant: AssistantId, target: AssistantTarget, line: string, attach?: string): SendRequest {
    return { assistant, target, line, ...(attach === undefined ? {} : { attach }) };
}

const uriOf = (w: World, key: string) => ({ fake: 'uri', root: w.root, key });

describe('0027 AC-004: Copilot attaches the spec on its one open call', () => {
    it('0027 AC-004 Given: Copilot, NS-9 .specs/backlog/0002-x.md, new chat records newChat without argument, then open with the query, isPartialQuery and attachFiles', async () => {
        const w = await world('copilot');
        const result = await w.send(request('copilot', 'new', CLARIFY, KEY));
        expect(w.host.calls).toEqual([
            { command: NEW_CHAT, args: [] },
            { command: OPEN, args: [{ query: '/sdd-clarify .specs/backlog/0002-x.md', isPartialQuery: true, attachFiles: [uriOf(w, KEY)] }] },
        ]);
        expect(result.outcome).toBe('opened');
        expect(w.written).toEqual([]);
    });

    it('0027 AC-004: Send to the current chat records only the open call, without the attachment (0032 §6.8)', async () => {
        const w = await world('copilot');
        await w.send(request('copilot', 'current', CLARIFY, KEY));
        expect(w.host.calls).toEqual([{ command: OPEN, args: [{ query: CLARIFY, isPartialQuery: true }] }]);
    });

    it('0027 AC-004: attachFiles holds exactly the URI the host port gives for the project root and the spec path, asked once', async () => {
        const w = await world('copilot');
        await w.send(request('copilot', 'new', CLARIFY, KEY));
        expect(w.host.uriRequests).toEqual([{ root: w.root, key: KEY }]);
    });
});

describe('0027 AC-005: Claude Code gets the path after the line', () => {
    it('0027 AC-005 Given: Claude Code, Active 0001-tip-splitter with T-003 open, claude-vscode.editor.open with undefined and the line, one space, @ and the spec path', async () => {
        const w = await world('claudeCode', { files: splitterFiles({ ticked: ['T-001', 'T-002'], currentStep: 'T-003' }) });
        await w.send(request('claudeCode', 'new', IMPLEMENT, SPLITTER_SPEC));
        expect(w.host.calls).toEqual([{ command: CLAUDE_OPEN, args: [undefined, 'Implement T-003 of .specs/active/0001-tip-splitter.plan.md @.specs/active/0001-tip-splitter.md'] }]);
        const text = w.host.calls[0]!.args[1] as string;
        expect(text).not.toMatch(/[\r\n]/);
        expect(text.endsWith(`@${SPLITTER_SPEC}`)).toBe(true);
    });

    it('0027 AC-005: a spec path with whitespace gives 0024\'s call, with the line alone', () => {
        const calls = ASSISTANTS.claudeCode.callsFor('new', CLARIFY, { uri: {}, path: '.specs/active/0002 x.md' });
        expect(calls).toEqual([{ command: CLAUDE_OPEN, args: [undefined, CLARIFY] }]);
        expect(ASSISTANTS.claudeCode.callsFor('new', CLARIFY, { uri: {}, path: KEY })).toEqual([{ command: CLAUDE_OPEN, args: [undefined, `${CLARIFY} @${KEY}`] }]);
    });
});

describe('0027 AC-006: a Send without an attachment makes 0024\'s calls and never asks the spec source', () => {
    it.each(['copilot', 'claudeCode'] as const)('%s: a request without attach, no stat, no attachFiles, the line alone', async (assistant) => {
        const w = await world(assistant);
        await w.send(request(assistant, 'new', CLARIFY));
        const expected = assistant === 'copilot' ? [{ command: NEW_CHAT, args: [] }, { command: OPEN, args: [{ query: CLARIFY, isPartialQuery: true }] }] : [{ command: CLAUDE_OPEN, args: [undefined, CLARIFY] }];
        expect(w.host.calls).toEqual(expected);
        expect(w.stats).toEqual([]);
        expect(w.host.uriRequests).toEqual([]);
    });

    it('an attach sent for an assistant that does not attach is ignored: no stat, no attachFiles', async () => {
        const w = await world('copilot', { attaching: () => false });
        const result = await w.send(request('copilot', 'current', CLARIFY, KEY));
        expect(w.host.calls).toEqual([{ command: OPEN, args: [{ query: CLARIFY, isPartialQuery: true }] }]);
        expect(w.stats).toEqual([]);
        expect(result).toEqual({ outcome: 'opened', text: "The prompt is in Copilot's chat. Check it, then send it there." });
    });
});

describe('0027 AC-007: the open argument holds exactly its keys, and no call submits, selects a model or sets a mode', () => {
    it('across attaching and plain Sends of both assistants', async () => {
        const all: Array<{ command: string; args: readonly unknown[] }> = [];
        for (const assistant of ['copilot', 'claudeCode'] as const) {
            for (const target of assistant === 'copilot' ? (['new', 'current'] as const) : (['new'] as const)) {
                for (const attach of [KEY, undefined, '.specs/backlog/9999-none.md']) {
                    const w = await world(assistant);
                    await w.send(request(assistant, target, CLARIFY, attach));
                    all.push(...w.host.calls);
                }
            }
        }
        const opens = all.filter((call) => call.command === OPEN);
        expect(opens.length).toBeGreaterThan(0);
        for (const call of opens) {
            const argument = call.args[0] as Record<string, unknown>;
            expect(call.args).toHaveLength(1);
            expect(Object.keys(argument).sort()).toEqual(expect.arrayContaining(['isPartialQuery', 'query']));
            expect(Object.keys(argument).every((key) => ['query', 'isPartialQuery', 'attachFiles'].includes(key))).toBe(true);
            expect(argument.isPartialQuery).toBe(true);
        }
        expect(JSON.stringify(all)).not.toMatch(/preserveInput|modelSelector|"mode"/);
    });
});

const WITHOUT = (name: string) => `The prompt is in ${name}'s chat, without 0002-x.md: the file was not found. Check it, then send it there.`;
const OUTPUT = (name: string) => `Send to ${name}: ${KEY} was not found, so it was not attached.`;
const NAMES: Record<AssistantId, string> = { 'copilot': 'Copilot', claudeCode: 'Claude Code' };

function plainCalls(assistant: AssistantId): Array<{ command: string; args: unknown[] }> {
    return assistant === 'copilot' ? [{ command: NEW_CHAT, args: [] }, { command: OPEN, args: [{ query: CLARIFY, isPartialQuery: true }] }] : [{ command: CLAUDE_OPEN, args: [undefined, CLARIFY] }];
}

describe('0027 AC-009: a missing spec file sends without the attachment and says so', () => {
    const CAUSES: Array<[string, (assistant: AssistantId) => Promise<World>]> = [
        ['stat gives nothing', (assistant) => world(assistant, { noFile: true })],
        ['stat rejects', (assistant) => world(assistant, { stat: () => Promise.reject(new Error('EACCES')) })],
        ['the entry is a symlink', async (assistant) => {
            const w = await world(assistant, { noFile: true });
            w.source.setSymlink(w.root, KEY);
            return w;
        }],
        ['the path is no spec entry of the model', (assistant) => world(assistant, { files: { '.specs/backlog/0003-y.md': specText() } })],
    ];

    for (const assistant of ['copilot', 'claudeCode'] as const) {
        for (const [cause, make] of CAUSES) {
            it(`0027 AC-009 ${assistant}: ${cause}`, async () => {
                const w = await make(assistant);
                const result = await w.send(request(assistant, 'new', CLARIFY, KEY));
                expect(w.host.calls).toEqual(plainCalls(assistant));
                expect(result).toEqual({ outcome: 'opened', text: WITHOUT(NAMES[assistant]) });
                expect(w.blocks).toEqual([[OUTPUT(NAMES[assistant])]]);
                expect(w.warned).toEqual([]);
                expect(w.written).toEqual([]);
                expect(w.host.uriRequests).toEqual([]);
            });
        }
    }

    it('0027 AC-009: a stat not settled 5000 ms after the activation ends in 0024\'s fallback (fake timers)', async () => {
        const w = await world('copilot', { stat: () => new Promise(() => undefined) });
        const pending = w.send(request('copilot', 'new', CLARIFY, KEY));
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
        w.clock.advance(5000);
        const result = await pending;
        expect(result.outcome).toBe('copied');
        expect(w.written).toEqual([CLARIFY]);
        expect(w.warned).toHaveLength(1);
        expect(w.blocks).toEqual([['Send to Copilot failed (no result within 5000 ms); the prompt was copied instead.']]);
        expect(w.host.calls).toEqual([]);
    });

    it('0027 AC-009 control: with the file present the same Send attaches, says 0024\'s sentence and writes no Output line', async () => {
        const w = await world('copilot');
        const result = await w.send(request('copilot', 'new', CLARIFY, KEY));
        expect(result).toEqual({ outcome: 'opened', text: "The prompt is in Copilot's chat. Check it, then send it there." });
        expect(w.blocks).toEqual([]);
    });
});

describe('0027 AC-010: the host attaches only a spec entry of the current model', () => {
    const FILES = {
        [KEY]: specText({ plan: '[0002-x.plan.md](0002-x.plan.md)' }),
        '.specs/backlog/0002-x.plan.md': '# Plan\n\n**Status:** Not started\n',
        '.memory-bank/activeContext.0002-T-001.md': '# Return note\n\n- **Status:** DONE\n',
        'AGENTS.md': '# Agents',
    };

    it.each(['.memory-bank/activeContext.0002-T-001.md', 'AGENTS.md', '.env', '../x.md', '/etc/passwd', 'C:\\Users\\x\\secret.md', '.specs/backlog/../backlog/0002-x.md', '.specs/backlog/0002-x.md/', '...'])('%j: no call carries it, and the Send goes as AC-009 says', async (attach) => {
        for (const assistant of ['copilot', 'claudeCode'] as const) {
            const w = await world(assistant, { files: FILES });
            const result = await w.send(request(assistant, 'new', CLARIFY, attach));
            expect(w.host.calls).toEqual(plainCalls(assistant));
            expect(JSON.stringify(w.host.calls)).not.toContain('attachFiles');
            expect(JSON.stringify(w.host.calls)).not.toContain(' @');
            expect(w.stats).toEqual([]);
            expect(result.outcome).toBe('opened');
            expect(result.text).toContain('the file was not found');
            expect(w.blocks).toHaveLength(1);
        }
    });

    it('negative control: the spec entry itself attaches in the same world', async () => {
        const w = await world('claudeCode', { files: FILES });
        await w.send(request('claudeCode', 'new', CLARIFY, KEY));
        expect(JSON.stringify(w.host.calls)).toContain(`@${KEY}`);
    });
});

describe('0027 AC-008: the fallback copies exactly the line, never the suffix, and the Output line holds no line', () => {
    const CAUSES: Array<[string, (w: World) => void]> = [
        ['the extension is missing', (w) => w.host.uninstall(EXTENSION_A)],
        ['activating rejects', (w) => w.host.install(EXTENSION_A, { active: false, activateRejects: 'boom' })],
        ['the command is missing', (w) => void (w.host.available = [])],
        ['the command rejects', (w) => w.host.rejects.set(OPEN, 'refused')],
    ];

    it.each(CAUSES)('Copilot, %s', async (_cause, arrange) => {
        const w = await world('copilot');
        arrange(w);
        const result = await w.send(request('copilot', 'current', CLARIFY, KEY));
        expect(result.outcome).toBe('copied');
        expect(w.written).toEqual([CLARIFY]);
        expect(w.written.join('')).not.toContain(' @');
        expect(w.blocks.flat().join('\n')).not.toContain(CLARIFY);
    });

    it('Claude Code: the command rejects after the suffix was built; the clipboard still holds the line alone', async () => {
        const w = await world('claudeCode');
        w.host.rejects.set(CLAUDE_OPEN, 'refused');
        const result = await w.send(request('claudeCode', 'new', CLARIFY, KEY));
        expect(result.outcome).toBe('copied');
        expect(w.written).toEqual([CLARIFY]);
        expect(w.blocks.flat().join('\n')).not.toContain(CLARIFY);
        expect(w.blocks.flat().join('\n')).not.toContain(`@${KEY}`);
    });

    it('a Send that is not the chosen assistant copies the line alone as 0024 says', async () => {
        const w = await world('claudeCode');
        const result = await w.send(request('copilot', 'new', CLARIFY, KEY));
        expect(result.outcome).toBe('copied');
        expect(w.written).toEqual([CLARIFY]);
    });
});

describe('0032 AC-008: Copilot attaches only in a new chat (PD-094)', () => {
    it('0032 AC-008 current chat: open without attachFiles, even when the request carries the spec; the file check is not asked', async () => {
        const w = await world('copilot');
        await w.send(request('copilot', 'current', CLARIFY, KEY));
        expect(w.host.calls).toEqual([{ command: OPEN, args: [{ query: CLARIFY, isPartialQuery: true }] }]);
        expect(w.host.uriRequests).toEqual([]);
    });

    it('0032 AC-008 new chat keeps attaching; Claude Code is unchanged', async () => {
        const w = await world('copilot');
        await w.send(request('copilot', 'new', CLARIFY, KEY));
        expect(w.host.calls).toEqual([{ command: NEW_CHAT, args: [] }, { command: OPEN, args: [{ query: CLARIFY, isPartialQuery: true, attachFiles: [uriOf(w, KEY)] }] }]);
        const claude = await world('claudeCode');
        await claude.send(request('claudeCode', 'new', CLARIFY, KEY));
        expect(claude.host.calls).toEqual([{ command: CLAUDE_OPEN, args: [undefined, `${CLARIFY} @${KEY}`] }]);
    });
});
