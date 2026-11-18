import type { OpenFileResultPayload } from '../../shared/protocol/detail';
import type { BoardRequestType, CopyResultEventPayload } from '../../shared/protocol/messages';
import type { ClipboardPort } from '../ports/board';
import type { Disposable } from '../ports/host';
import type { RequestHandlers } from '../shell/messageRouter';
import type { BoardService } from './boardService';
import { copyLine } from './copyLine';
import type { OpenFile } from './openFile';

export interface BoardRequestsDeps {
    board: Pick<BoardService, 'setSort' | 'setDone' | 'clearFilters'>;
    openFile: OpenFile;
    clipboard: ClipboardPort;
}

export interface BoardRequests {
    handlers: Pick<RequestHandlers, BoardRequestType>;
    onDidOpenFileResult(listener: (result: OpenFileResultPayload) => void): Disposable;
    onDidCopyResult(listener: (result: CopyResultEventPayload) => void): Disposable;
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
    const fileResults = notifier<OpenFileResultPayload>();
    const copyResults = notifier<CopyResultEventPayload>();
    return {
        handlers: {
            boardSetDone: async (payload) => deps.board.setDone(payload.expanded),
            boardSetSort: async (payload) => deps.board.setSort(payload.sort),
            boardClearFilters: async () => deps.board.clearFilters(),
            copyText: async (payload) => {
                copyResults.emit(await copyLine(deps.clipboard, payload.text));
            },
            openFile: async (payload) => {
                const result = await (payload.line === undefined ? deps.openFile.open(payload.key) : deps.openFile.open(payload.key, payload.line));
                if (result.kind === 'not-found') {
                    fileResults.emit({ key: payload.key, text: result.text });
                }
            },
        },
        onDidOpenFileResult: fileResults.add,
        onDidCopyResult: copyResults.add,
    };
}
