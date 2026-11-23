import { describe, expect, it } from 'vitest';
import type { AssistantId, SendRequest } from '../../shared/protocol/assistant';
import { isSendView } from '../../shared/protocol/assistant';
import { copyForDoneText, copyForMissingOutputText, copyForOpenText, copyForWithoutText, COPY_FOR_PLACES, JUNIE_WINDOW_PLACE } from '../../shared/protocol/assistantTexts';
import { createBoardRequests } from '../board/boardRequests';
import type { OpenFile } from '../board/openFile';
import type { ClipboardPort } from '../ports/board';
import { createSetupClock } from '../setup/testing/setupClock';
import type { AssistantTable } from './assistants';
import type { AttachmentTarget } from './attachment';
import { offerOf } from './offer';
import { copilotCopyText, JUNIE_FORM, junieCopyText } from './references';
import { createSend, SEND_TIMEOUT_MS } from './send';
import { plainSendViewOf } from './sendView';
import { createFakeAssistantHost } from './testing/fakeAssistantHost';

const LINE = '/sdd-plan .specs/active/0001-tip-splitter.md';
const SPEC = '.specs/active/0001-tip-splitter.md';
const PLAN = '.specs/active/0001-tip-splitter.plan.md';
const GH_ID = 'com.github.copilot';
const JUNIE_ID = 'junie';
const OPEN_CHAT = 'featherspec.openChat';

function table(place?: () => string): AssistantTable {
    return {
        'copilot': { extensionId: GH_ID, handover: 'copyFor', attachesSpec: true, targets: ['new'], text: copilotCopyText, callsFor: () => [] },
        junie: { extensionId: JUNIE_ID, handover: 'copyFor', attachesSpec: true, targets: ['new'], text: (line, paths) => junieCopyText(line, paths, JUNIE_FORM), ...(place === undefined ? {} : { place }), callsFor: () => [] },
        claudeCode: { extensionId: 'org.jetbrains.plugins.terminal', handover: 'send', attachesSpec: true, targets: ['current', 'new'], callsFor: (_target, line) => [{ command: 'featherspec.claudeTerminal', args: [{ target: 'new', text: line }] }] },
    };
}

interface Options {
    chosen?: AssistantId | undefined;
    platform?: string;
    opens?: 'opened' | 'notFound' | 'throws' | 'hangs';
    clipboardFails?: boolean;
    missing?: readonly string[];
    place?: () => string;
    handOver?: { begin(line: string): { commit(): Promise<void> } };
}

function world(options: Options = {}) {
    const events: string[] = [];
    const written: string[] = [];
    const warned: string[] = [];
    const blocks: string[][] = [];
    const clock = createSetupClock();
    const host = createFakeAssistantHost();
    host.execute = async (command, args) => {
        events.push(`execute ${command} ${JSON.stringify(args)}`);
        host.calls.push({ command, args });
        const mode = options.opens ?? 'opened';
        if (mode === 'throws') {
            throw new Error('no window');
        }
        if (mode === 'hangs') {
            return new Promise<never>(() => undefined);
        }
        return mode;
    };
    const clipboard: ClipboardPort = {
        async writeText(text) {
            if (options.clipboardFails === true) {
                throw new Error('no clipboard');
            }
            events.push('write');
            written.push(text);
        },
    };
    const missing = options.missing ?? [];
    const send = createSend({
        table: table(options.place),
        host,
        clipboard,
        ui: { warn: (text) => void warned.push(text) },
        output: { appendBlock: (lines) => void blocks.push([...lines]) },
        clock,
        platform: options.platform ?? 'win32',
        chosen: { read: () => ('chosen' in options ? options.chosen : 'copilot') },
        attachment: async (path): Promise<AttachmentTarget | undefined> => (missing.includes(path) ? undefined : { uri: `uri:${path}`, path }),
        ...(options.handOver === undefined ? {} : { handOver: options.handOver }),
    });
    const settle = async (): Promise<void> => {
        await new Promise((resolve) => setImmediate(resolve));
    };
    return { host, events, written, warned, blocks, clock, settle, send: (request: SendRequest) => send.send(request) };
}

const GH_REQUEST: SendRequest = { assistant: 'copilot', target: 'new', line: LINE, attach: SPEC };

