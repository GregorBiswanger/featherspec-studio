import { isRecord } from './envelope';

export interface RowField {
    label: string;
    text: string;
}

export interface TimelineRow {
    key: number;
    kind: string;
    time: string;
    source: string;
    fields: RowField[];
}

export interface TimelinePayload {
    runId: string;
    rows: TimelineRow[];
    hasEarlier: boolean;
}

export function exactly(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
    const keys = Object.keys(value);
    return required.every((key) => key in value) && keys.every((key) => required.includes(key) || optional.includes(key));
}

export function isText(value: unknown): value is string {
    return typeof value === 'string';
}

function isField(value: unknown): value is RowField {
    return isRecord(value) && exactly(value, ['label', 'text']) && isText(value.label) && isText(value.text);
}

export function isTimelineRow(value: unknown): value is TimelineRow {
    return (
        isRecord(value) &&
        exactly(value, ['key', 'kind', 'time', 'source', 'fields']) &&
        typeof value.key === 'number' &&
        Number.isInteger(value.key) &&
        isText(value.kind) &&
        isText(value.time) &&
        isText(value.source) &&
        Array.isArray(value.fields) &&
        value.fields.every(isField)
    );
}

export function isTimelinePayload(value: unknown): value is TimelinePayload {
    return (
        isRecord(value) &&
        exactly(value, ['runId', 'rows', 'hasEarlier']) &&
        isText(value.runId) &&
        value.runId.length > 0 &&
        typeof value.hasEarlier === 'boolean' &&
        Array.isArray(value.rows) &&
        value.rows.every(isTimelineRow)
    );
}
