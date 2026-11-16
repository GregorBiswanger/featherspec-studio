import { useContext, useSyncExternalStore } from 'react';
import type { BoardView, MoveResult, SortKey } from '../../shared/protocol/board';
import type { BoardFilter, BoardState } from '../../shared/protocol/boardFilter';
import type { DetailView } from '../../shared/protocol/detail';
import type { ClientSnapshot } from '../client';
import { ClientContext } from '../shell';

export interface BoardApi {
    board: BoardView | undefined;
    detail: DetailView | undefined;
    move: MoveResult;
    fileResult: { key: string; text: string } | undefined;
    setFilter(filter: BoardFilter): void;
    setSort(sort: SortKey): void;
    clearFilters(): void;
    focusCard(key: string | null): void;
    requestMove(key: string, target: BoardState): void;
    openFile(key: string, line?: number): void;
    dismissMove(): void;
}

export function useBoard(): BoardApi {
    const client = useContext(ClientContext);
    if (client === undefined) {
        throw new Error('useBoard needs a ShellProvider');
    }
    const snapshot: ClientSnapshot = useSyncExternalStore(client.subscribe, client.getSnapshot);
    return {
        board: snapshot.board,
        detail: snapshot.detail,
        move: snapshot.move,
        fileResult: snapshot.fileResult,
        setFilter: client.setBoardFilter,
        setSort: client.setBoardSort,
        clearFilters: client.clearBoardFilters,
        focusCard: client.focusCard,
        requestMove: client.requestMove,
        openFile: client.openFile,
        dismissMove: client.dismissMove,
    };
}
