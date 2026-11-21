import type { AsyncCall, EmitChannel, NativeHost } from './contract';

export interface Bridge {
    callAsync<T>(name: AsyncCall, args: unknown): Promise<T>;
    resolve(id: string, resultJson: string): void;
    emit(channel: EmitChannel, payload: unknown): void;
    reply(id: string, result: { ok: unknown } | { error: string }): void;
    ready(): void;
    failed(error: string): void;
}

interface Pending {
    resolve(value: unknown): void;
    reject(error: Error): void;
}

export function createBridge(native: NativeHost): Bridge {
    const pending = new Map<string, Pending>();
    let sequence = 0;
    const send = (frame: Record<string, unknown>): void => native.send(JSON.stringify(frame));
    return {
        callAsync<T>(name: AsyncCall, args: unknown): Promise<T> {
            sequence += 1;
            const id = String(sequence);
            return new Promise<T>((resolve, reject) => {
                pending.set(id, { resolve: (value) => resolve(value as T), reject });
                send({ k: 'call', id, name, args });
            });
        },
        resolve(id, resultJson) {
            const entry = pending.get(id);
            const parsed: unknown = JSON.parse(resultJson);
            if (entry === undefined) {
                return;
            }
            pending.delete(id);
            if (isRecord(parsed) && typeof parsed.error === 'string') {
                entry.reject(new Error(parsed.error));
                return;
            }
            entry.resolve(isRecord(parsed) ? parsed.ok : undefined);
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
