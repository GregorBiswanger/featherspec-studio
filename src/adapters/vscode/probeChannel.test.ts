import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProbeChannel } from './probeChannel';

afterEach(() => {
    vi.useRealTimers();
});

function setup(options: { ready: boolean }) {
    vi.useFakeTimers();
    const sent: string[] = [];
    const channel = createProbeChannel({ send: (url) => void sent.push(url), helloTimeoutMs: 1000, answerTimeoutMs: 2000, describe: () => 'panel visible: yes' });
    if (options.ready) {
        channel.markReady();
    }
    return { channel, sent };
}

describe('AC-020: the host side of the test-mode probe', () => {
    it('sends nothing before the webview said hello, then sends once it did', async () => {
        const { channel, sent } = setup({ ready: false });
        const result = channel.probe('u1');
        await vi.advanceTimersByTimeAsync(500);
        expect(sent).toEqual([]);
        channel.markReady();
        expect(sent).toEqual(['u1']);
        channel.answer('failed');
        await expect(result).resolves.toBe('failed');
    });

    it('sends at once when the webview is ready and resolves with the answer', async () => {
        const { channel, sent } = setup({ ready: true });
        const result = channel.probe('u1');
        expect(sent).toEqual(['u1']);
        channel.answer('loaded');
        await expect(result).resolves.toBe('loaded');
    });

    it('a webview that never says hello rejects with what was observed and sends nothing', async () => {
        const { channel, sent } = setup({ ready: false });
        const result = channel.probe('u1');
        const assertion = expect(result).rejects.toThrow(/no hello within 1000 ms.*nothing was sent.*panel visible: yes/s);
        await vi.advanceTimersByTimeAsync(1000);
        await assertion;
        expect(sent).toEqual([]);
    });

    it('a webview that says hello but never answers rejects with the wait and the probe state', async () => {
        const { channel, sent } = setup({ ready: true });
        const result = channel.probe('u1');
        const assertion = expect(result).rejects.toThrow(/no answer within 2000 ms.*hello seen.*panel visible: yes/s);
        await vi.advanceTimersByTimeAsync(2000);
        await assertion;
        expect(sent).toEqual(['u1']);
    });

    it('a webview that reloads before it answers (not ready again) makes the probe wait for the next hello and send again', async () => {
        const { channel, sent } = setup({ ready: true });
        const result = channel.probe('u1');
        channel.markNotReady();
        channel.markReady();
        expect(sent).toEqual(['u1', 'u1']);
        channel.answer('failed');
        await expect(result).resolves.toBe('failed');
    });

    it('control: a late answer after the timeout does not resolve a later probe', async () => {
        const { channel } = setup({ ready: true });
        const first = channel.probe('u1');
        const firstRejected = expect(first).rejects.toThrow();
        await vi.advanceTimersByTimeAsync(2000);
        await firstRejected;
        const second = channel.probe('u2');
        channel.answer('loaded');
        await expect(second).resolves.toBe('loaded');
    });
});