describe('0035 T-005 / AC-016: Copy for Copilot writes the references text, then opens the chat', () => {
    it('AC-016 the clipboard holds exactly copilotCopyText(line, paths), written before the open call', async () => {
        const w = world();
        const result = await w.send({ ...GH_REQUEST, attachAlso: [PLAN] });
        expect(w.written).toEqual([`${LINE} #file:${SPEC} #file:${PLAN}`]);
        expect(w.events).toEqual(['write', `execute ${OPEN_CHAT} ["copilot"]`]);
        expect(result).toEqual({ outcome: 'copied', text: 'Copied. Paste it into GitHub Copilot Chat with Ctrl+V.' });
    });

    it('AC-016 nothing else is called, typed, warned or logged', async () => {
        const w = world();
        await w.send(GH_REQUEST);
        expect(w.host.calls).toEqual([{ command: OPEN_CHAT, args: ['copilot'] }]);
        expect(w.host.activated).toEqual([]);
        expect(w.warned).toEqual([]);
        expect(w.blocks).toEqual([]);
    });

    it('AC-016 without an attachment the clipboard holds the line alone', async () => {
        const w = world();
        const result = await w.send({ assistant: 'copilot', target: 'new', line: LINE });
        expect(w.written).toEqual([LINE]);
        expect(result.outcome).toBe('copied');
    });

    it('AC-016 the paste key is Cmd+V on macOS', async () => {
        const w = world({ platform: 'darwin' });
        const result = await w.send(GH_REQUEST);
        expect(result.text).toBe('Copied. Paste it into GitHub Copilot Chat with Cmd+V.');
    });

    it('AC-016 a path with whitespace is not referenced, the others are', async () => {
        const w = world();
        await w.send({ ...GH_REQUEST, attach: '.specs/active/0002 odd.md', attachAlso: [PLAN] });
        expect(w.written).toEqual([`${LINE} #file:${PLAN}`]);
    });
});

describe('0035 T-005 / AC-017: Copy for Junie writes the Junie text and names its place', () => {
    const JUNIE_REQUEST: SendRequest = { assistant: 'junie', target: 'new', line: LINE, attach: SPEC, attachAlso: [PLAN] };

    it('AC-017 the clipboard holds junieCopyText with the configured form, and AI Chat opens', async () => {
        const w = world({ chosen: 'junie' });
        const result = await w.send(JUNIE_REQUEST);
        expect(w.written).toEqual([`${LINE} @file:${SPEC} @file:${PLAN}`]);
        expect(w.events).toEqual(['write', `execute ${OPEN_CHAT} ["junie"]`]);
        expect(result).toEqual({ outcome: 'copied', text: 'Copied. In AI Chat, choose Junie and paste it with Ctrl+V.' });
    });

    it('AC-017 the place follows the row: the Junie tool window without AI Chat', async () => {
        const w = world({ chosen: 'junie', place: () => JUNIE_WINDOW_PLACE });
        const result = await w.send(JUNIE_REQUEST);
        expect(result.text).toBe('Copied. Paste it into the Junie tool window with Ctrl+V.');
    });
});

describe('0035 T-005 / AC-019: the window is missing, the open fails, the clipboard fails', () => {
    it('AC-019 a window that is not found: the clipboard still holds the text, the text says to open and paste', async () => {
        const w = world({ opens: 'notFound' });
        const result = await w.send(GH_REQUEST);
        expect(w.written).toEqual([`${LINE} #file:${SPEC}`]);
        expect(result).toEqual({ outcome: 'copied', text: 'Copied. Open GitHub Copilot Chat and paste it with Ctrl+V.' });
        expect(w.warned).toEqual([]);
    });

    it('AC-019 an open call that throws acts as not found', async () => {
        const w = world({ opens: 'throws' });
        const result = await w.send(GH_REQUEST);
        expect(result).toEqual({ outcome: 'copied', text: 'Copied. Open GitHub Copilot Chat and paste it with Ctrl+V.' });
    });

    it('AC-019 an open call without an answer acts as not found after the 5000 ms budget', async () => {
        const w = world({ opens: 'hangs' });
        let result: unknown;
        void w.send(GH_REQUEST).then((value) => (result = value));
        await w.settle();
        w.clock.advance(SEND_TIMEOUT_MS - 1);
        await w.settle();
        expect(result).toBeUndefined();
        w.clock.advance(1);
        await w.settle();
        expect(result).toEqual({ outcome: 'copied', text: 'Copied. Open GitHub Copilot Chat and paste it with Ctrl+V.' });
    });

    it('AC-019 a failing clipboard write ends in copyFailed and opens nothing', async () => {
        const w = world({ clipboardFails: true });
        const result = await w.send(GH_REQUEST);
        expect(result).toEqual({ outcome: 'copyFailed', text: 'Could not copy to the clipboard.' });
        expect(w.host.calls).toEqual([]);
        expect(w.written).toEqual([]);
    });
});

