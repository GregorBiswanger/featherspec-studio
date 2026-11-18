import { useContext, useSyncExternalStore } from 'react';
import type { BoardView, SortKey } from '../../shared/protocol/board';
import type { BoardFilter } from '../../shared/protocol/boardFilter';
import type { DetailView } from '../../shared/protocol/detail';
import type { ClientSnapshot } from '../client';
import { ClientContext } from '../shell';

export interface BoardApi {
    board: BoardView | undefined;
    detail: DetailView | undefined;
    fileResult: { key: string; text: string } | undefined;
    copyResult: { ok: boolean; text: string } | undefined;
    setSort(sort: SortKey): void;
    setDone(expanded: boolean): void;
    clearFilters(): void;
    openFile(key: string, line?: number): void;
    copyText(text: string): void;
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
        fileResult: snapshot.fileResult,
        copyResult: snapshot.copyResult,
        setSort: client.setBoardSort,
        setDone: client.setBoardDone,
        clearFilters: client.clearBoardFilters,
        openFile: client.openFile,
        copyText: client.copyText,
    };
}
