import { describe, expect, it } from 'vitest';
import { createMessageRouter } from './messageRouter';
import { PROTOCOL_VERSION, readEnvelope } from '../../shared/protocol/envelope';

describe('0035 T-006: the protocol is version 13', () => {
    it('AC-021 the version is 13', () => {
        expect(PROTOCOL_VERSION).toBe(13);
    });

    it('a request of version 12 is answered with versionMismatch of version 13 and runs no handler', async () => {
        const posted: unknown[] = [];
        const calls: string[] = [];
        const router = createMessageRouter({
            handlers: new Proxy({}, { get: (_target, type) => async () => void calls.push(String(type)) }) as never,
            output: { appendBlock: () => undefined },
            post: (message) => void posted.push(message),
        });
        await router.receive({ v: 12, kind: 'req', id: 'x', type: 'hello', payload: { lastSeq: 0 } });
        expect(calls).toEqual([]);
        expect(posted).toEqual([{ v: 13, kind: 'evt', type: 'versionMismatch', payload: {} }]);
    });

    it('negative control: a request of version 13 reaches its handler', async () => {
        const calls: string[] = [];
        const router = createMessageRouter({
            handlers: new Proxy({}, { get: (_target, type) => async () => void calls.push(String(type)) }) as never,
            output: { appendBlock: () => undefined },
            post: () => undefined,
        });
        await router.receive({ v: 13, kind: 'req', id: 'x', type: 'hello', payload: { lastSeq: 0 } });
        expect(calls).toEqual(['hello']);
        expect(readEnvelope({ v: 13, kind: 'req', type: 'hello' }).ok).toBe(true);
    });
});
