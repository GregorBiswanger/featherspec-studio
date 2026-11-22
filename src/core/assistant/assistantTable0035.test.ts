import { describe, expect, it } from 'vitest';
import { ASSISTANT_IDS, ASSISTANT_TARGETS, isAssistantId, isSendPromptPayload, type AssistantId } from '../../shared/protocol/assistant';
import { ASSISTANT_NAMES } from '../../shared/protocol/assistantTexts';
import type { SettingPort } from '../ports/host';
import { createFakeSource } from '../board/testing/boardWorld';
import { createMemorySpecSource } from '../specs/testing/memorySpecSource';
import { createSetupClock } from '../setup/testing/setupClock';
import { ASSISTANTS, type AssistantTable } from './assistants';
import { attachesOf, extensionPresence, offerOf } from './offer';
import { createSend } from './send';
import { plainSendViewOf } from './sendView';
import { createFakeAssistantHost } from './testing/fakeAssistantHost';
import { createAssistantWiring } from './wiring';

const EXT_A = 'GitHub.copilot-chat';
const EXT_B = 'anthropic.claude-code';
const ALPHA = 'test.alpha';
const BETA = 'test.beta';
const LINE = 'Implement T-003 of .specs/active/0001-tip-splitter.plan.md';

const VS_CODE_SETS: Array<[string, string[]]> = [
    ['nothing', []],
    ['Copilot', [EXT_A]],
    ['Claude Code', [EXT_B]],
    ['both', [EXT_A, EXT_B]],
    ['both and another', [EXT_A, EXT_B, 'openai.chatgpt', ALPHA, BETA]],
];

const FAKE_TABLE: AssistantTable = {
    claudeCode: {
        extensionId: ALPHA,
        handover: 'send',
        attachesSpec: true,
        targets: ['current', 'new'],
        timeoutMs: 20000,
        callsFor: (_target, line) => [{ command: 'alpha.open', args: [line] }],
    },
    junie: {
        extensionId: BETA,
        handover: 'copyFor',
        attachesSpec: false,
        targets: ['new'],
        text: (line, paths) => `${line}${paths.map((path) => ` @file:${path}`).join('')}`,
        callsFor: () => [],
    },
};

describe('0035 T-002 / AC-004 (core): junie is an id; the VS Code table has no row for it', () => {
    it('the ids are the VS Code two and junie in this order and junie is a known id', () => {
        expect([...ASSISTANT_IDS]).toEqual(['copilot', 'claudeCode', 'junie']);
        expect(isAssistantId('junie')).toBe(true);
        expect(isAssistantId('codex')).toBe(false);
    });

    it('junie has a name and a target list; the other two stay as they were', () => {
        expect(ASSISTANT_NAMES).toEqual({ 'copilot': 'Copilot', claudeCode: 'Claude Code', junie: 'Junie' });
        expect(ASSISTANT_TARGETS.junie).toEqual(['new']);
        expect(ASSISTANT_TARGETS['copilot']).toEqual(['new', 'current']);
        expect(ASSISTANT_TARGETS.claudeCode).toEqual(['new']);
    });

    it('a send request for junie is a valid payload shape; an unknown assistant is not', () => {
        expect(isSendPromptPayload({ assistant: 'junie', target: 'new', line: LINE, token: 'a-1' })).toBe(true);
        expect(isSendPromptPayload({ assistant: 'codex', target: 'new', line: LINE, token: 'a-1' })).toBe(false);
    });

    it('the VS Code table holds exactly the two rows, as sends, with the targets of the shared constants', () => {
        expect(Object.keys(ASSISTANTS)).toEqual(['copilot', 'claudeCode']);
        expect(ASSISTANTS['copilot'].handover).toBe('send');
        expect(ASSISTANTS.claudeCode.handover).toBe('send');
        expect(ASSISTANTS['copilot'].targets).toEqual(ASSISTANT_TARGETS['copilot']);
        expect(ASSISTANTS.claudeCode.targets).toEqual(ASSISTANT_TARGETS.claudeCode);
        expect(ASSISTANTS['copilot'].timeoutMs).toBeUndefined();
        expect(ASSISTANTS.claudeCode.timeoutMs).toBeUndefined();
    });

    it('the VS Code calls are unchanged', () => {
        const file = { uri: 'uri:a', path: '.specs/active/0001-a.md' };
        expect(ASSISTANTS['copilot'].callsFor('new', LINE, file)).toEqual([
            { command: 'workbench.action.chat.newChat', args: [] },
            { command: 'workbench.action.chat.open', args: [{ query: LINE, isPartialQuery: true, attachFiles: ['uri:a'] }] },
        ]);
        expect(ASSISTANTS.claudeCode.callsFor('new', LINE, file)).toEqual([{ command: 'claude-vscode.editor.open', args: [undefined, `${LINE} @.specs/active/0001-a.md`] }]);
    });

    for (const [valueName, value] of [['junie', 'junie'], ['empty string', ''], ['42', 42], ['unset', undefined]] as const) {
        for (const [setName, present] of VS_CODE_SETS) {
            it(`VS Code table: the value ${valueName} with ${setName} acts as none`, () => {
                expect(offerOf(value, present)).toBeUndefined();
                expect(offerOf(value, present, undefined, ASSISTANTS)).toBeUndefined();
            });
        }
    }

    it('negative control: the same value offers junie once a table has the row and its presence id', () => {
        expect(offerOf('junie', [BETA], undefined, FAKE_TABLE)).toEqual({ assistant: 'junie', handover: 'copyFor', place: 'Junie in AI Chat' });
        expect(offerOf('junie', [EXT_A, EXT_B], undefined, FAKE_TABLE)).toBeUndefined();
    });

    it('VS Code offers are unchanged for the two known values', () => {
        expect(offerOf('copilot', [EXT_A])).toEqual({ assistant: 'copilot' });
        expect(offerOf('claudeCode', [EXT_B])).toEqual({ assistant: 'claudeCode' });
        expect(offerOf('copilot', [EXT_B])).toBeUndefined();
    });
});

