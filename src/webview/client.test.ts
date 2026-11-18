import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Envelope } from '../shared/protocol/envelope';
import { createClient, type ShellClient } from './client';
import { baseView, shellEvent } from './testing/dom';

let posted: Envelope[];
let clients: ShellClient[];

function make(reloaded = false): ShellClient {
    const client = createClient({ post: (message) => void posted.push(message), reloaded });
    clients.push(client);
    client.start();
    return client;
}

beforeEach(() => {
    vi.useFakeTimers();
    posted = [];
    clients = [];
});

afterEach(() => {
    clients.forEach((client) => client.stop());
    vi.useRealTimers();
});

describe('AC-016, OP-008: version mismatch', () => {
    it('shows S6 when an inbound message carries another protocol version, whatever the host state says', () => {
        const client = make();
        client.receive(shellEvent(baseView({ state: { id: 'S2' } }), 1));
        expect(client.getSnapshot().state).toEqual({ id: 'S2' });
        client.receive({ v: 8, kind: 'evt', type: 'shell', seq: 2, payload: { view: baseView({ state: { id: 'S2' } }) } });
        expect(client.getSnapshot().state).toEqual({ id: 'S6' });
    });

    it('shows S6 for a versionMismatch event of the current version, and S6 wins over S1', () => {
        const client = make();
        client.receive(shellEvent(baseView({ state: { id: 'S1' } }), 1));
        client.receive({ v: 7, kind: 'evt', type: 'versionMismatch', payload: {} });
        expect(client.getSnapshot().state).toEqual({ id: 'S6' });
    });

    it('control: messages of the current version never give S6', () => {
        const client = make();
        client.receive(shellEvent(baseView(), 1));
        client.receive({ v: 7, kind: 'res', id: 'x', type: 'navigate', payload: { ok: true } });
        expect(client.getSnapshot().state).toBeUndefined();
    });

    it('a second mismatch right after a reload shows S5 with the protocol reason, never S6 again', () => {
        const client = make(true);
        client.receive({ v: 8, kind: 'evt', type: 'shell', seq: 1, payload: {} });
        expect(client.getSnapshot().state).toEqual({ id: 'S5', reason: { cause: 'protocol' } });
    });

    it('Reload sends runAction reload', () => {
        const client = make();
        client.runAction('reload');
        expect(posted.at(-1)).toMatchObject({ type: 'runAction', payload: { action: 'reload' } });
    });
});

describe('AC-015: S5 because panel UI and extension cannot agree', () => {
    it('no valid shell event within 5 seconds of hello gives S5 with the protocol reason', () => {
        const client = make();
        expect(client.getSnapshot().state).toEqual({ id: 'S4' });
        vi.advanceTimersByTime(4999);
        expect(client.getSnapshot().state).toEqual({ id: 'S4' });
        vi.advanceTimersByTime(1);
        expect(client.getSnapshot().state).toEqual({ id: 'S5', reason: { cause: 'protocol' } });
    });

    it('control: a valid shell event within the time keeps S5 away and cancels the timer', () => {
        const client = make();
        vi.advanceTimersByTime(2000);
        client.receive(shellEvent(baseView(), 1));
        vi.advanceTimersByTime(10000);
        expect(client.getSnapshot().state).toBeUndefined();
    });

    it('a shell event that fails validation gives S5, and the next valid one recovers', () => {
        const client = make();
        client.receive({ v: 7, kind: 'evt', type: 'shell', seq: 1, payload: { view: { area: 'nowhere' } } });
        expect(client.getSnapshot().state).toEqual({ id: 'S5', reason: { cause: 'protocol' } });
        client.receive(shellEvent(baseView({ state: { id: 'S2' } }), 2));
        expect(client.getSnapshot().state).toEqual({ id: 'S2' });
    });

    it('a host state S5 passes through unchanged', () => {
        const client = make();
        const state = { id: 'S5', reason: { cause: 'discovery', message: 'boom' } } as const;
        client.receive(shellEvent(baseView({ state }), 1));
        expect(client.getSnapshot().state).toEqual(state);
    });
});

describe('0022 AC-024: the side panel width requests', () => {
    it('setSideWidth sends the fraction and resetSideWidth an empty payload', () => {
        const client = make();
        client.setSideWidth(0.6);
        expect(posted.at(-1)).toMatchObject({ kind: 'req', type: 'setSideWidth', payload: { fraction: 0.6 } });
        client.resetSideWidth();
        expect(posted.at(-1)).toMatchObject({ kind: 'req', type: 'resetSideWidth', payload: {} });
        expect(posted.filter((message) => message.type === 'setSideWidth' || message.type === 'resetSideWidth')).toHaveLength(2);
    });
});
