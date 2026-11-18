import type { BoardView, CardView, SortKey } from '../../shared/protocol/board';
import type { BoardFilter } from '../../shared/protocol/boardFilter';
import type { DetailView } from '../../shared/protocol/detail';
import type { HistoryView } from '../lifecycle/statusHistory';
import type { SelectionSource } from '../ports/board';
import type { Disposable } from '../ports/host';
import type { ShellModel, ShellModelSource } from '../ports/shell';
import { buildDetail } from './detail';
import { createBoardUiState } from './boardUiState';
import { buildBanner, buildCards } from './cards';
import { arrangeBoard } from './filters';

export interface BoardServiceDeps {
    source: ShellModelSource;
    selection: SelectionSource;
    history: { read(): Promise<HistoryView>; onDidChange(listener: () => void): Disposable };
}

export interface BoardService {
    view(): BoardView | undefined;
    onDidChangeView(listener: (view: BoardView | undefined) => void): Disposable;
    detail(): DetailView;
    onDidChangeDetail(listener: (view: DetailView) => void): Disposable;
    setFilter(filter: BoardFilter): void;
    setSort(sort: SortKey): void;
    clearFilters(): void;
    applyNavigationFilter(filter: BoardFilter): void;
    panelClosed(): void;
    whenIdle(): Promise<void>;
    dispose(): void;
}

interface Built {
    model: ShellModel;
    cards: CardView[];
    banner: BoardView['banner'];
}

export function createBoardService(deps: BoardServiceDeps): BoardService {
    const ui = createBoardUiState();
    const listeners = new Set<(view: BoardView | undefined) => void>();
    const detailListeners = new Set<(view: DetailView) => void>();
    let history: HistoryView = { available: false, text: 'Status history not available: no store' };
    let lastDetail = '';
    let built: Built | undefined;
    let sequence = 0;
    let chain: Promise<void> = Promise.resolve();
    let last = 'undefined';
    let disposed = false;

    function ensureBuilt(): Built | undefined {
        const model = deps.source.current();
        if (model === undefined) {
            built = undefined;
            return undefined;
        }
        if (built === undefined || built.model !== model) {
            const cards = buildCards(model.project, model.lifecycle);
            built = { model, cards, banner: buildBanner(model.project, model.lifecycle) };
        }
        return built;
    }

    function view(): BoardView | undefined {
        const current = ensureBuilt();
        if (current === undefined) {
            return undefined;
        }
        return {
            columns: arrangeBoard(current.cards, ui.filter(), ui.sort()),
            banner: current.banner,
            filter: ui.filter(),
            sort: ui.sort(),
            noSpecs: current.cards.length === 0,
        };
    }

    function detail(): DetailView {
        return buildDetail({ selection: deps.selection.selection(), model: deps.source.current(), history });
    }

    function emitDetail(): void {
        const next = detail();
        const serialized = JSON.stringify(next);
        if (serialized === lastDetail) {
            return;
        }
        lastDetail = serialized;
        [...detailListeners].forEach((listener) => {
            try {
                listener(next);
            } catch {
                return;
            }
        });
    }

    function emit(): void {
        emitDetail();
        const next = view();
        const serialized = JSON.stringify(next);
        if (serialized === last) {
            return;
        }
        last = serialized;
        [...listeners].forEach((listener) => {
            try {
                listener(next);
            } catch {
                return;
            }
        });
    }

    async function refresh(): Promise<void> {
        if (disposed) {
            return;
        }
        const token = ++sequence;
        let nextHistory: HistoryView;
        try {
            nextHistory = await deps.history.read();
        } catch {
            nextHistory = { available: false, text: 'Status history not available' };
        }
        if (token !== sequence || disposed) {
            return;
        }
        history = nextHistory;
        ui.projectChanged(deps.source.current()?.project.root);
        emit();
    }

    function schedule(): void {
        chain = chain.then(refresh, refresh);
    }

    const subscriptions = [deps.source.onDidChange(schedule), deps.selection.onDidChange(schedule), deps.history.onDidChange(schedule)];
    ui.projectChanged(deps.source.current()?.project.root);
    schedule();

    function changed(action: () => void): void {
        action();
        emit();
    }

    return {
        view,
        onDidChangeView(listener) {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
        detail,
        onDidChangeDetail(listener) {
            detailListeners.add(listener);
            return { dispose: () => void detailListeners.delete(listener) };
        },
        setFilter: (filter) => changed(() => ui.setFilter(filter)),
        setSort: (sort) => changed(() => ui.setSort(sort)),
        clearFilters: () => changed(() => ui.clearFilters()),
        applyNavigationFilter: (filter) => changed(() => ui.applyNavigationFilter(filter)),
        panelClosed: () => changed(() => ui.panelClosed()),
        whenIdle: () => chain,
        dispose() {
            disposed = true;
            subscriptions.forEach((subscription) => subscription.dispose());
            listeners.clear();
            detailListeners.clear();
        },
    };
}
