import type { SortKey } from '../../shared/protocol/board';
import type { BoardFilter } from '../../shared/protocol/boardFilter';
import type { UiMemoryPort } from '../ports/shell';
import { parseDoneMemory, serializeDoneMemory } from './doneMemory';

export interface BoardUiState {
    filter(): BoardFilter;
    sort(): SortKey;
    doneExpanded(): boolean;
    setFilter(filter: BoardFilter): void;
    setSort(sort: SortKey): void;
    setDoneExpanded(expanded: boolean): void;
    clearFilters(): void;
    applyNavigationFilter(filter: BoardFilter): void;
    projectChanged(root: string | undefined): void;
    panelClosed(): void;
}

export function createBoardUiState(memory: UiMemoryPort): BoardUiState {
    let filter: BoardFilter = {};
    let sort: SortKey = 'number';
    let root: string | undefined;
    let doneExpanded = parseDoneMemory(memory.get());
    return {
        filter: () => filter,
        sort: () => sort,
        doneExpanded: () => doneExpanded,
        setFilter(next) {
            filter = { ...next };
        },
        setSort(next) {
            sort = next;
        },
        setDoneExpanded(next) {
            doneExpanded = next;
            memory.set(serializeDoneMemory(next)).catch(() => undefined);
        },
        clearFilters() {
            filter = {};
        },
        applyNavigationFilter(next) {
            filter = { ...next };
        },
        projectChanged(next) {
            if (next !== undefined && root !== undefined && next !== root) {
                filter = {};
            }
            if (next !== undefined) {
                root = next;
            }
        },
        panelClosed() {
            filter = {};
            sort = 'number';
        },
    };
}
