export const OPEN_STATUSES = ['Starting', 'Running', 'WaitingForApproval', 'WaitingForInput'] as const;
export const END_STATUSES = ['Completed', 'Failed', 'Cancelled', 'Interrupted'] as const;
export const RUN_STATUSES = [...OPEN_STATUSES, ...END_STATUSES] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export const NOT_AVAILABLE = 'not available';
export const FORMAT_VERSION = 1;
export const MAX_PAGE_SIZE = 500;
export const MAX_EVENTS_PER_RUN = 20_000;
export const HEARTBEAT_INTERVAL_MS = 10_000;
export const LOCK_STALE_MS = 60_000;
export const DEFAULT_MAX_AGE_DAYS = 90;

export function isRunStatus(value: unknown): value is RunStatus {
    return typeof value === 'string' && (RUN_STATUSES as readonly string[]).includes(value);
}

export function isEndStatus(status: RunStatus): boolean {
    return (END_STATUSES as readonly string[]).includes(status);
}

export interface SpecReference {
    stem: string;
    path: string;
}

export interface StatusEntry {
    status: RunStatus;
    at: string;
    cause?: string;
}

export interface RunView {
    runId: string;
    providerId: string;
    model: string;
    spec: SpecReference;
    sessionRef: string | undefined;
    status: RunStatus;
    statusHistory: readonly StatusEntry[];
    created: string;
    started: string | undefined;
    ended: string | undefined;
    errorClass: string | undefined;
    errorMessage: string | undefined;
    result: JsonValue | undefined;
    historyIncomplete: boolean;
    historyUnreadable: boolean;
    newerVersion: boolean;
}

export interface CreateRunInput {
    providerId: string;
    spec: SpecReference;
    model?: string;
    sessionRef?: string;
}

export interface StatusReport {
    cause?: string;
    model?: string;
    sessionRef?: string;
    errorClass?: string;
    errorMessage?: string;
    result?: JsonValue;
}

export interface EventInput {
    type: string;
    payload: JsonValue;
    occurredAt?: string;
    providerEventId?: string;
}

export interface StoredEvent {
    runId: string;
    seq: number;
    occurredAt: string | undefined;
    receivedAt: string;
    type: string;
    payload: JsonValue;
    providerEventId: string | undefined;
}

export type AppendOutcome =
    | { outcome: 'stored'; seq: number }
    | { outcome: 'duplicate' }
    | { outcome: 'dropped' };

export type StoreStateKind = 'writable' | 'read-only' | 'unavailable';

export interface StoreState {
    kind: StoreStateKind;
    reason: string | undefined;
}

export type ReadResult<T> = { available: true; value: T } | { available: false; reason: string };

export interface RunQuery {
    stem?: string;
}

export interface SpecStatusRecord {
    stem: string;
    observedAt: string;
    entry: JsonValue;
}

export interface ClearResult {
    removed: number;
    failed: number;
}

export type RefusalCode =
    | 'unknown-run'
    | 'invalid-status'
    | 'read-only'
    | 'unavailable'
    | 'storage-failed';

export class RuntimeRefusal extends Error {
    constructor(
        readonly code: RefusalCode,
        message: string,
    ) {
        super(message);
        this.name = 'RuntimeRefusal';
    }
}

export function normalizeMaxAgeDays(value: unknown): number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : DEFAULT_MAX_AGE_DAYS;
}
