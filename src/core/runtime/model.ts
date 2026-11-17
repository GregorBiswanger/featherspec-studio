export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export const FORMAT_VERSION = 1;
export const HEARTBEAT_INTERVAL_MS = 10_000;
export const LOCK_STALE_MS = 60_000;
export const MAX_AGE_DAYS = 90;

export type StoreStateKind = 'writable' | 'read-only' | 'unavailable';

export interface StoreState {
    kind: StoreStateKind;
    reason: string | undefined;
}

export type ReadResult<T> = { available: true; value: T } | { available: false; reason: string };

export interface SpecStatusRecord {
    stem: string;
    observedAt: string;
    entry: JsonValue;
}

export type RefusalCode = 'read-only' | 'unavailable' | 'newer-version' | 'storage-failed';

export class RuntimeRefusal extends Error {
    constructor(
        readonly code: RefusalCode,
        message: string,
    ) {
        super(message);
        this.name = 'RuntimeRefusal';
    }
}
