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

    it('0027 AC-004: Send to the current chat records only the open call, with the attachment', async () => {
        const w = await world('copilot');
        await w.send(request('copilot', 'current', CLARIFY, KEY));
        expect(w.host.calls).toEqual([{ command: OPEN, args: [{ query: CLARIFY, isPartialQuery: true, attachFiles: [uriOf(w, KEY)] }] }]);
    });

    it('0027 AC-004: attachFiles holds exactly the URI the host port gives for the project root and the spec path, asked once', async () => {
        const w = await world('copilot');
        await w.send(request('copilot', 'current', CLARIFY, KEY));
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
