export const PROTOCOL_VERSION = 5;

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export const ENVELOPE_KINDS = ['req', 'res', 'evt'] as const;
export type EnvelopeKind = (typeof ENVELOPE_KINDS)[number];

export interface Envelope {
    v: number;
    kind: EnvelopeKind;
    id?: string;
    seq?: number;
    type: string;
    payload: unknown;
}

export type EnvelopeRead = { ok: true; envelope: Envelope } | { ok: false; reason: string };

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readEnvelope(raw: unknown): EnvelopeRead {
    if (!isRecord(raw)) {
        return { ok: false, reason: 'not a message' };
    }
    const { v, kind, id, seq, type } = raw;
    if (typeof v !== 'number' || !Number.isInteger(v)) {
        return { ok: false, reason: 'not a message' };
    }
    if (typeof kind !== 'string' || !(ENVELOPE_KINDS as readonly string[]).includes(kind)) {
        return { ok: false, reason: 'not a message' };
    }
    if (typeof type !== 'string' || type.length === 0) {
        return { ok: false, reason: 'not a message' };
    }
    if (id !== undefined && typeof id !== 'string') {
        return { ok: false, reason: 'not a message' };
    }
    if (seq !== undefined && (typeof seq !== 'number' || !Number.isInteger(seq))) {
        return { ok: false, reason: 'not a message' };
    }
    const envelope: Envelope = { v, kind: kind as EnvelopeKind, type, payload: raw.payload };
    if (id !== undefined) {
        envelope.id = id;
    }
    if (seq !== undefined) {
        envelope.seq = seq;
    }
    return { ok: true, envelope };
}

export function isJsonValue(value: unknown): value is JsonValue {
    if (value === null || typeof value === 'boolean' || typeof value === 'string') {
        return true;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value);
    }
    if (Array.isArray(value)) {
        return value.every(isJsonValue);
    }
    if (isRecord(value)) {
        return Object.values(value).every(isJsonValue);
    }
    return false;
}