describe('0035 T-005 / AC-010: a file that is gone is left out of the text, named, and logged without the prompt', () => {
    it('AC-010 one missing file: the others stay, the result names it, one log line without the prompt', async () => {
        const w = world({ missing: [PLAN] });
        const result = await w.send({ ...GH_REQUEST, attachAlso: [PLAN] });
        expect(w.written).toEqual([`${LINE} #file:${SPEC}`]);
        expect(result).toEqual({ outcome: 'copied', text: 'Copied without 0001-tip-splitter.plan.md: the file was not found. Paste it into GitHub Copilot Chat with Ctrl+V.' });
        expect(w.blocks).toEqual([[`Copy for Copilot: ${PLAN} was not found, so its path was left out.`]]);
        expect(JSON.stringify(w.blocks)).not.toContain(LINE);
    });

    it('AC-010 two missing files: both are named and each gets a log line; the line alone is copied', async () => {
        const w = world({ missing: [SPEC, PLAN] });
        const result = await w.send({ ...GH_REQUEST, attachAlso: [PLAN] });
        expect(w.written).toEqual([LINE]);
        expect(result.text).toBe('Copied without 0001-tip-splitter.md, 0001-tip-splitter.plan.md: the file was not found. Paste it into GitHub Copilot Chat with Ctrl+V.');
        expect(w.blocks).toEqual([[`Copy for Copilot: ${SPEC} was not found, so its path was left out.`, `Copy for Copilot: ${PLAN} was not found, so its path was left out.`]]);
    });

    it('AC-010 a missing file and a missing window: the text names the file and says to open the window', async () => {
        const w = world({ missing: [PLAN], opens: 'notFound' });
        const result = await w.send({ ...GH_REQUEST, attachAlso: [PLAN] });
        expect(result.text).toBe('Copied without 0001-tip-splitter.plan.md: the file was not found. Open GitHub Copilot Chat and paste it with Ctrl+V.');
    });
});

describe('0035 T-005 / AC-020: the menu path copies the line alone and opens nothing', () => {
    it('AC-020 copyText writes the line only and calls no host command', async () => {
        const written: string[] = [];
        const w = world();
        const clipboard: ClipboardPort = { writeText: async (text) => void written.push(text) };
        const board = { setSort: () => undefined, setDone: () => undefined, clearFilters: () => undefined };
        const requests = createBoardRequests({ board, openFile: undefined as unknown as OpenFile, clipboard, send: (request: SendRequest) => w.send(request) });
        await requests.handlers.copyText({ text: LINE });
        expect(written).toEqual([LINE]);
        expect(w.host.calls).toEqual([]);
    });
});

describe('0035 T-005: serialisation, the setting and the hand-over record', () => {
    it('two Copy fors run one after the other: the first window opens before the second text is written', async () => {
        const w = world();
        await Promise.all([w.send(GH_REQUEST), w.send({ ...GH_REQUEST, line: '/sdd-clarify x' })]);
        expect(w.events).toEqual(['write', `execute ${OPEN_CHAT} ["copilot"]`, 'write', `execute ${OPEN_CHAT} ["copilot"]`]);
    });

    it('a row whose value is not chosen copies the line alone and opens nothing', async () => {
        const w = world({ chosen: 'junie' });
        const result = await w.send(GH_REQUEST);
        expect(w.written).toEqual([LINE]);
        expect(w.host.calls).toEqual([]);
        expect(result.outcome).toBe('copied');
    });

    it('the hand-over record commits after a copied result and not after copyFailed', async () => {
        const commits: string[] = [];
        const handOver = { begin: (line: string) => ({ commit: async () => void commits.push(line) }) };
        await world({ handOver }).send(GH_REQUEST);
        await world({ handOver, clipboardFails: true }).send(GH_REQUEST);
        expect(commits).toEqual([LINE]);
    });

    it('negative control: a send row writes no clipboard text and never calls the open-chat command', async () => {
        const w = world({ chosen: 'claudeCode' });
        w.host.available.push('featherspec.claudeTerminal');
        w.host.install('org.jetbrains.plugins.terminal');
        await w.send({ assistant: 'claudeCode', target: 'new', line: LINE });
        expect(w.written).toEqual([]);
        expect(w.host.calls.map((call) => call.command)).toEqual(['featherspec.claudeTerminal']);
    });
});

