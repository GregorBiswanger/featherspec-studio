import { SORT_KEYS, type BoardView, type CardView, type SortKey } from '../../shared/protocol/board';
import { isFilterSet, type BoardFilter } from '../../shared/protocol/boardFilter';
import type { DetailView } from '../../shared/protocol/detail';
import type { HistoryView } from '../lifecycle/statusHistory';
import type { SelectionSource } from '../ports/board';
import type { Disposable } from '../ports/host';
import type { ShellModel, ShellModelSource, UiMemoryPort } from '../ports/shell';
import type { SettingsSource } from '../settings/settingsSource';
import type { StepTipSettings } from '../settings/stepTipSettings';
import { buildDetail } from './detail';
import { createBoardUiState } from './boardUiState';
import { buildBanner, buildCards } from './cards';
import { arrangeBoard } from './filters';
import { HISTORY_REASON_UNREADABLE, historyUnavailableText } from '../lifecycle/historyTexts';

export interface BoardServiceDeps {
    source: ShellModelSource;
    selection: SelectionSource;
    history: { read(): Promise<HistoryView>; onDidChange(listener: () => void): Disposable };
    memory: UiMemoryPort;
    tips: SettingsSource<StepTipSettings>;
}

export interface BoardService {
    view(): BoardView | undefined;
    onDidChangeView(listener: (view: BoardView | undefined) => void): Disposable;
    detail(): DetailView;
    onDidChangeDetail(listener: (view: DetailView) => void): Disposable;
    setFilter(filter: BoardFilter): void;
    setSort(sort: SortKey): void;
    setDone(expanded: boolean): void;
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
    sortKeys: SortKey[];
}

export function createBoardService(deps: BoardServiceDeps): BoardService {
    const ui = createBoardUiState(deps.memory);
    const listeners = new Set<(view: BoardView | undefined) => void>();
    const detailListeners = new Set<(view: DetailView) => void>();
    let history: HistoryView = { available: false, text: historyUnavailableText(HISTORY_REASON_UNREADABLE) };
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
            const all = buildCards(model.project, model.lifecycle);
            const datesVary = new Set(all.flatMap((card) => (card.lastChange === undefined ? [] : [card.lastChange.day]))).size >= 2;
            const cards = datesVary ? all : all.map((card) => ({ ...card, lastChange: undefined }));
            built = { model, cards, banner: buildBanner(model.project, model.lifecycle), sortKeys: datesVary ? [...SORT_KEYS] : SORT_KEYS.filter((key) => key !== 'lastChange') };
        }
        return built;
    }

    function view(): BoardView | undefined {
        const current = ensureBuilt();
        if (current === undefined) {
            return undefined;
        }
        if (ui.sort() === 'lastChange' && !current.sortKeys.includes('lastChange')) {
            ui.setSort('number');
        }
        const columns = arrangeBoard(current.cards, ui.filter(), ui.sort(), ui.doneExpanded());
        const done = columns.find((column) => column.state === 'Done');
        const doneHasCards = done !== undefined && !isFilterSet(ui.filter()) && done.count > 0;
        const base = { columns, banner: current.banner, filter: ui.filter(), sort: ui.sort(), sortKeys: current.sortKeys, noSpecs: current.cards.length === 0 };
        return doneHasCards ? { ...base, doneToggle: ui.doneExpanded() ? 'hide' : 'show' } : base;
    }

    function detail(): DetailView {
        return buildDetail({ selection: deps.selection.selection(), model: deps.source.current(), history, tips: deps.tips.read() });
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
            nextHistory = { available: false, text: historyUnavailableText() };
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

    const subscriptions = [deps.source.onDidChange(schedule), deps.selection.onDidChange(schedule), deps.history.onDidChange(schedule), deps.tips.onDidChange(schedule)];
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
        setDone: (expanded) => changed(() => ui.setDoneExpanded(expanded)),
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
