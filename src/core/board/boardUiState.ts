import type { SortKey } from '../../shared/protocol/board';
import type { BoardFilter } from '../../shared/protocol/boardFilter';

export interface BoardUiState {
    filter(): BoardFilter;
    sort(): SortKey;
    focused(): string | null;
    setFilter(filter: BoardFilter): void;
    setSort(sort: SortKey): void;
    clearFilters(): void;
    applyNavigationFilter(filter: BoardFilter): void;
    setFocus(key: string | null): void;
    projectChanged(root: string | undefined): void;
    panelClosed(): void;
}

export function createBoardUiState(): BoardUiState {
    let filter: BoardFilter = {};
    let sort: SortKey = 'number';
    let focus: string | null = null;
    let root: string | undefined;
    return {
        filter: () => filter,
        sort: () => sort,
        focused: () => focus,
        setFilter(next) {
            filter = { ...next };
        },
        setSort(next) {
            sort = next;
        },
        clearFilters() {
            filter = {};
        },
        applyNavigationFilter(next) {
            filter = { ...next };
        },
        setFocus(key) {
            focus = key;
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
            focus = null;
        },
    };
}
