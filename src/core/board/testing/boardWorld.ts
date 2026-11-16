import { deriveLifecycle } from '../../lifecycle/deriveLifecycle';
import { readMemory } from '../../lifecycle/testing/projects';
import type { Disposable } from '../../ports/host';
import type { HistoryView } from '../../lifecycle/statusHistory';
import type { ShellModel, ShellModelSource } from '../../ports/shell';
import type { ReadResult, RunView } from '../../runtime/model';
import type { RuntimeStore } from '../../runtime/runtimeStore';
import { createBoardService, type BoardService } from '../boardService';

export async function modelOf(files: Record<string, string>): Promise<ShellModel> {
    const project = await readMemory(files);
    return { project, lifecycle: deriveLifecycle(project) };
}

export interface FakeSource extends ShellModelSource {
    set(model: ShellModel | undefined, stamp?: string): void;
    stamp(value: string): void;
}

export function createFakeSource(initial?: ShellModel): FakeSource {
    let model = initial;
    let at = '2026-11-16T10:00:00.000Z';
    const listeners = new Set<() => void>();
    return {
        current: () => model,
        updatedAt: () => at,
        stamp(value) {
            at = value;
        },
        onDidChange(listener): Disposable {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
        set(next, stamp) {
            model = next;
            if (stamp !== undefined) {
                at = stamp;
            }
            [...listeners].forEach((listener) => listener());
        },
    };
}

export interface FakeStore {
    store: Pick<RuntimeStore, 'listRuns' | 'onDidChangeRuns'>;
    setRuns(runs: RunView[] | undefined): void;
    notify(): void;
    subscribers(): number;
}

export function createFakeStore(): FakeStore {
    let runs: RunView[] | undefined = [];
    const listeners = new Set<() => void>();
    return {
        store: {
            async listRuns(): Promise<ReadResult<RunView[]>> {
                return runs === undefined ? { available: false, reason: 'no storage' } : { available: true, value: runs };
            },
            onDidChangeRuns(listener): Disposable {
                listeners.add(listener);
                return { dispose: () => void listeners.delete(listener) };
            },
        },
        setRuns(next) {
            runs = next;
        },
        notify: () => [...listeners].forEach((listener) => listener()),
        subscribers: () => listeners.size,
    };
}

export function run(runId: string, stem: string, overrides: Partial<RunView> = {}): RunView {
    return {
        runId,
        providerId: 'copilot',
        model: 'not available',
        spec: { stem, path: `.specs/active/${stem}.md` },
        sessionRef: undefined,
        status: 'Running',
        statusHistory: [],
        created: '2026-11-16T10:00:00.000Z',
        started: undefined,
        ended: undefined,
        errorClass: undefined,
        errorMessage: undefined,
        result: undefined,
        historyIncomplete: false,
        historyUnreadable: false,
        newerVersion: false,
        ...overrides,
    };
}

export interface FakeSelection {
    source: { selection(): { stem: string; path?: string } | undefined; onDidChange(listener: () => void): Disposable };
    set(selection: { stem: string; path?: string } | undefined): void;
}

export function createFakeSelection(): FakeSelection {
    let selection: { stem: string; path?: string } | undefined;
    const listeners = new Set<() => void>();
    return {
        source: {
            selection: () => selection,
            onDidChange(listener): Disposable {
                listeners.add(listener);
                return { dispose: () => void listeners.delete(listener) };
            },
        },
        set(next) {
            selection = next;
            [...listeners].forEach((listener) => listener());
        },
    };
}

export interface FakeHistory {
    port: { read(): Promise<HistoryView>; onDidChange(listener: () => void): Disposable };
    view: HistoryView;
}

export function createFakeHistory(): FakeHistory {
    const fake: FakeHistory = {
        view: { available: true, label: 'Observed by Studio while it was running — not a reconstruction', entries: [] },
        port: { read: async () => fake.view, onDidChange: () => ({ dispose: () => undefined }) },
    };
    return fake;
}

export interface BoardWorld {
    selection: FakeSelection;
    history: FakeHistory;
    source: FakeSource;
    store: FakeStore;
    service: BoardService;
    views: string[];
    setStore(store: FakeStore | undefined): void;
}

export function createBoardWorld(model: ShellModel | undefined): BoardWorld {
    const source = createFakeSource(model);
    const store = createFakeStore();
    let current: FakeStore | undefined = store;
    const selection = createFakeSelection();
    const history = createFakeHistory();
    const service = createBoardService({ source, session: { current: () => current?.store }, selection: selection.source, history: history.port });
    const views: string[] = [];
    service.onDidChangeView((view) => views.push(JSON.stringify(view)));
    return {
        selection,
        history,
        source,
        store,
        service,
        views,
        setStore(next) {
            current = next;
        },
    };
}
