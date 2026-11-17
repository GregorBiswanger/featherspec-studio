import type { RowField, TimelineRow } from '../../shared/protocol/agentCenter';
import {
    AC_NOT_AVAILABLE,
    AC_SOURCE_DERIVED,
    AC_SOURCE_PROVIDER,
    AC_SOURCE_STUDIO,
    AC_TRUNCATED,
    EVENT_KIND_FIELDS,
    EVENT_KIND_WORDS,
    PAYLOAD_FIELD_LABELS,
    acUnknownEvent,
} from '../../shared/protocol/agentCenterTexts';
import type { JsonValue, StoredEvent } from '../runtime/model';

type JsonObject = { [key: string]: JsonValue };

function isObject(value: JsonValue | undefined): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function payloadObject(event: StoredEvent): JsonObject {
    return isObject(event.payload) ? event.payload : {};
}

export function sourceOf(event: StoredEvent): string {
    if (event.type === 'truncated') {
        return AC_SOURCE_STUDIO;
    }
    const source = payloadObject(event)['source'];
    if (source === 'provider') {
        return AC_SOURCE_PROVIDER;
    }
    return source === 'derived' ? AC_SOURCE_DERIVED : AC_NOT_AVAILABLE;
}

export function timeOf(event: StoredEvent): string {
    return event.occurredAt ?? event.receivedAt;
}

function valueText(field: string, value: JsonValue): string {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'boolean') {
        return value ? 'yes' : 'no';
    }
    if (field === 'items' && Array.isArray(value)) {
        return value
            .map((item) => (isObject(item) ? `${item['done'] === true ? '[x]' : '[ ]'} ${String(item['text'] ?? '')}` : String(item)))
            .join('\n');
    }
    if (field === 'totals' && isObject(value)) {
        return Object.entries(value)
            .map(([name, amount]) => `${name}: ${String(amount)}`)
            .join('\n');
    }
    return typeof value === 'number' ? String(value) : JSON.stringify(value);
}

function fieldsOf(type: string, payload: JsonObject): RowField[] {
    const fields: RowField[] = [];
    for (const name of EVENT_KIND_FIELDS[type] ?? []) {
        const value = payload[name];
        if (value !== undefined && value !== null) {
            fields.push({ label: PAYLOAD_FIELD_LABELS[name] ?? name, text: valueText(name, value) });
        }
    }
    return fields;
}

function textOf(event: StoredEvent): string {
    const text = payloadObject(event)['text'];
    return typeof text === 'string' ? text : '';
}

function rowOf(event: StoredEvent): TimelineRow {
    const base = { key: event.seq, time: timeOf(event), source: sourceOf(event) };
    if (event.type === 'truncated') {
        return { ...base, kind: AC_TRUNCATED, fields: [] };
    }
    const word = EVENT_KIND_WORDS[event.type];
    if (word === undefined || event.type === 'provider.unknown') {
        const typeName = payloadObject(event)['typeName'];
        const name = event.type === 'provider.unknown' && typeof typeName === 'string' && typeName.length > 0 ? typeName : event.type;
        return { ...base, kind: acUnknownEvent(name), fields: [] };
    }
    return { ...base, kind: word, fields: fieldsOf(event.type, payloadObject(event)) };
}

export function timelineRows(events: readonly StoredEvent[]): TimelineRow[] {
    const rows: TimelineRow[] = [];
    let group: { row: TimelineRow; text: string } | undefined;
    for (const event of events) {
        if (event.type === 'message.delta') {
            if (group === undefined) {
                const row = rowOf(event);
                rows.push(row);
                group = { row, text: '' };
            }
            group.text += textOf(event);
            group.row.fields = [{ label: PAYLOAD_FIELD_LABELS['text'] ?? 'Text', text: group.text }];
            group.row.time = timeOf(event);
            group.row.source = sourceOf(event);
            continue;
        }
        if (event.type === 'message.completed' && group !== undefined) {
            group.row.fields = fieldsOf(event.type, payloadObject(event));
            group.row.time = timeOf(event);
            group.row.source = sourceOf(event);
            group = undefined;
            continue;
        }
        rows.push(rowOf(event));
    }
    return rows;
}


export function kindText(event: StoredEvent): string {
    return rowOf(event).kind;
}