describe('0035 T-002 / AC-004 (core): a fake two-row table offers by its own presence ids', () => {
    it('the values of the table are offered while their id is present and nothing else is', () => {
        expect(offerOf('claudeCode', [ALPHA], undefined, FAKE_TABLE)).toEqual({ assistant: 'claudeCode', targets: ['current', 'new'] });
        expect(offerOf('claudeCode', [EXT_B], undefined, FAKE_TABLE)).toBeUndefined();
        expect(offerOf('copilot', [EXT_A, ALPHA, BETA], undefined, FAKE_TABLE)).toBeUndefined();
        expect(offerOf('none', [ALPHA, BETA], undefined, FAKE_TABLE)).toBeUndefined();
    });

    it('the presence port reads only the ids of the table rows', () => {
        const host = createFakeAssistantHost();
        [EXT_A, EXT_B, ALPHA, BETA].forEach((id) => host.install(id));
        expect(extensionPresence(host, FAKE_TABLE).read()).toEqual([ALPHA, BETA]);
        expect(extensionPresence(host).read()).toEqual([EXT_A, EXT_B]);
    });

    it('the offer carries the row targets and the row attaching flag; the send view lists those targets', () => {
        const offer = offerOf('claudeCode', [ALPHA], undefined, FAKE_TABLE);
        expect(offer?.targets).toEqual(['current', 'new']);
        expect(plainSendViewOf(offer)).toEqual({ assistant: 'claudeCode', target: 'new', targets: ['current', 'new'] });
        const junie = offerOf('junie', [BETA], undefined, FAKE_TABLE);
        expect(junie === undefined ? undefined : attachesOf(junie, FAKE_TABLE)).toBe(false);
        expect(attachesOf({ assistant: 'claudeCode' }, FAKE_TABLE)).toBe(true);
    });

    it('the send view of a VS Code offer is unchanged', () => {
        expect(plainSendViewOf({ assistant: 'copilot' })).toEqual({ assistant: 'copilot', target: 'new', targets: ['new', 'current'] });
        expect(plainSendViewOf({ assistant: 'claudeCode' })).toEqual({ assistant: 'claudeCode', target: 'new', targets: ['new'] });
        expect(plainSendViewOf({ assistant: 'junie' })).toEqual({ assistant: 'junie', target: 'new', targets: ['new'] });
        expect(plainSendViewOf(undefined)).toBeUndefined();
    });

    it('the wiring takes the table: its offer follows the table presence ids', () => {
        const host = createFakeAssistantHost(['alpha.open']);
        host.install(ALPHA);
        const setting: SettingPort = { read: () => 'claudeCode', onDidChange: () => ({ dispose: () => undefined }) };
        const wiring = createAssistantWiring({
            setting,
            host,
            clipboard: { writeText: async () => undefined },
            ui: { warn: () => undefined },
            output: { appendBlock: () => undefined },
            clock: createSetupClock(),
            platform: 'win32',
            source: createFakeSource(),
            specs: createMemorySpecSource(),
            table: FAKE_TABLE,
        });
        expect(wiring.offer.read()).toEqual({ assistant: 'claudeCode', targets: ['current', 'new'] });
    });

    it('the wiring without a table keeps the VS Code rows', () => {
        const host = createFakeAssistantHost();
        host.install(ALPHA);
        const setting: SettingPort = { read: () => 'claudeCode', onDidChange: () => ({ dispose: () => undefined }) };
        const wiring = createAssistantWiring({
            setting,
            host,
            clipboard: { writeText: async () => undefined },
            ui: { warn: () => undefined },
            output: { appendBlock: () => undefined },
            clock: createSetupClock(),
            platform: 'win32',
            source: createFakeSource(),
            specs: createMemorySpecSource(),
        });
        expect(wiring.offer.read()).toBeUndefined();
    });
});

