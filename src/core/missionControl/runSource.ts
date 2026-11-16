import type { Disposable } from '../ports/host';
import type { RunView, StoreState } from '../runtime/model';
import type { RuntimeStore } from '../runtime/runtimeStore';

export type RunsRead = { available: true; runs: RunView[] } | { available: false; reason: string };

export type RunStore = Pick<RuntimeStore, 'listRuns' | 'onDidChangeRuns' | 'state'>;

export interface RunSourceSession {
    current(): RunStore | undefined;
    state(): StoreState;
    onDidChangeState(listener: (state: StoreState) => void): Disposable;
}

export interface RunSource {
    read(): Promise<RunsRead>;
    onDidChange(listener: () => void): Disposable;
    dispose(): void;
}

const NO_STORE_REASON = 'no store';
const UNAVAILABLE_REASON = 'store unavailable';
const UNREADABLE_REASON = 'runs could not be read';

export function createRunSource(deps: { session: RunSourceSession }): RunSource {
    const { session } = deps;
    const listeners = new Set<() => void>();
    let followed: RunStore | undefined;
    let storeSubscription: Disposable | undefined;
    let stateSubscription: Disposable | undefined;

    function emit(): void {
        [...listeners].forEach((listener) => {
            try {
                listener();
            } catch {
                return;
            }
        });
    }

    function follow(): void {
        if (listeners.size === 0) {
            return;
        }
        const store = session.current();
        if (store === followed && storeSubscription !== undefined) {
            return;
        }
        storeSubscription?.dispose();
        followed = store;
        storeSubscription = store?.onDidChangeRuns(emit);
    }

    function release(): void {
        storeSubscription?.dispose();
        stateSubscription?.dispose();
        storeSubscription = undefined;
        stateSubscription = undefined;
        followed = undefined;
    }

    return {
        async read() {
            follow();
            const store = session.current();
            if (store === undefined) {
                return { available: false, reason: session.state().reason ?? NO_STORE_REASON };
            }
            const state = store.state();
            if (state.kind === 'unavailable') {
                return { available: false, reason: state.reason ?? UNAVAILABLE_REASON };
            }
            try {
                const list = await store.listRuns();
                return list.available ? { available: true, runs: list.value } : { available: false, reason: list.reason };
            } catch {
                return { available: false, reason: UNREADABLE_REASON };
            }
        },
        onDidChange(listener) {
            listeners.add(listener);
            stateSubscription ??= session.onDidChangeState(() => {
                follow();
                emit();
            });
            follow();
            return {
                dispose() {
                    listeners.delete(listener);
                    if (listeners.size === 0) {
                        release();
                    }
                },
            };
        },
        dispose() {
            listeners.clear();
            release();
        },
    };
}
