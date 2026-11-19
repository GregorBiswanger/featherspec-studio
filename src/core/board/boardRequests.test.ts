import { describe, expect, it } from 'vitest';
import { COPIED_TEXT, COPY_FAILED_TEXT } from '../../shared/protocol/nextStepTexts';
import { fileNotFoundText } from '../../shared/protocol/texts';
import { createBoardRequests } from './boardRequests';
import type { OpenFileResult } from './openFile';
import type { SendOutcomeView, SendRequest } from '../../shared/protocol/assistant';

function setup(overrides: { open?: OpenFileResult; copyFails?: boolean; send?: SendOutcomeView } = {}) {
    const calls: unknown[][] = [];
    const requests = createBoardRequests({
        board: {
            setSort: (sort) => void calls.push(['setSort', sort]),
            setDone: (expanded) => void calls.push(['setDone', expanded]),
            clearFilters: () => void calls.push(['clearFilters']),
        },
        clipboard: {
            async writeText(text: string) {
                calls.push(['writeText', text]);
                if (overrides.copyFails === true) {
                    throw new Error('clipboard denied');
                }
            },
        },
        send: async (request: SendRequest) => {
            calls.push(['send', request]);
            return overrides.send ?? { outcome: 'opened', text: 'The prompt is in Copilot\'s chat. Check it, then send it there.' };
        },
        openFile: {
            async open(key, line) {
                calls.push(line === undefined ? ['open', key] : ['open', key, line]);
                return overrides.open ?? { kind: 'opened' };
            },
        },
    });
    const files: unknown[] = [];
    requests.onDidOpenFileResult((result) => files.push(result));
    const copies: unknown[] = [];
    requests.onDidCopyResult((result) => copies.push(result));
    const sends: unknown[] = [];
    requests.onDidSendResult((result) => sends.push(result));
    return { requests, calls, files, copies, sends };
}

describe('board requests', () => {
    it('AC-017, AC-013: sort and clear go to the board state, and the board has no request that sets a filter (P-8)', async () => {
        const { requests, calls } = setup();
        expect(Object.keys(requests.handlers)).not.toContain('boardSetFilter');
        await requests.handlers.boardSetSort({ sort: 'title' });
        await requests.handlers.boardSetDone({ expanded: true });
        await requests.handlers.boardClearFilters({});
        expect(calls).toEqual([['setSort', 'title'], ['setDone', true], ['clearFilters']]);
    });

    it('AC-010: an open request passes the line, and says nothing when the file opened', async () => {
        const { requests, calls, files } = setup();
        await requests.handlers.openFile({ key: 'k', line: 4 });
        await requests.handlers.openFile({ key: 'k' });
        expect(calls).toEqual([['open', 'k', 4], ['open', 'k']]);
        expect(files).toEqual([]);
    });

    it('AC-010: a file that is gone is reported with its key, a refused key is not reported', async () => {
        const gone = setup({ open: { kind: 'not-found', text: fileNotFoundText('k') } });
        await gone.requests.handlers.openFile({ key: 'k' });
        expect(gone.files).toEqual([{ key: 'k', text: fileNotFoundText('k') }]);
        const refused = setup({ open: { kind: 'refused' } });
        await refused.requests.handlers.openFile({ key: '../x' });
        expect(refused.files).toEqual([]);
    });

    it('a listener that throws does not break the request, and a disposed listener hears nothing', async () => {
        const { requests, copies } = setup();
        requests.onDidCopyResult(() => {
            throw new Error('boom');
        });
        const extra: unknown[] = [];
        requests.onDidCopyResult((result) => extra.push(result)).dispose();
        await requests.handlers.copyText({ text: 'x' });
        expect(copies).toHaveLength(1);
        expect(extra).toEqual([]);
    });
});

describe('0015 copy request', () => {
    it('AC-005: copyText writes exactly the text to the clipboard and reports it', async () => {
        const { requests, calls, copies } = setup();
        await requests.handlers.copyText({ text: 'Start T-001 of .specs/backlog/0007-x.plan.md' });
        expect(calls).toEqual([['writeText', 'Start T-001 of .specs/backlog/0007-x.plan.md']]);
        expect(copies).toEqual([{ ok: true, text: COPIED_TEXT }]);
        expect(COPIED_TEXT).toBe('Copied to the clipboard.');
    });

    it('AC-009: a failing clipboard gives the failure text and changes nothing else', async () => {
        const { requests, calls, copies, files } = setup({ copyFails: true });
        await requests.handlers.copyText({ text: '/sdd-plan x' });
        expect(copies).toEqual([{ ok: false, text: COPY_FAILED_TEXT }]);
        expect(COPY_FAILED_TEXT).toBe('Could not copy to the clipboard.');
        expect(calls).toEqual([['writeText', '/sdd-plan x']]);
        expect(files).toEqual([]);
    });

    it('AC-008: the handler has no trust or writer dependency, so it behaves alike in Restricted Mode and in a reader window', async () => {
        const { requests, copies } = setup();
        await requests.handlers.copyText({ text: 'a' });
        await requests.handlers.copyText({ text: 'b' });
        expect(copies).toEqual([{ ok: true, text: COPIED_TEXT }, { ok: true, text: COPIED_TEXT }]);
    });
});

describe('0024 AC-005: the sendPrompt request', () => {
    it('hands the request to Send and emits its result as sendResult, once, and no copy result', async () => {
        const { requests, calls, sends, copies } = setup();
        await requests.handlers.sendPrompt({ assistant: 'copilot', target: 'current', line: 'Implement T-003 of p', token: 'k3x9-1' });
        expect(calls).toEqual([['send', { assistant: 'copilot', target: 'current', line: 'Implement T-003 of p' }]]);
        expect(sends).toEqual([{ outcome: 'opened', text: "The prompt is in Copilot's chat. Check it, then send it there.", token: 'k3x9-1' }]);
        expect(copies).toEqual([]);
    });

    it('a copied or failed result is emitted as it is; a disposed listener hears nothing', async () => {
        const copied = setup({ send: { outcome: 'copied', text: COPIED_TEXT } });
        await copied.requests.handlers.sendPrompt({ assistant: 'claudeCode', target: 'new', line: 'x', token: 'a-1' });
        expect(copied.sends).toEqual([{ outcome: 'copied', text: COPIED_TEXT, token: 'a-1' }]);
        const failed = setup({ send: { outcome: 'copyFailed', text: COPY_FAILED_TEXT } });
        await failed.requests.handlers.sendPrompt({ assistant: 'claudeCode', target: 'new', line: 'x', token: 'a-1' });
        expect(failed.sends).toEqual([{ outcome: 'copyFailed', text: COPY_FAILED_TEXT, token: 'a-1' }]);
        const late: unknown[] = [];
        const subscription = failed.requests.onDidSendResult((result) => late.push(result));
        subscription.dispose();
        await failed.requests.handlers.sendPrompt({ assistant: 'claudeCode', target: 'new', line: 'x', token: 'a-1' });
        expect(late).toEqual([]);
    });
});

