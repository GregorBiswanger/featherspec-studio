import type { AsyncCall, EmitChannel, NativeHost } from './contract';

export interface BridgeStats {
    calls: number;
    frames: number;
}

export interface Bridge {
    callAsync<T>(name: AsyncCall, args: unknown): Promise<T>;
    resolve(id: string, resultJson: string): void;
    resolveMany(batchJson: string): void;
    emit(channel: EmitChannel, payload: unknown): void;
    reply(id: string, result: { ok: unknown } | { error: string }): void;
    ready(): void;
    failed(error: string): void;
    stats(): BridgeStats;
}

interface Pending {
    resolve(value: unknown): void;
    reject(error: Error): void;
}

interface QueuedCall {
    id: string;
    name: AsyncCall;
    args: unknown;
}

export function createBridge(native: NativeHost): Bridge {
    const pending = new Map<string, Pending>();
    let queued: QueuedCall[] = [];
    let sequence = 0;
    let callsSent = 0;
    let framesSent = 0;
    const transmit = (frame: Record<string, unknown>): void => {
        framesSent += 1;
        native.send(JSON.stringify(frame));
    };
    const flush = (): void => {
        if (queued.length === 0) {
            return;
        }
        const batch = queued;
        queued = [];
        callsSent += batch.length;
        if (batch.length === 1) {
            const [only] = batch;
            transmit({ k: 'call', id: only.id, name: only.name, args: only.args });
            return;
        }
        transmit({ k: 'calls', calls: batch.map((call) => ({ id: call.id, name: call.name, args: call.args })) });
    };
    const send = (frame: Record<string, unknown>): void => {
        flush();
        transmit(frame);
    };
    const settle = (id: string, parsed: unknown): void => {
        const entry = pending.get(id);
        if (entry === undefined) {
            return;
        }
        pending.delete(id);
        if (isRecord(parsed) && typeof parsed.error === 'string') {
            entry.reject(new Error(parsed.error));
            return;
        }
        entry.resolve(isRecord(parsed) ? parsed.ok : undefined);
    };
    return {
        callAsync<T>(name: AsyncCall, args: unknown): Promise<T> {
            sequence += 1;
            const id = String(sequence);
            return new Promise<T>((resolve, reject) => {
                pending.set(id, { resolve: (value) => resolve(value as T), reject });
                queued.push({ id, name, args });
                if (queued.length === 1) {
                    queueMicrotask(flush);
                }
            });
        },
        resolve(id, resultJson) {
            settle(id, JSON.parse(resultJson));
        },
        resolveMany(batchJson) {
            const parsed: unknown = JSON.parse(batchJson);
            if (!Array.isArray(parsed)) {
                return;
            }
            for (const entry of parsed as unknown[]) {
                if (isRecord(entry) && typeof entry.id === 'string') {
                    settle(entry.id, entry);
                }
            }
        },
        emit(channel, payload) {
            send({ k: 'emit', channel, payload });
        },
        reply(id, result) {
            send({ k: 'reply', id, ...result });
        },
        ready() {
            send({ k: 'ready' });
        },
        failed(error) {
            send({ k: 'failed', error });
        },
        stats() {
            return { calls: callsSent, frames: framesSent };
        },
    };
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function toBase64(bytes: Uint8Array): string {
    let text = '';
    for (let index = 0; index < bytes.length; index += 3) {
        const first = bytes[index];
        const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
        const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
        const group = (first << 16) | (second << 8) | third;
        text += ALPHABET[(group >> 18) & 63] + ALPHABET[(group >> 12) & 63];
        text += index + 1 < bytes.length ? ALPHABET[(group >> 6) & 63] : '=';
        text += index + 2 < bytes.length ? ALPHABET[group & 63] : '=';
    }
    return text;
}

export function fromBase64(text: string): Uint8Array {
    const bytes: number[] = [];
    let buffer = 0;
    let bits = 0;
    for (const character of text.replace(/=+$/, '')) {
        const value = ALPHABET.indexOf(character);
        if (value < 0) {
            throw new Error('Invalid base64 text');
        }
        buffer = ((buffer << 6) | value) & 0xffff;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            bytes.push((buffer >> bits) & 0xff);
        }
    }
    return Uint8Array.from(bytes);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
