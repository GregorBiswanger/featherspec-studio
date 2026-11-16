import { describe, expect, it } from 'vitest';
import type { MoveResult } from '../../shared/protocol/board';
import type { BoardState } from '../../shared/protocol/boardFilter';
import { fileNotFoundText } from '../../shared/protocol/texts';
import { createBoardRequests } from './boardRequests';
import type { OpenFileResult } from './openFile';

function setup(overrides: { move?: MoveResult; open?: OpenFileResult } = {}) {
    const calls: unknown[][] = [];
    const requests = createBoardRequests({
        board: {
            setFilter: (filter) => void calls.push(['setFilter', filter]),
            setSort: (sort) => void calls.push(['setSort', sort]),
            clearFilters: () => void calls.push(['clearFilters']),
            setFocus: (key) => void calls.push(['setFocus', key]),
        },
        moves: {
            async requestMove(key: string, target: BoardState) {
                calls.push(['requestMove', key, target]);
                return overrides.move ?? { kind: 'handedOff', number: '0001' };
            },
        },
        openFile: {
            async open(key, line) {
                calls.push(line === undefined ? ['open', key] : ['open', key, line]);
                return overrides.open ?? { kind: 'opened' };
            },
        },
    });
    const moves: MoveResult[] = [];
    const files: unknown[] = [];
    requests.onDidMoveResult((result) => moves.push(result));
    requests.onDidOpenFileResult((result) => files.push(result));
    return { requests, calls, moves, files };
}

describe('board requests', () => {
    it('AC-011, AC-012, AC-013: filter, sort, clear and focus go to the board state', async () => {
        const { requests, calls } = setup();
        await requests.handlers.boardSetFilter({ filter: { states: ['Active'] } });
        await requests.handlers.boardSetSort({ sort: 'title' });
        await requests.handlers.boardClearFilters({});
        await requests.handlers.boardFocus({ key: 'k' });
        expect(calls).toEqual([['setFilter', { states: ['Active'] }], ['setSort', 'title'], ['clearFilters'], ['setFocus', 'k']]);
    });

    it('AC-014: a move request is judged by the moves module and the result is announced', async () => {
        const { requests, calls, moves } = setup({ move: { kind: 'refused', text: 'No.' } });
        await requests.handlers.moveRequest({ key: 'k', target: 'Active' });
        expect(calls).toEqual([['requestMove', 'k', 'Active']]);
        expect(moves).toEqual([{ kind: 'refused', text: 'No.' }]);
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
        const { requests, moves } = setup();
        requests.onDidMoveResult(() => {
            throw new Error('boom');
        });
        const extra: MoveResult[] = [];
        requests.onDidMoveResult((result) => extra.push(result)).dispose();
        await requests.handlers.moveRequest({ key: 'k', target: 'Done' });
        expect(moves).toHaveLength(1);
        expect(extra).toEqual([]);
    });
});
