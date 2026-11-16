import type { MoveResult } from '../../shared/protocol/board';
import type { OpenFileResultPayload } from '../../shared/protocol/detail';
import type { BoardRequestType } from '../../shared/protocol/messages';
import type { Disposable } from '../ports/host';
import type { RequestHandlers } from '../shell/messageRouter';
import type { BoardService } from './boardService';
import type { Moves } from './moves';
import type { OpenFile } from './openFile';

export interface BoardRequestsDeps {
    board: Pick<BoardService, 'setFilter' | 'setSort' | 'clearFilters' | 'setFocus'>;
    moves: Pick<Moves, 'requestMove'>;
    openFile: OpenFile;
}

export interface BoardRequests {
    handlers: Pick<RequestHandlers, BoardRequestType>;
    onDidMoveResult(listener: (result: MoveResult) => void): Disposable;
    onDidOpenFileResult(listener: (result: OpenFileResultPayload) => void): Disposable;
}

function notifier<T>(): { add(listener: (value: T) => void): Disposable; emit(value: T): void } {
    const listeners = new Set<(value: T) => void>();
    return {
        add(listener) {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
        emit(value) {
            [...listeners].forEach((listener) => {
                try {
                    listener(value);
                } catch {
                    return;
                }
            });
        },
    };
}

export function createBoardRequests(deps: BoardRequestsDeps): BoardRequests {
    const moveResults = notifier<MoveResult>();
    const fileResults = notifier<OpenFileResultPayload>();
    return {
        handlers: {
            boardSetFilter: async (payload) => deps.board.setFilter(payload.filter),
            boardSetSort: async (payload) => deps.board.setSort(payload.sort),
            boardClearFilters: async () => deps.board.clearFilters(),
            boardFocus: async (payload) => deps.board.setFocus(payload.key),
            moveRequest: async (payload) => {
                moveResults.emit(await deps.moves.requestMove(payload.key, payload.target));
            },
            openFile: async (payload) => {
                const result = await (payload.line === undefined ? deps.openFile.open(payload.key) : deps.openFile.open(payload.key, payload.line));
                if (result.kind === 'not-found') {
                    fileResults.emit({ key: payload.key, text: result.text });
                }
            },
        },
        onDidMoveResult: moveResults.add,
        onDidOpenFileResult: fileResults.add,
    };
}
