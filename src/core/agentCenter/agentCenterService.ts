import type {
    AgentCenterView,
    ActionsView,
    ControlsView,
    DetailView,
    RequestView,
    TimelinePayload,
} from '../../shared/protocol/agentCenter';
import type { NavigationRequest, NavigationTarget } from '../../shared/protocol/messages';
import type { DiscoveryController } from '../discovery/discoveryController';
import type { AgentCenterOrchestrator, AgentCenterStore, AgentCenterUiPort } from '../ports/agentCenter';
import type { EditorPort } from '../ports/board';
import type { ReadOnlyFileSystem } from '../ports/readOnlyFileSystem';
import type { Disposable } from '../ports/host';
import type { ShellModelSource, TrustPort, UiMemoryPort } from '../ports/shell';
import type { ProviderRegistry } from '../providers/registry';
import { isEndStatus, type RunView, type StoreState, type StoredEvent } from '../runtime/model';
import { READER_REASON } from '../runtime/notices';
import { createActions, type ActionContext } from './agentCenterActions';
import { projectRelativeKey } from './filePath';
import { AGENT_CENTER_PAGE_SIZE, MAX_LOADED_PAGES, SUMMARY_READ_SIZE } from './constants';
import { runHeader } from './header';
import { projectRunRows, providerName, specRefOf } from './runList';
import { applyTarget, filterLabel, parseMemory, reconcileSelection, serializeMemory, visibleRuns, type Selection } from './selection';
import { acCancelNotSupported } from '../../shared/protocol/agentCenterTexts';
import { capabilityNotes, currentActivity, emptySummary, errorDetails, openRequests, resultView, summarize, type RunSummary } from './summary';
import { timelineRows } from './timeline';

export interface AgentCenterSession {
    current(): AgentCenterStore | undefined;
    state(): StoreState;
    onDidChangeState(listener: (state: StoreState) => void): Disposable;
}

export interface AgentCenterServiceDeps {
    session: AgentCenterSession;
    providers: Pick<ProviderRegistry, 'entry' | 'onDidChange'>;
    source: ShellModelSource;
    memory: UiMemoryPort;
    discovery: Pick<DiscoveryController, 'snapshot'>;
    navigation: { onDidNavigate(listener: (request: NavigationRequest) => void): Disposable };
    trust: Pick<TrustPort, 'isTrusted'>;
    orchestrator: AgentCenterOrchestrator;
    ui: Pick<AgentCenterUiPort, 'confirm'>;
    files: Pick<ReadOnlyFileSystem, 'stat'>;
    editor: EditorPort;
}

export interface AgentCenterService {
    view(): AgentCenterView | undefined;
    timeline(): TimelinePayload | undefined;
    onDidChangeView(listener: (view: AgentCenterView | undefined) => void): Disposable;
    onDidChangeTimeline(listener: (timeline: TimelinePayload | undefined) => void): Disposable;
    select(runId: string): void;
    clearFilter(): void;
    loadEarlier(runId: string): void;
    follow(runId: string, on: boolean): void;
    reread(): void;
    answerApproval(runId: string, requestId: string, decision: 'approve-once' | 'reject', reason?: string): Promise<void>;
    answerInput(runId: string, requestId: string, text: string): Promise<void>;
    cancel(runId: string): Promise<void>;
    resume(runId: string): Promise<void>;
    openFile(runId: string, path: string): Promise<void>;
    whenIdle(): Promise<void>;
    dispose(): void;
}

interface Window {
    runId: string;
    events: StoredEvent[];
    summary: RunSummary;
    hasEarlier: boolean;
    following: boolean;
    unreadable: boolean;
}

const NO_STORE_REASON = 'no store';
const UNREADABLE_REASON = 'runs could not be read';
const WINDOW_LIMIT = AGENT_CENTER_PAGE_SIZE * MAX_LOADED_PAGES;

