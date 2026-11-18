import { deriveLifecycle } from '../../lifecycle/deriveLifecycle';
import { readMemory } from '../../lifecycle/testing/projects';
import type { Disposable } from '../../ports/host';
import type { HistoryView } from '../../lifecycle/statusHistory';
import type { ShellModel, ShellModelSource, UiMemoryPort } from '../../ports/shell';
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
    notify(): void;
}

export function createFakeHistory(): FakeHistory {
    const listeners = new Set<() => void>();
    const fake: FakeHistory = {
        view: { available: true, label: 'Observed by Studio while it was running — not a reconstruction', entries: [] },
        port: {
            read: async () => fake.view,
            onDidChange(listener) {
                listeners.add(listener);
                return { dispose: () => void listeners.delete(listener) };
            },
        },
        notify: () => [...listeners].forEach((listener) => listener()),
    };
    return fake;
}

export interface BoardWorld {
    selection: FakeSelection;
    history: FakeHistory;
    source: FakeSource;
    service: BoardService;
    memory: FakeBoardMemory;
    views: string[];
}

export interface FakeBoardMemory extends UiMemoryPort {
    value: unknown;
    writes: unknown[];
}

export function createFakeBoardMemory(value?: unknown): FakeBoardMemory {
    const memory: FakeBoardMemory = {
        value,
        writes: [],
        get: () => memory.value,
        async set(next) {
            memory.value = next;
            memory.writes.push(next);
        },
    };
    return memory;
}

export function createBoardWorld(model: ShellModel | undefined, memory: FakeBoardMemory = createFakeBoardMemory()): BoardWorld {
    const source = createFakeSource(model);
    const selection = createFakeSelection();
    const history = createFakeHistory();
    const service = createBoardService({ source, selection: selection.source, history: history.port, memory });
    const views: string[] = [];
    service.onDidChangeView((view) => views.push(JSON.stringify(view)));
    return {
        selection,
        history,
        source,
        service,
        memory,
        views,
    };
}
