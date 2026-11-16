import type { JsonValue, ReadResult, SpecStatusRecord, StoreState } from '../../runtime/model';
import { RuntimeRefusal } from '../../runtime/model';
import type { StatusHistoryStore } from '../statusHistory';

export interface FakeHistoryStore extends StatusHistoryStore {
    records: SpecStatusRecord[];
    setState(kind: StoreState['kind'], reason?: string): void;
    failAppends(failure: Error | undefined): void;
    failReads(reason: string | undefined): void;
    appendAttempts(): number;
}

export function createFakeHistoryStore(initial: SpecStatusRecord[] = []): FakeHistoryStore {
    let state: StoreState = { kind: 'writable', reason: undefined };
    let failure: Error | undefined;
    let readFailure: string | undefined;
    let attempts = 0;
    const store: FakeHistoryStore = {
        records: [...initial],
        state: () => state,
        setState(kind, reason) {
            state = { kind, reason };
        },
        failAppends(next) {
            failure = next;
        },
        failReads(reason) {
            readFailure = reason;
        },
        appendAttempts: () => attempts,
        async appendSpecStatusEntry(stem, entry: JsonValue) {
            attempts += 1;
            if (state.kind !== 'writable') {
                throw new RuntimeRefusal(state.kind === 'read-only' ? 'read-only' : 'unavailable', state.reason ?? state.kind);
            }
            if (failure !== undefined) {
                throw failure;
            }
            store.records.push({ stem, observedAt: 'store-time', entry });
        },
        async readSpecStatusHistory(stem?: string): Promise<ReadResult<SpecStatusRecord[]>> {
            if (readFailure !== undefined || state.kind === 'unavailable') {
                return { available: false, reason: readFailure ?? state.reason ?? 'unavailable' };
            }
            return { available: true, value: store.records.filter((record) => stem === undefined || record.stem === stem) };
        },
    };
    return store;
}

export function appended(store: FakeHistoryStore): Record<string, JsonValue>[] {
    return store.records.map((record) => record.entry as Record<string, JsonValue>);
}
