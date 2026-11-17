import type { JsonValue, StoredEvent } from '../../runtime/model';

export function stored(seq: number, type: string, payload: JsonValue = {}, extra: Partial<StoredEvent> = {}): StoredEvent {
    return {
        runId: 'run-1',
        seq,
        occurredAt: undefined,
        receivedAt: `2026-11-17T10:00:${String(seq % 60).padStart(2, '0')}.000Z`,
        type,
        payload,
        providerEventId: undefined,
        ...extra,
    };
}

export function fromProvider(seq: number, type: string, payload: { [key: string]: JsonValue } = {}, extra: Partial<StoredEvent> = {}): StoredEvent {
    return stored(seq, type, { ...payload, source: 'provider' }, extra);
}
