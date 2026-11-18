import { describe, expect, it } from 'vitest';
import { COPIED_TEXT, COPY_FAILED_TEXT } from '../../shared/protocol/nextStepTexts';
import { fileNotFoundText } from '../../shared/protocol/texts';
import { createBoardRequests } from './boardRequests';
import type { OpenFileResult } from './openFile';

function setup(overrides: { open?: OpenFileResult; copyFails?: boolean } = {}) {
    const calls: unknown[][] = [];
    const requests = createBoardRequests({
        board: {
            setSort: (sort) => void calls.push(['setSort', sort]),
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
    return { requests, calls, files, copies };
}

describe('board requests', () => {
    it('AC-017, AC-013: sort and clear go to the board state, and the board has no request that sets a filter (P-8)', async () => {
        const { requests, calls } = setup();
        expect(Object.keys(requests.handlers)).not.toContain('boardSetFilter');
        await requests.handlers.boardSetSort({ sort: 'title' });
        await requests.handlers.boardClearFilters({});
        expect(calls).toEqual([['setSort', 'title'], ['clearFilters']]);
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
