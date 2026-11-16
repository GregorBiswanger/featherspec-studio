import type { Disposable } from '../../ports/host';
import type { ReadResult, RunView, StoreState } from '../../runtime/model';
import { openRuntimeStore, type RuntimeStore } from '../../runtime/runtimeStore';
import { createFakeCredentials, createFakeNotices, createFakeRuntimeClock, createSequentialIds, type FakeRuntimeClock } from '../../runtime/testing/fakes';
import { createMemoryBacking, createMemoryMedium } from '../../runtime/testing/memoryMedium';
import type { RunSourceSession, RunStore } from '../runSource';

export interface MemoryStore {
    store: RuntimeStore;
    clock: FakeRuntimeClock;
}

export async function openMemoryStore(project = 'project-A'): Promise<MemoryStore> {
    const clock = createFakeRuntimeClock();
    const store = await openRuntimeStore({
        medium: createMemoryMedium(createMemoryBacking()),
        ids: createSequentialIds(),
        clock,
        notices: createFakeNotices(),
        credentials: createFakeCredentials(),
        projectRoot: project,
        maxAgeDays: () => 90,
    });
    return { store, clock };
}

export interface FakeSession extends RunSourceSession {
    use(store: RunStore | undefined): void;
    setState(state: StoreState): void;
    stateListeners(): number;
}

export function createFakeSession(initial?: RunStore): FakeSession {
    let store = initial;
    let state: StoreState = { kind: 'writable', reason: undefined };
    const listeners = new Set<(state: StoreState) => void>();
    return {
        current: () => store,
        state: () => state,
        onDidChangeState(listener): Disposable {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
        use(next) {
            store = next;
        },
        setState(next) {
            state = next;
            [...listeners].forEach((listener) => listener(next));
        },
        stateListeners: () => listeners.size,
    };
}

export interface ScriptedStore {
    store: RunStore;
    setRuns(runs: RunView[] | undefined): void;
    setState(state: StoreState): void;
    notify(): void;
    listCalls(): number;
}

export function createScriptedStore(initial: RunView[] = []): ScriptedStore {
    let runs: RunView[] | undefined = initial;
    let state: StoreState = { kind: 'writable', reason: undefined };
    let calls = 0;
    const listeners = new Set<() => void>();
    return {
        store: {
            state: () => state,
            async listRuns(): Promise<ReadResult<RunView[]>> {
                calls += 1;
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
        setState(next) {
            state = next;
        },
        notify: () => [...listeners].forEach((listener) => listener()),
        listCalls: () => calls,
    };
}
