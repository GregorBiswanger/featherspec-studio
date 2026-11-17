import type { Disposable } from '../ports/host';
import type { EventSignal, StoreEvent } from '../ports/agentCenter';
import type { RuntimeStore } from '../runtime/runtimeStore';

export function withEventSignal<Store extends RuntimeStore>(store: Store): Store & EventSignal {
    const listeners = new Set<(event: StoreEvent) => void>();
    return {
        ...store,
        async appendEvent(runId, event) {
            const outcome = await store.appendEvent(runId, event);
            if (outcome.outcome === 'stored') {
                const signalled: StoreEvent = { runId, seq: outcome.seq, type: event.type };
                for (const listener of [...listeners]) {
                    try {
                        listener(signalled);
                    } catch {
                        continue;
                    }
                }
            }
            return outcome;
        },
        onDidStoreEvent(listener): Disposable {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
    };
}
