import { describe, expect, it } from 'vitest';
import { waitFor } from './waitFor';

describe('waitFor', () => {
    it('returns the observed value as soon as it is done', async () => {
        let calls = 0;
        const value = await waitFor('a counter of 3', () => (calls += 1), (observed) => observed >= 3, { timeoutMs: 1000, intervalMs: 1 });
        expect(value).toBe(3);
    });

    it('names what it waited for and the last observed state when it times out', async () => {
        const failure = waitFor('the store to be writable', () => ({ kind: 'unavailable', reason: 'no scheme' }), () => false, { timeoutMs: 30, intervalMs: 5 });
        await expect(failure).rejects.toThrow(/Timed out after \d+ ms waiting for the store to be writable; last observed: \{"kind":"unavailable","reason":"no scheme"\}/);
    });

    it('reports an observation that throws instead of hiding it', async () => {
        const failure = waitFor(
            'the view',
            () => {
                throw new Error('no panel');
            },
            () => true,
            { timeoutMs: 20, intervalMs: 5 },
        );
        await expect(failure).rejects.toThrow('last observed: observing threw: no panel');
    });

    it('keeps polling after a throwing observation and succeeds when it recovers', async () => {
        let calls = 0;
        const value = await waitFor(
            'recovery',
            () => {
                calls += 1;
                if (calls < 3) {
                    throw new Error('not yet');
                }
                return 'ok';
            },
            (observed) => observed === 'ok',
            { timeoutMs: 1000, intervalMs: 1 },
        );
        expect(value).toBe('ok');
    });

    it('shortens a very long observed state', async () => {
        const failure = waitFor('x', () => 'a'.repeat(5000), () => false, { timeoutMs: 10, intervalMs: 2 });
        await expect(failure).rejects.toThrow(/a{800}\.\.\.$/);
    });
});
