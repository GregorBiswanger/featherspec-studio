import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createBridge, fromBase64, toBase64 } from './bridge';
import type { NativeHost } from './contract';

function tick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

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
        await tick();
        expect(frames).toEqual([{ k: 'call', id: expect.any(String), name: 'fs.readText', args: { root: 'file:///p', relativePath: 'a.md' } }]);
        const id = frames[0].id as string;
        bridge.resolve(id, '{"ok":"hello"}');
        await expect(pending).resolves.toBe('hello');
    });

    it('gives every call its own id and resolves out of order by id', async () => {
        const { native, frames } = fakeNative();
        const bridge = createBridge(native);
        const first = bridge.callAsync<number>('fs.stat', {});
        await tick();
        const second = bridge.callAsync<number>('fs.stat', {});
        await tick();
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
        await tick();
        bridge.resolve(frames[0].id as string, '{"error":"offline"}');
        await expect(pending).rejects.toThrow('offline');
    });

    it('sends calls issued in the same tick as one calls frame, in order, with unique ids', async () => {
        const { native, frames } = fakeNative();
        const bridge = createBridge(native);
        const first = bridge.callAsync<number>('source.stat', { relativePath: 'a' });
        const second = bridge.callAsync<number>('source.readBytes', { relativePath: 'b' });
        const third = bridge.callAsync<number>('source.stat', { relativePath: 'c' });
        expect(frames).toHaveLength(0);
        await tick();
        expect(frames).toHaveLength(1);
        const calls = (frames[0] as { k: string; calls: { id: string; name: string; args: unknown }[] }).calls;
        expect(frames[0].k).toBe('calls');
        expect(Object.keys(frames[0]).sort()).toEqual(['calls', 'k']);
        expect(calls.map((call) => call.name)).toEqual(['source.stat', 'source.readBytes', 'source.stat']);
        expect(calls.map((call) => call.args)).toEqual([{ relativePath: 'a' }, { relativePath: 'b' }, { relativePath: 'c' }]);
        expect(new Set(calls.map((call) => call.id)).size).toBe(3);
        expect(Object.keys(calls[0]).sort()).toEqual(['args', 'id', 'name']);
        bridge.resolveMany(JSON.stringify([{ id: calls[2].id, ok: 3 }, { id: calls[0].id, ok: 1 }, { id: calls[1].id, ok: 2 }]));
        await expect(Promise.all([first, second, third])).resolves.toEqual([1, 2, 3]);
    });

    it('sends a lone call as the unchanged call frame', async () => {
        const { native, frames } = fakeNative();
        const bridge = createBridge(native);
        void bridge.callAsync('source.stat', { relativePath: 'a' });
        await tick();
        expect(frames).toEqual([{ k: 'call', id: expect.any(String), name: 'source.stat', args: { relativePath: 'a' } }]);
    });

    it('flushes queued calls before any other frame so the order of frames is kept', async () => {
        const { native, frames } = fakeNative();
        const bridge = createBridge(native);
        void bridge.callAsync('source.stat', {});
        void bridge.callAsync('source.stat', {});
        bridge.emit('log', ['x']);
        void bridge.callAsync('source.stat', {});
        bridge.ready();
        await tick();
        expect(frames.map((frame) => frame.k)).toEqual(['calls', 'emit', 'call', 'ready']);
    });

    it('starts a new batch for calls issued in a later tick', async () => {
        const { native, frames } = fakeNative();
        const bridge = createBridge(native);
        void bridge.callAsync('source.stat', {});
        void bridge.callAsync('source.stat', {});
        await tick();
        void bridge.callAsync('source.stat', {});
        void bridge.callAsync('source.stat', {});
        await tick();
        expect(frames.map((frame) => frame.k)).toEqual(['calls', 'calls']);
    });

    it('resolves many with ok values and errors per entry exactly like resolve, and skips unknown ids', async () => {
        const { native, frames } = fakeNative();
        const bridge = createBridge(native);
        const ok = bridge.callAsync<unknown>('fs.stat', {});
        const failed = bridge.callAsync<unknown>('fs.stat', {});
        const empty = bridge.callAsync<unknown>('fs.stat', {});
        await tick();
        const calls = (frames[0] as { calls: { id: string }[] }).calls;
        bridge.resolveMany(JSON.stringify([{ id: 'unknown', ok: 0 }, { id: calls[0].id, ok: { a: [1] } }, { id: calls[1].id, error: 'nope' }, { id: calls[2].id }]));
        await expect(ok).resolves.toEqual({ a: [1] });
        await expect(failed).rejects.toThrow('nope');
        await expect(empty).resolves.toBeUndefined();
    });

    it('resolves the entries before a malformed one and ignores non-record entries', async () => {
        const { native, frames } = fakeNative();
        const bridge = createBridge(native);
        const first = bridge.callAsync<number>('fs.stat', {});
        const second = bridge.callAsync<number>('fs.stat', {});
        await tick();
        const calls = (frames[0] as { calls: { id: string }[] }).calls;
        bridge.resolveMany(JSON.stringify([null, 7, { ok: 1 }, { id: calls[0].id, ok: 10 }, { id: calls[1].id, ok: 20 }]));
        await expect(first).resolves.toBe(10);
        await expect(second).resolves.toBe(20);
    });

    it('counts the calls and the frames it sent', async () => {
        const { native } = fakeNative();
        const bridge = createBridge(native);
        expect(bridge.stats()).toEqual({ calls: 0, frames: 0 });
        void bridge.callAsync('source.stat', {});
        void bridge.callAsync('source.stat', {});
        void bridge.callAsync('source.stat', {});
        await tick();
        expect(bridge.stats()).toEqual({ calls: 3, frames: 1 });
        bridge.emit('log', []);
        void bridge.callAsync('source.stat', {});
        await tick();
        expect(bridge.stats()).toEqual({ calls: 4, frames: 3 });
    });

    it('ignores a resolve for an unknown id without throwing', () => {
        const { native } = fakeNative();
        const bridge = createBridge(native);
        expect(() => bridge.resolve('unknown', '{"ok":null}')).not.toThrow();
    });

    it('has no synchronous call member (AC-006, R-3)', () => {
        const { native } = fakeNative();
        const bridge = createBridge(native);
        expect(Object.keys(bridge).sort()).toEqual(['callAsync', 'emit', 'failed', 'ready', 'reply', 'resolve', 'resolveMany', 'stats']);
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