describe('0035 T-005: the offer and the view carry the Copy for handover', () => {
    it('the offer of a copyFor row names its handover and place; the view carries handover copyFor with the one target', () => {
        const offer = offerOf('copilot', [GH_ID], undefined, table());
        expect(offer).toEqual({ assistant: 'copilot', handover: 'copyFor', place: 'GitHub Copilot Chat', targets: ['new'] });
        expect(plainSendViewOf(offer)).toEqual({ assistant: 'copilot', handover: 'copyFor', target: 'new', targets: ['new'] });
        expect(offerOf('junie', [JUNIE_ID], undefined, table())).toEqual({ assistant: 'junie', attaches: true, handover: 'copyFor', place: 'Junie in AI Chat' });
        expect(offerOf('junie', [JUNIE_ID], undefined, table(() => JUNIE_WINDOW_PLACE))).toEqual({ assistant: 'junie', attaches: true, handover: 'copyFor', place: 'the Junie tool window' });
    });

    it('a send row offers without handover and place, as before', () => {
        expect(offerOf('claudeCode', ['org.jetbrains.plugins.terminal'], undefined, table())).toEqual({ assistant: 'claudeCode', targets: ['current', 'new'] });
    });

    it('isSendView accepts handover copyFor with the one target and refuses any other value or targets', () => {
        const view = { assistant: 'copilot', handover: 'copyFor', target: 'new', targets: ['new'] };
        expect(isSendView(view)).toBe(true);
        expect(isSendView({ ...view, assistant: 'junie' })).toBe(true);
        expect(isSendView({ ...view, handover: 'send' })).toBe(false);
        expect(isSendView({ ...view, handover: 'other' })).toBe(false);
        expect(isSendView({ ...view, targets: ['new', 'current'] })).toBe(false);
        expect(isSendView({ ...view, extra: 1 })).toBe(false);
        expect(isSendView({ assistant: 'copilot', target: 'new', targets: ['new'] })).toBe(false);
        expect(isSendView({ assistant: 'copilot', target: 'new', targets: ['new', 'current'] })).toBe(true);
    });
});

describe('0035 T-005 / AC-021 (part): the texts of section 7, literally', () => {
    it('the places', () => {
        expect(COPY_FOR_PLACES).toEqual({ 'copilot': 'GitHub Copilot Chat', junie: 'Junie in AI Chat' });
        expect(JUNIE_WINDOW_PLACE).toBe('the Junie tool window');
    });

    it('done, not found, left out', () => {
        expect(copyForDoneText('GitHub Copilot Chat', 'Ctrl+V')).toBe('Copied. Paste it into GitHub Copilot Chat with Ctrl+V.');
        expect(copyForOpenText('Junie in AI Chat', 'Cmd+V')).toBe('Copied. Open Junie in AI Chat and paste it with Cmd+V.');
        expect(copyForWithoutText('a.md', 'the Junie tool window', 'Ctrl+V', true)).toBe('Copied without a.md: the file was not found. Paste it into the Junie tool window with Ctrl+V.');
        expect(copyForWithoutText('a.md', 'the Junie tool window', 'Ctrl+V', false)).toBe('Copied without a.md: the file was not found. Open the Junie tool window and paste it with Ctrl+V.');
        expect(copyForMissingOutputText('Junie', '.specs/a.md')).toBe('Copy for Junie: .specs/a.md was not found, so its path was left out.');
    });
});
