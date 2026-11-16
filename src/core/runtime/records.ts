import { isTruncatedJson } from './truncatedJson';
import { FORMAT_VERSION, isRunStatus, type JsonValue, type RunStatus, type SpecReference } from './model';

export interface CreatedRecord {
    v: number;
    k: 'created';
    runId: string;
    providerId: string;
    spec: SpecReference;
    model?: string;
    sessionRef?: string;
    at: string;
}

export interface StatusRecord {
    v: number;
    k: 'status';
    status: RunStatus;
    at: string;
    cause?: string;
    model?: string;
    sessionRef?: string;
    errorClass?: string;
    errorMessage?: string;
    result?: JsonValue;
}

export interface FlagRecord {
    v: number;
    k: 'flag';
    at: string;
}

export type RunRecord = CreatedRecord | StatusRecord | FlagRecord;

export interface EventRecord {
    v: number;
    seq: number;
    runId: string;
    occurredAt?: string;
    receivedAt: string;
    type: string;
    payload: JsonValue;
    providerEventId?: string;
}

export interface HistoryRecord {
    v: number;
    stem: string;
    observedAt: string;
    entry: JsonValue;
}

export type ParsedLine<T> = { kind: 'record'; record: T } | { kind: 'newer' } | { kind: 'incomplete' } | { kind: 'broken' };

function unparsable(text: string): ParsedLine<never> {
    return isTruncatedJson(text) ? { kind: 'incomplete' } : { kind: 'broken' };
}

function parseObject(text: string): Record<string, unknown> | undefined {
    try {
        const value: unknown = JSON.parse(text);
        return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
    } catch {
        return undefined;
    }
}

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function optionalString(value: unknown): boolean {
    return value === undefined || typeof value === 'string';
}

export function parseRunRecord(text: string): ParsedLine<RunRecord> {
    const object = parseObject(text);
    if (object === undefined) {
        return unparsable(text);
    }
    if (typeof object['v'] !== 'number') {
        return { kind: 'broken' };
    }
    if (object['v'] !== FORMAT_VERSION) {
        return object['v'] > FORMAT_VERSION ? { kind: 'newer' } : { kind: 'broken' };
    }
    const spec = object['spec'] as Record<string, unknown> | undefined;
    if (object['k'] === 'created') {
        const valid =
            isString(object['runId']) &&
            isString(object['providerId']) &&
            isString(object['at']) &&
            typeof spec === 'object' &&
            spec !== null &&
            isString(spec['stem']) &&
            isString(spec['path']) &&
            optionalString(object['model']) &&
            optionalString(object['sessionRef']);
        return valid ? { kind: 'record', record: object as unknown as CreatedRecord } : { kind: 'broken' };
    }
    if (object['k'] === 'status') {
        const valid =
            isRunStatus(object['status']) &&
            isString(object['at']) &&
            optionalString(object['cause']) &&
            optionalString(object['model']) &&
            optionalString(object['sessionRef']) &&
            optionalString(object['errorClass']) &&
            optionalString(object['errorMessage']);
        return valid ? { kind: 'record', record: object as unknown as StatusRecord } : { kind: 'broken' };
    }
    if (object['k'] === 'flag' && isString(object['at'])) {
        return { kind: 'record', record: object as unknown as FlagRecord };
    }
    return { kind: 'broken' };
}

export function parseEventRecord(text: string): ParsedLine<EventRecord> {
    const object = parseObject(text);
    if (object === undefined) {
        return unparsable(text);
    }
    if (typeof object['v'] !== 'number') {
        return { kind: 'broken' };
    }
    if (object['v'] !== FORMAT_VERSION) {
        return object['v'] > FORMAT_VERSION ? { kind: 'newer' } : { kind: 'broken' };
    }
    const valid =
        typeof object['seq'] === 'number' &&
        isString(object['runId']) &&
        isString(object['receivedAt']) &&
        isString(object['type']) &&
        'payload' in object &&
        optionalString(object['occurredAt']) &&
        optionalString(object['providerEventId']);
    return valid ? { kind: 'record', record: object as unknown as EventRecord } : { kind: 'broken' };
}

export function parseHistoryRecord(text: string): ParsedLine<HistoryRecord> {
    const object = parseObject(text);
    if (object === undefined) {
        return unparsable(text);
    }
    if (typeof object['v'] !== 'number') {
        return { kind: 'broken' };
    }
    if (object['v'] !== FORMAT_VERSION) {
        return object['v'] > FORMAT_VERSION ? { kind: 'newer' } : { kind: 'broken' };
    }
    const valid = isString(object['stem']) && isString(object['observedAt']) && 'entry' in object;
    return valid ? { kind: 'record', record: object as unknown as HistoryRecord } : { kind: 'broken' };
}

export function encodeLine(record: object): string {
    return `${JSON.stringify(record)}\n`;
}