describe('0035 T-002: the send budget comes from the row', () => {
    function sender(table: AssistantTable | undefined, assistant: AssistantId, extension: string) {
        const host = createFakeAssistantHost(['alpha.open', 'claude-vscode.editor.open']);
        host.install(extension);
        host.never.add(assistant === 'claudeCode' && table !== undefined ? 'alpha.open' : 'claude-vscode.editor.open');
        const clock = createSetupClock();
        const written: string[] = [];
        const blocks: string[][] = [];
        const send = createSend({
            host,
            clipboard: { writeText: async (text) => void written.push(text) },
            ui: { warn: () => undefined },
            output: { appendBlock: (lines) => void blocks.push([...lines]) },
            clock,
            platform: 'win32',
            chosen: { read: () => assistant },
            ...(table === undefined ? {} : { table }),
        });
        return { send, clock, written, blocks };
    }

    async function settle(): Promise<void> {
        await new Promise((resolve) => setImmediate(resolve));
    }

    it('a row with timeoutMs 20000 fails at 20000 ms, not at 5000, with that number in the cause', async () => {
        const w = sender(FAKE_TABLE, 'claudeCode', ALPHA);
        let outcome: unknown;
        void w.send.send({ assistant: 'claudeCode', target: 'new', line: LINE }).then((result) => (outcome = result));
        await settle();
        w.clock.advance(5000);
        await settle();
        expect(outcome).toBeUndefined();
        w.clock.advance(14999);
        await settle();
        expect(outcome).toBeUndefined();
        w.clock.advance(1);
        await settle();
        expect(outcome).toEqual({ outcome: 'copied', text: 'Copied to the clipboard.' });
        expect(w.written).toEqual([LINE]);
        expect(w.blocks).toEqual([['Send to Claude Code failed (no result within 20000 ms); the prompt was copied instead.']]);
    });

    it('a row without timeoutMs keeps 5000 ms (the VS Code table)', async () => {
        const w = sender(undefined, 'claudeCode', EXT_B);
        let outcome: unknown;
        void w.send.send({ assistant: 'claudeCode', target: 'new', line: LINE }).then((result) => (outcome = result));
        await settle();
        w.clock.advance(4999);
        await settle();
        expect(outcome).toBeUndefined();
        w.clock.advance(1);
        await settle();
        expect(outcome).toEqual({ outcome: 'copied', text: 'Copied to the clipboard.' });
        expect(w.blocks).toEqual([['Send to Claude Code failed (no result within 5000 ms); the prompt was copied instead.']]);
    });

    it('an assistant without a row in the table is copied silently, as a value that is not offered', async () => {
        const w = sender(FAKE_TABLE, 'copilot', EXT_A);
        const result = await w.send.send({ assistant: 'copilot', target: 'new', line: LINE });
        expect(result.outcome).toBe('copied');
        expect(w.written).toEqual([LINE]);
        expect(w.blocks).toEqual([]);
    });
});
