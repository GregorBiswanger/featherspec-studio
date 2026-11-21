import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createBridge, fromBase64, toBase64 } from './bridge';
import type { NativeHost } from './contract';

function fakeNative(): { native: NativeHost; frames: Record<string, unknown>[]; raw: string[] } {
    const frames: Record<string, unknown>[] = [];
    const raw: string[] = [];
    return {
        native: {
            send(frame) {
                raw.push(frame);
                frames.push(JSON.parse(frame) as Record<string, unknown>);
            },
        },
        frames,
        raw,
    };
}

describe('embedded bridge (R-3: asynchronous only, one JSON frame per message)', () => {
    it('sends a call frame with a fresh id and the contract name, and resolves with the ok value', async () => {
        const { native, frames } = fakeNative();
        const bridge = createBridge(native);
        const pending = bridge.callAsync<string>('fs.readText', { root: 'file:///p', relativePath: 'a.md' });
        expect(frames).toEqual([{ k: 'call', id: expect.any(String), name: 'fs.readText', args: { root: 'file:///p', relativePath: 'a.md' } }]);
        const id = frames[0].id as string;
        bridge.resolve(id, '{"ok":"hello"}');
        await expect(pending).resolves.toBe('hello');
    });

    it('gives every call its own id and resolves out of order by id', async () => {
        const { native, frames } = fakeNative();
        const bridge = createBridge(native);
        const first = bridge.callAsync<number>('fs.stat', {});
        const second = bridge.callAsync<number>('fs.stat', {});
        const [firstId, secondId] = frames.map((frame) => frame.id as string);
        expect(firstId).not.toBe(secondId);
        bridge.resolve(secondId, '{"ok":2}');
        bridge.resolve(firstId, '{"ok":1}');
        await expect(second).resolves.toBe(2);
        await expect(first).resolves.toBe(1);
    });

    it('rejects with the host error text when the resolve carries an error', async () => {
        const { native, frames } = fakeNative();
        const bridge = createBridge(native);
        const pending = bridge.callAsync<string>('http.get', { url: 'https://example.invalid' });
        bridge.resolve(frames[0].id as string, '{"error":"offline"}');
        await expect(pending).rejects.toThrow('offline');
    });

    it('ignores a resolve for an unknown id without throwing', () => {
        const { native } = fakeNative();
        const bridge = createBridge(native);
        expect(() => bridge.resolve('unknown', '{"ok":null}')).not.toThrow();
    });

    it('has no synchronous call member (AC-006, R-3)', () => {
        const { native } = fakeNative();
        const bridge = createBridge(native);
        expect(Object.keys(bridge).sort()).toEqual(['callAsync', 'emit', 'failed', 'ready', 'reply', 'resolve']);
    });

    it('sends emit, reply, ready and failed frames in the frame protocol shape', () => {
        const { native, frames } = fakeNative();
        const bridge = createBridge(native);
        bridge.emit('log', ['line']);
        bridge.reply('7', { ok: { jsHeapBytes: 1 } });
        bridge.reply('8', { error: 'bad' });
        bridge.ready();
        bridge.failed('boom');
        expect(frames).toEqual([
            { k: 'emit', channel: 'log', payload: ['line'] },
            { k: 'reply', id: '7', ok: { jsHeapBytes: 1 } },
            { k: 'reply', id: '8', error: 'bad' },
            { k: 'ready' },
            { k: 'failed', error: 'boom' },
        ]);
    });

    it('encodes bytes to base64 and decodes them back for every length modulo three (R-3)', () => {
        for (let length = 0; length < 12; length += 1) {
            const bytes = new Uint8Array(randomBytes(length));
            const text = toBase64(bytes);
            expect(text).toBe(Buffer.from(bytes).toString('base64'));
            expect(Array.from(fromBase64(text))).toEqual(Array.from(bytes));
        }
    });

    it('decodes base64 produced by Buffer on random bytes', () => {
        const bytes = new Uint8Array(randomBytes(4096));
        expect(Array.from(fromBase64(Buffer.from(bytes).toString('base64')))).toEqual(Array.from(bytes));
    });
});
