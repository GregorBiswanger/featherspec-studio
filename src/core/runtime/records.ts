import { isTruncatedJson } from './truncatedJson';
import { FORMAT_VERSION, type JsonValue } from './model';

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
