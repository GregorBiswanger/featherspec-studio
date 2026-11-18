import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Envelope } from '../shared/protocol/envelope';
import { createClient, type ShellClient } from './client';
import { createFetchProbe } from './probe';

const clients: ShellClient[] = [];

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    vi.useRealTimers();
});

describe('AC-020: the test-mode probe in the panel UI', () => {
    it('a fetch that fails or is refused answers failed; only a successful fetch answers loaded; the answer never carries content', async () => {
        expect(await createFetchProbe(async () => Promise.reject(new Error('blocked by CSP')))('vscode-webview://x/AGENTS.md')).toBe('failed');
        expect(await createFetchProbe(async () => ({ ok: false }))('u')).toBe('failed');
        expect(await createFetchProbe(async () => ({ ok: true }))('u')).toBe('loaded');
    });

    it('a fetch that never settles answers failed after the probe timeout instead of staying silent', async () => {
        vi.useFakeTimers();
        const outcome = createFetchProbe(() => new Promise(() => undefined), 3000)('u');
        await vi.advanceTimersByTimeAsync(2999);
        let settled = false;
        void outcome.then(() => {
            settled = true;
        });
        await vi.advanceTimersByTimeAsync(0);
        expect(settled).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        await expect(outcome).resolves.toBe('failed');
    });

    it('answers a probe event with probeResult and posts nothing else about it', async () => {
        vi.useFakeTimers();
        const posted: Envelope[] = [];
        const client = createClient({ post: (message) => void posted.push(message), probe: async (url) => (url.endsWith('AGENTS.md') ? 'failed' : 'loaded') });
        clients.push(client);
        client.start();
        client.receive({ v: 2, kind: 'evt', type: 'probe', payload: { url: 'vscode-webview://x/AGENTS.md' } });
        await vi.advanceTimersByTimeAsync(0);
        const result = posted.find((message) => message.type === 'probeResult');
        expect(result).toMatchObject({ v: 2, kind: 'req', type: 'probeResult', payload: { outcome: 'failed' } });
        expect(JSON.stringify(result)).not.toContain('AGENTS.md');
    });

    it('control: without a probe (normal mode) a probe event does nothing', async () => {
        vi.useFakeTimers();
        const posted: Envelope[] = [];
        const client = createClient({ post: (message) => void posted.push(message) });
        clients.push(client);
        client.start();
        client.receive({ v: 2, kind: 'evt', type: 'probe', payload: { url: 'vscode-webview://x/AGENTS.md' } });
        await vi.advanceTimersByTimeAsync(0);
        expect(posted.map((message) => message.type)).toEqual(['hello']);
    });

    it('ignores a probe event with an invalid payload', async () => {
        vi.useFakeTimers();
        const posted: Envelope[] = [];
        const client = createClient({ post: (message) => void posted.push(message), probe: async () => 'loaded' });
        clients.push(client);
        client.start();
        client.receive({ v: 2, kind: 'evt', type: 'probe', payload: { url: 4 } });
        await vi.advanceTimersByTimeAsync(0);
        expect(posted.map((message) => message.type)).toEqual(['hello']);
    });
});
