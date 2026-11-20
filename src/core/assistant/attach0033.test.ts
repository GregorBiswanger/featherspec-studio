import { describe, expect, it } from 'vitest';
import type { AssistantId, AssistantTarget, SendRequest } from '../../shared/protocol/assistant';
import { createFakeSource, modelOf } from '../board/testing/boardWorld';
import { planText, specText } from '../lifecycle/testing/projects';
import type { SpecSourcePort } from '../ports/specSource';
import { createSetupClock } from '../setup/testing/setupClock';
import { createMemorySpecSource } from '../specs/testing/memorySpecSource';
import { ASSISTANTS } from './assistants';
import { attachmentOf, createAttachmentCheck, followUpCaseOf } from './attachment';
import { createSend } from './send';
import { sendViewOf } from './sendView';
import { createFakeAssistantHost } from './testing/fakeAssistantHost';

const NEW_CHAT = 'workbench.action.chat.newChat';
const OPEN = 'workbench.action.chat.open';
const CLAUDE_OPEN = 'claude-vscode.editor.open';
const SPEC = '.specs/backlog/0007-x.md';
const PLAN = '.specs/backlog/0007-x.plan.md';
const LINK = '[0007-x.plan.md](0007-x.plan.md)';
const START = `/sdd-lifecycle ${SPEC} In Progress`;
const IMPLEMENT = `Implement T-001 of ${PLAN}`;
const FILES = { [SPEC]: specText({ plan: LINK }), [PLAN]: `${planText()}\n## Steps\n\n### T-001 — Step\n\n- [ ] **Verified (T-001):** —\n` };

async function world(assistant: AssistantId, options: { missing?: readonly string[]; files?: Record<string, string> } = {}) {
    const model = await modelOf(options.files ?? FILES);
    const host = createFakeAssistantHost([NEW_CHAT, OPEN, CLAUDE_OPEN]);
    host.install('GitHub.copilot-chat');
    host.install('anthropic.claude-code');
    const source = createMemorySpecSource();
    for (const spec of model.project.specs) {
        if (!(options.missing ?? []).includes(spec.key)) {
            source.setFile(model.project.root, spec.key, 'text');
        }
    }
    for (const plan of model.project.plans) {
        if (!(options.missing ?? []).includes(plan.key)) {
            source.setFile(model.project.root, plan.key, 'plan');
        }
    }
    const specs: Pick<SpecSourcePort, 'stat'> = { stat: (root, relative) => source.stat(root, relative) };
    const blocks: string[][] = [];
    const sender = createSend({
        host,
        clipboard: { writeText: async () => undefined },
        ui: { warn: () => undefined },
        output: { appendBlock: (lines) => void blocks.push([...lines]) },
        clock: createSetupClock(),
        platform: 'win32',
        chosen: { read: () => assistant },
        attachment: createAttachmentCheck({ source: createFakeSource(model), specs, host }),
        attaching: () => true,
    });
    return { host, blocks, root: model.project.root, send: (request: SendRequest) => sender.send(request) };
}

const request = (assistant: AssistantId, target: AssistantTarget, line: string, attach: string, attachAlso?: string[]): SendRequest => ({ assistant, target, line, attach, ...(attachAlso === undefined ? {} : { attachAlso }) });

describe('0033 AC-003: Implement attaches only the plan', () => {
    it('0033 AC-003 NS-7, NS-6-open and the Then: line (NS-6-report line 2) attach the plan alone, for both assistants', () => {
        for (const assistant of ['copilot', 'claudeCode'] as const) {
            const offer = { assistant, attaches: true };
            for (const stepCase of ['NS-7', 'NS-6-open'] as const) {
                expect(attachmentOf(offer, stepCase, { key: SPEC, plan: PLAN }), `${assistant} ${stepCase}`).toEqual({ attach: { name: '0007-x.plan.md', path: PLAN } });
            }
            const own = followUpCaseOf('NS-6-report', 1);
            expect(own).toBe('NS-6-open');
            expect(attachmentOf(offer, own!, { key: SPEC, plan: PLAN })).toEqual({ attach: { name: '0007-x.plan.md', path: PLAN } });
            expect(sendViewOf(offer, 'NS-7', { key: SPEC, plan: PLAN })?.attach?.path).toBe(PLAN);
        }
    });

    it('0033 AC-003 Copilot: attachFiles is [plan]', async () => {
        const w = await world('copilot');
        await w.send(request('copilot', 'new', IMPLEMENT, PLAN));
        expect(w.host.calls).toEqual([
            { command: NEW_CHAT, args: [] },
            { command: OPEN, args: [{ query: IMPLEMENT, isPartialQuery: true, attachFiles: [{ fake: 'uri', root: w.root, key: PLAN }] }] },
        ]);
    });

    it('0033 AC-003 Claude Code: the line ends with one @<plan>', async () => {
        const w = await world('claudeCode');
        await w.send(request('claudeCode', 'new', IMPLEMENT, PLAN));
        expect(w.host.calls).toEqual([{ command: CLAUDE_OPEN, args: [undefined, `${IMPLEMENT} @${PLAN}`] }]);
    });
});

