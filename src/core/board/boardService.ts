import type { BoardView, CardView, SortKey } from '../../shared/protocol/board';
import type { BoardFilter } from '../../shared/protocol/boardFilter';
import type { DetailView } from '../../shared/protocol/detail';
import type { HistoryView } from '../lifecycle/statusHistory';
import type { SelectionSource } from '../ports/board';
import type { Disposable } from '../ports/host';
import type { ShellModel, ShellModelSource } from '../ports/shell';
import type { ReadResult, RunView } from '../runtime/model';
import type { RuntimeStore } from '../runtime/runtimeStore';
import { buildDetail } from './detail';
import { createBoardUiState } from './boardUiState';
import { buildBanner, buildCards } from './cards';
import { arrangeBoard } from './filters';
import { indexRuns, type RunIndex } from './runs';

export interface BoardServiceDeps {
    source: ShellModelSource;
    session: { current(): Pick<RuntimeStore, 'listRuns' | 'onDidChangeRuns'> | undefined };
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
    setFocus(key: string | null): void;
    focused(): string | null;
    panelClosed(): void;
    whenIdle(): Promise<void>;
    dispose(): void;
}

interface Built {
    model: ShellModel;
    runs: RunIndex;
    cards: CardView[];
    banner: BoardView['banner'];
    providers: string[];
}

export function createBoardService(deps: BoardServiceDeps): BoardService {
    const ui = createBoardUiState();
    const listeners = new Set<(view: BoardView | undefined) => void>();
    const detailListeners = new Set<(view: DetailView) => void>();
    let rawRuns: ReadResult<RunView[]> = { available: false, reason: 'no store' };
    let history: HistoryView = { available: false, text: 'Status history not available: no store' };
    let lastDetail = '';
    let runs: RunIndex = { available: false };
    let built: Built | undefined;
    let subscribedStore: unknown;
    let storeSubscription: Disposable | undefined;
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
        if (built === undefined || built.model !== model || built.runs !== runs) {
            const cards = buildCards(model.project, model.lifecycle, runs);
            const providers = [...new Set(cards.flatMap((card) => (card.run.kind === 'run' || card.run.kind === 'unreadable' ? [card.run.provider] : [])))].sort();
            built = { model, runs, cards, banner: buildBanner(model.project, model.lifecycle), providers };
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
            providers: current.providers,
            noSpecs: current.cards.length === 0,
        };
    }

    function detail(): DetailView {
        return buildDetail({ selection: deps.selection.selection(), model: deps.source.current(), runs: rawRuns, history });
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

    function follow(store: ReturnType<BoardServiceDeps['session']['current']>): void {
        if (store === subscribedStore) {
            return;
        }
        storeSubscription?.dispose();
        subscribedStore = store;
        storeSubscription = store?.onDidChangeRuns(schedule);
    }

    async function refresh(): Promise<void> {
        if (disposed) {
            return;
        }
        const token = ++sequence;
        const store = deps.session.current();
        follow(store);
        let index: RunIndex = { available: false };
        let list: ReadResult<RunView[]> = { available: false, reason: 'no store' };
        if (store !== undefined) {
            try {
                list = await store.listRuns();
                index = indexRuns(list);
            } catch {
                index = { available: false };
                list = { available: false, reason: 'runs could not be read' };
            }
        }
        let nextHistory: HistoryView;
        try {
            nextHistory = await deps.history.read();
        } catch {
            nextHistory = { available: false, text: 'Status history not available' };
        }
        if (token !== sequence || disposed) {
            return;
        }
        runs = index;
        rawRuns = list;
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
        setFocus: (key) => ui.setFocus(key),
        focused: () => ui.focused(),
        panelClosed: () => changed(() => ui.panelClosed()),
        whenIdle: () => chain,
        dispose() {
            disposed = true;
            subscriptions.forEach((subscription) => subscription.dispose());
            storeSubscription?.dispose();
            listeners.clear();
            detailListeners.clear();
        },
    };
}