export function createAgentCenterService(deps: AgentCenterServiceDeps): AgentCenterService {
    const viewListeners = new Set<(view: AgentCenterView | undefined) => void>();
    const timelineListeners = new Set<(timeline: TimelinePayload | undefined) => void>();
    let subscriptions: Disposable[] = [];
    let storeSubscriptions: Disposable[] = [];
    let followedStore: AgentCenterStore | undefined;
    let followedWritable = false;
    let loadedRoot: string | undefined;
    let selection: Selection = { runId: undefined, stem: undefined };
    let notice: string | undefined;
    let pendingTarget: { target: NavigationTarget | undefined } | undefined;
    let catchUp = false;
    let rereadAll = false;
    let earlierFor: string | undefined;
    let win: Window | undefined;
    let currentView: AgentCenterView | undefined;
    let currentTimeline: TimelinePayload | undefined;
    let lastView = 'undefined';
    let lastTimeline = 'undefined';
    let lastPersisted = '';
    let lastRuns: RunView[] = [];
    let running = false;
    let again = false;
    let idle: Promise<void> = Promise.resolve();
    let disposed = false;

    const navigationSubscription = deps.navigation.onDidNavigate((request) => {
        if (request.area === 'agentCenter') {
            pendingTarget = { target: request.target };
            schedule();
        }
    });

    const actions = createActions({
        orchestrator: deps.orchestrator,
        ui: deps.ui,
        context: contextOf,
        changed: schedule,
        selectRun: (runId) => api.select(runId),
    });

    function contextOf(runId: string): ActionContext | undefined {
        const run = lastRuns.find((candidate) => candidate.runId === runId);
        if (run === undefined || win === undefined || win.runId !== runId) {
            return undefined;
        }
        const spec = specRefOf(run, deps.source.current());
        const provider = deps.providers.entry(run.providerId);
        return {
            controls: controlsOf(deps.session.state()),
            run,
            specNumber: spec.found ? spec.number : spec.stem,
            requestIds: openRequests(run, win.summary).map((request) => request.requestId),
            cancelOffered: provider.kind === 'ok' && provider.entry.capabilities.cancel.value !== 'none',
        };
    }

    function active(): boolean {
        return !disposed && (viewListeners.size > 0 || timelineListeners.size > 0);
    }

    function emit<Value>(listeners: Set<(value: Value) => void>, value: Value): void {
        [...listeners].forEach((listener) => {
            try {
                listener(value);
            } catch {
                return;
            }
        });
    }

    function setView(next: AgentCenterView | undefined): void {
        currentView = next;
        const serialized = JSON.stringify(next);
        if (serialized !== lastView) {
            lastView = serialized;
            emit(viewListeners, next);
        }
    }

    function setTimeline(next: TimelinePayload | undefined): void {
        currentTimeline = next;
        const serialized = JSON.stringify(next);
        if (serialized !== lastTimeline) {
            lastTimeline = serialized;
            emit(timelineListeners, next);
        }
    }

    function persist(root: string): void {
        const next = serializeMemory(deps.memory.get(), root, selection);
        const serialized = JSON.stringify(next);
        if (serialized !== lastPersisted) {
            lastPersisted = serialized;
            void deps.memory.set(next);
        }
    }

    function followStore(store: AgentCenterStore | undefined, writable: boolean): void {
        if (store === followedStore && writable === followedWritable && storeSubscriptions.length > 0) {
            return;
        }
        storeSubscriptions.forEach((subscription) => subscription.dispose());
        storeSubscriptions = [];
        followedStore = store;
        followedWritable = writable;
        if (store === undefined) {
            return;
        }
        storeSubscriptions.push(store.onDidChangeRuns(schedule));
        if (writable && store.onDidStoreEvent !== undefined) {
            storeSubscriptions.push(
                store.onDidStoreEvent((event) => {
                    if (event.runId === selection.runId) {
                        catchUp = true;
                    }
                    schedule();
                }),
            );
        }
    }

    async function readAll(store: AgentCenterStore, runId: string, from: number, onPage: (page: StoredEvent[]) => void, stillWanted: () => boolean): Promise<boolean> {
        let next = from;
        for (;;) {
            const read = await store.readEvents(runId, next, SUMMARY_READ_SIZE);
            if (!stillWanted()) {
                return false;
            }
            if (!read.available) {
                return false;
            }
            onPage(read.value);
            const last = read.value[read.value.length - 1];
            if (last === undefined || read.value.length < SUMMARY_READ_SIZE) {
                return true;
            }
            next = last.seq + 1;
        }
    }

    async function loadRun(store: AgentCenterStore, run: RunView): Promise<void> {
        const loaded: Window = { runId: run.runId, events: [], summary: emptySummary(), hasEarlier: false, following: true, unreadable: false };
        let tail: StoredEvent[] = [];
        let summary = emptySummary();
        const wanted = () => selection.runId === run.runId && !disposed;
        const ok = await readAll(
            store,
            run.runId,
            1,
            (page) => {
                summary = page.reduce(summarize, summary);
                tail = [...tail, ...page].slice(-AGENT_CENTER_PAGE_SIZE);
            },
            wanted,
        );
        if (!wanted()) {
            return;
        }
        loaded.unreadable = !ok;
        loaded.summary = summary;
        loaded.events = tail;
        loaded.hasEarlier = tail.length > 0 && (tail[0]?.seq ?? 1) > 1;
        win = loaded;
    }

    async function catchUpWindow(store: AgentCenterStore, current: Window): Promise<void> {
        const wanted = () => selection.runId === current.runId && win === current && !disposed;
        let summary = current.summary;
        let events = current.events;
        await readAll(
            store,
            current.runId,
            current.summary.lastSeq + 1,
            (page) => {
                summary = page.reduce(summarize, summary);
                events = [...events, ...page];
            },
            wanted,
        );
        if (!wanted()) {
            return;
        }
        current.summary = summary;
        current.events = events;
        trim(current);
    }

    function trim(current: Window): void {
        if (current.following && current.events.length > WINDOW_LIMIT) {
            current.events = current.events.slice(-WINDOW_LIMIT);
            current.hasEarlier = true;
        }
    }

    async function loadEarlierPage(store: AgentCenterStore, current: Window): Promise<void> {
        const first = current.events[0]?.seq;
        if (first === undefined || first <= 1) {
            current.hasEarlier = false;
            return;
        }
        const start = Math.max(1, first - AGENT_CENTER_PAGE_SIZE);
        const size = Math.min(AGENT_CENTER_PAGE_SIZE, first - 1);
        const read = await store.readEvents(current.runId, start, size);
        if (win !== current || !read.available) {
            return;
        }
        current.events = [...read.value.filter((event) => event.seq < first), ...current.events];
        current.hasEarlier = (current.events[0]?.seq ?? 1) > 1;
    }

    async function resumableOf(runId: string): Promise<boolean> {
        try {
            return (await deps.orchestrator.resumability(runId)).resumable;
        } catch {
            return false;
        }
    }

    async function existsInProject(root: string, path: string): Promise<boolean> {
        const key = projectRelativeKey(path);
        if (key === undefined) {
            return false;
        }
        try {
            return (await deps.files.stat(root, key)) === 'file';
        } catch {
            return false;
        }
    }

    function controlsOf(state: StoreState): ControlsView {
        if (!deps.trust.isTrusted()) {
            return { kind: 'none' };
        }
        return state.kind === 'read-only' ? { kind: 'disabled', reason: state.reason ?? READER_REASON } : { kind: 'enabled' };
    }

    async function detailOf(run: RunView, current: Window, model: ReturnType<ShellModelSource['current']>, controls: ControlsView): Promise<DetailView> {
        const spec = specRefOf(run, model);
        const provider = deps.providers.entry(run.providerId);
        const open = openRequests(run, current.summary);
        actions.prune(run.runId, open.map((request) => request.requestId));
        const requests: RequestView[] = open.map((request) => ({
            kind: request.kind,
            requestId: request.requestId,
            actionKind: request.actionKind,
            summary: request.summary,
            question: request.question,
            outsideProject: request.outsideProject,
            ...actions.requestState(run.runId, request.requestId),
        }));
        const trusted = controls.kind !== 'none';
        const declared = provider.kind === 'ok' ? provider.entry.capabilities.cancel.value : undefined;
        const opened = !isEndStatus(run.status);
        const offerCancel = trusted && opened && declared !== undefined && declared !== 'none';
        const unsupported = trusted && opened && declared === 'none';
        const resumable = trusted && !opened ? await resumableOf(run.runId) : false;
        const root = model?.project.root;
        const files = await Promise.all(
            current.summary.files.map(async (file) => ({ ...file, canOpen: root !== undefined && !file.outsideProject && (await existsInProject(root, file.path)) })),
        );
        const view: ActionsView = {
            cancel: offerCancel ? 'offer' : unsupported ? 'unsupported' : 'none',
            cancelNote: unsupported && provider.kind === 'ok' ? acCancelNotSupported(provider.entry.displayName) : undefined,
            resume: resumable,
            openSpec: spec.found,
            refusal: actions.runRefusal(run.runId),
        };
        return {
            header: runHeader(run, spec, providerName(deps.providers, run.providerId)),
            unreadable: run.historyUnreadable || current.unreadable,
            activity: currentActivity(run, current.summary),
            error: errorDetails(run, current.summary),
            result: resultView(run),
            files,
            notes: capabilityNotes(provider.kind === 'ok' ? provider.entry : undefined),
            requests,
            actions: view,
        };
    }

    async function refresh(): Promise<void> {
        const root = deps.discovery.snapshot().active?.root;
        if (root !== loadedRoot) {
            loadedRoot = root;
            selection = root === undefined ? { runId: undefined, stem: undefined } : parseMemory(deps.memory.get(), root);
            lastPersisted = JSON.stringify(deps.memory.get() ?? null);
            notice = undefined;
            win = undefined;
        }
        const store = deps.session.current();
        const state = deps.session.state();
        followStore(store, state.kind === 'writable');
        if (root === undefined || store === undefined || state.kind === 'unavailable') {
            win = undefined;
            setView({ kind: 'unavailable', reason: state.reason ?? NO_STORE_REASON });
            setTimeline(undefined);
            return;
        }
        let runs: RunView[];
        try {
            const list = await store.listRuns();
            if (!list.available) {
                win = undefined;
                setView({ kind: 'unavailable', reason: list.reason });
                setTimeline(undefined);
                return;
            }
            runs = list.value;
        } catch {
            win = undefined;
            setView({ kind: 'unavailable', reason: UNREADABLE_REASON });
            setTimeline(undefined);
            return;
        }
        if (!active()) {
            return;
        }
        if (pendingTarget !== undefined) {
            const applied = applyTarget(selection, pendingTarget.target, runs);
            pendingTarget = undefined;
            selection = applied.selection;
            notice = applied.notice;
        } else {
            const reconciled = reconcileSelection(selection, runs);
            selection = reconciled.selection;
            notice = reconciled.notice ?? notice;
        }
        const selectedRun = runs.find((run) => run.runId === selection.runId);
        if (selectedRun !== undefined && selection.stem !== undefined && selectedRun.spec.stem !== selection.stem) {
            selection = { runId: undefined, stem: selection.stem };
        }
        persist(root);
        const shown = runs.find((run) => run.runId === selection.runId);
        if (shown === undefined) {
            win = undefined;
        } else if (win === undefined || win.runId !== shown.runId || rereadAll) {
            rereadAll = false;
            catchUp = false;
            win = undefined;
            await loadRun(store, shown);
        } else if (catchUp) {
            catchUp = false;
            await catchUpWindow(store, win);
        }
        if (win !== undefined && earlierFor === win.runId) {
            earlierFor = undefined;
            await loadEarlierPage(store, win);
        }
        if (!active()) {
            return;
        }
        lastRuns = runs;
        const model = deps.source.current();
        const controls = controlsOf(state);
        const rows = projectRunRows(visibleRuns(runs, selection.stem), { model, providers: deps.providers, selectedRunId: selection.runId });
        const current = shown !== undefined && win !== undefined && win.runId === shown.runId ? win : undefined;
        setView({
            kind: 'ready',
            controls,
            filter: selection.stem === undefined ? undefined : { stem: selection.stem, label: filterLabel(selection.stem, model) },
            notice,
            empty: runs.length === 0 ? 'no-runs' : rows.length === 0 ? 'no-match' : undefined,
            rows,
            detail: shown !== undefined && current !== undefined ? await detailOf(shown, current, model, controls) : undefined,
        });
        setTimeline(current === undefined ? undefined : { runId: current.runId, rows: timelineRows(current.events), hasEarlier: current.hasEarlier });
    }

    function schedule(): void {
        if (!active()) {
            return;
        }
        if (running) {
            again = true;
            return;
        }
        running = true;
        idle = (async () => {
            try {
                do {
                    again = false;
                    try {
                        await refresh();
                    } catch {
                        setView(undefined);
                    }
                } while (again && active());
            } finally {
                running = false;
            }
        })();
    }

    function listen(): void {
        subscriptions.push(
            deps.session.onDidChangeState(schedule),
            deps.providers.onDidChange(schedule),
            deps.source.onDidChange(schedule),
        );
    }

    function release(): void {
        [...subscriptions, ...storeSubscriptions].forEach((subscription) => subscription.dispose());
        subscriptions = [];
        storeSubscriptions = [];
        followedStore = undefined;
        loadedRoot = undefined;
        win = undefined;
        currentView = undefined;
        currentTimeline = undefined;
        lastView = 'undefined';
        lastTimeline = 'undefined';
    }

    function added(): void {
        if (viewListeners.size + timelineListeners.size === 1) {
            listen();
            schedule();
        }
    }

    function removed(): void {
        if (viewListeners.size + timelineListeners.size === 0) {
            release();
        }
    }

    const api: AgentCenterService = {
        view: () => currentView,
        timeline: () => currentTimeline,
        onDidChangeView(listener) {
            viewListeners.add(listener);
            added();
            return {
                dispose() {
                    viewListeners.delete(listener);
                    removed();
                },
            };
        },
        onDidChangeTimeline(listener) {
            timelineListeners.add(listener);
            added();
            return {
                dispose() {
                    timelineListeners.delete(listener);
                    removed();
                },
            };
        },
        select(runId) {
            selection = { runId, stem: selection.stem };
            notice = undefined;
            win = win?.runId === runId ? win : undefined;
            if (win !== undefined) {
                win.following = true;
            }
            schedule();
        },
        clearFilter() {
            selection = { runId: selection.runId, stem: undefined };
            notice = undefined;
            schedule();
        },
        loadEarlier(runId) {
            earlierFor = runId;
            schedule();
        },
        follow(runId, on) {
            if (win?.runId === runId) {
                win.following = on;
                if (on) {
                    catchUp = true;
                    trim(win);
                    schedule();
                }
            }
        },
        reread() {
            rereadAll = true;
            schedule();
        },
        answerApproval: (runId, requestId, decision, reason) => actions.approval(runId, requestId, decision, reason),
        answerInput: (runId, requestId, text) => actions.input(runId, requestId, text),
        cancel: (runId) => actions.cancel(runId),
        resume: (runId) => actions.resume(runId),
        async openFile(runId, path) {
            const run = lastRuns.find((candidate) => candidate.runId === runId);
            const root = deps.source.current()?.project.root;
            const key = projectRelativeKey(path);
            const attributed = win?.runId === runId && win.summary.files.some((file) => file.path === path && !file.outsideProject);
            if (run === undefined || root === undefined || key === undefined || !attributed || !(await existsInProject(root, path))) {
                return;
            }
            await deps.editor.open(root, key);
        },
        async whenIdle() {
            while (running) {
                await idle;
            }
        },
        dispose() {
            disposed = true;
            viewListeners.clear();
            timelineListeners.clear();
            navigationSubscription.dispose();
            release();
        },
    };
    return api;
}