describe('0033 AC-004: the start step attaches spec and plan', () => {
    it('0033 AC-004 the decision lists spec first, then plan; whitespace drops only that path for Claude Code', () => {
        expect(attachmentOf({ assistant: 'copilot', attaches: true }, 'NS-7-start', { key: SPEC, plan: PLAN })).toEqual({ attach: { name: '0007-x.md', path: SPEC }, attachAlso: [{ name: '0007-x.plan.md', path: PLAN }] });
        expect(attachmentOf({ assistant: 'claudeCode', attaches: true }, 'NS-7-start', { key: '.specs/backlog/0007 x.md', plan: PLAN })).toEqual({ attach: { name: '0007-x.plan.md', path: PLAN } });
        expect(attachmentOf({ assistant: 'claudeCode', attaches: true }, 'NS-7-start', { key: SPEC, plan: '.specs/backlog/0007 x.plan.md' })).toEqual({ attach: { name: '0007-x.md', path: SPEC } });
        expect(attachmentOf({ assistant: 'claudeCode', attaches: true }, 'NS-7-start', { key: '.specs/backlog/0007 x.md', plan: '.specs/backlog/0007 y.plan.md' })).toEqual({});
    });

    it('0033 AC-004 Copilot: attachFiles is [spec, plan] on one open call', async () => {
        const w = await world('copilot');
        await w.send(request('copilot', 'new', START, SPEC, [PLAN]));
        expect(w.host.calls).toEqual([
            { command: NEW_CHAT, args: [] },
            { command: OPEN, args: [{ query: START, isPartialQuery: true, attachFiles: [{ fake: 'uri', root: w.root, key: SPEC }, { fake: 'uri', root: w.root, key: PLAN }] }] },
        ]);
    });

    it('0033 AC-004 Claude Code: one @path per file, spec then plan', async () => {
        const w = await world('claudeCode');
        await w.send(request('claudeCode', 'new', START, SPEC, [PLAN]));
        expect(w.host.calls).toEqual([{ command: CLAUDE_OPEN, args: [undefined, `${START} @${SPEC} @${PLAN}`] }]);
    });

    it('0033 AC-004 host adapter: the whitespace rule applies per path', () => {
        const spec = { uri: {}, path: '.specs/backlog/0007 x.md' };
        const plan = { uri: {}, path: PLAN };
        expect(ASSISTANTS.claudeCode.callsFor('new', START, [spec, plan])).toEqual([{ command: CLAUDE_OPEN, args: [undefined, `${START} @${PLAN}`] }]);
        expect(ASSISTANTS.claudeCode.callsFor('new', START, [plan, spec])).toEqual([{ command: CLAUDE_OPEN, args: [undefined, `${START} @${PLAN}`] }]);
        expect(ASSISTANTS.claudeCode.callsFor('new', START, [spec])).toEqual([{ command: CLAUDE_OPEN, args: [undefined, START] }]);
        expect(ASSISTANTS['copilot'].callsFor('current', START, [spec, plan])).toEqual([{ command: OPEN, args: [{ query: START, isPartialQuery: true, attachFiles: [spec.uri, plan.uri] }] }]);
    });

    it('0033 AC-004 the current chat of Copilot attaches nothing (PD-094)', async () => {
        const w = await world('copilot');
        await w.send(request('copilot', 'current', START, SPEC, [PLAN]));
        expect(w.host.calls).toEqual([{ command: OPEN, args: [{ query: START, isPartialQuery: true }] }]);
    });

    it('0033 AC-004 A-003: a missing plan drops that file only; the spec stays attached and the output names the plan', async () => {
        const w = await world('copilot', { missing: [PLAN] });
        const result = await w.send(request('copilot', 'new', START, SPEC, [PLAN]));
        expect(w.host.calls[1]).toEqual({ command: OPEN, args: [{ query: START, isPartialQuery: true, attachFiles: [{ fake: 'uri', root: w.root, key: SPEC }] }] });
        expect(result.outcome).toBe('opened');
        expect(w.blocks).toEqual([[`Send to Copilot: ${PLAN} was not found, so it was not attached.`]]);
    });

    it('0033 AC-004 A-003: both files missing opens the chat without any attachment', async () => {
        const w = await world('claudeCode', { missing: [SPEC, PLAN] });
        await w.send(request('claudeCode', 'new', START, SPEC, [PLAN]));
        expect(w.host.calls).toEqual([{ command: CLAUDE_OPEN, args: [undefined, START] }]);
        expect(w.blocks[0]).toHaveLength(2);
    });
});
