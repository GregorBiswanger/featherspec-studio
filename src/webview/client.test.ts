import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Envelope } from '../shared/protocol/envelope';
import { createClient, type ShellClient } from './client';
import { detailEvent, detailView } from './detail/testing/views';
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
        client.receive({ v: 10, kind: 'evt', type: 'shell', seq: 2, payload: { view: baseView({ state: { id: 'S2' } }) } });
        expect(client.getSnapshot().state).toEqual({ id: 'S6' });
    });

    it('shows S6 for a versionMismatch event of the current version, and S6 wins over S1', () => {
        const client = make();
        client.receive(shellEvent(baseView({ state: { id: 'S1' } }), 1));
        client.receive({ v: 9, kind: 'evt', type: 'versionMismatch', payload: {} });
        expect(client.getSnapshot().state).toEqual({ id: 'S6' });
    });

    it('control: messages of the current version never give S6', () => {
        const client = make();
        client.receive(shellEvent(baseView(), 1));
        client.receive({ v: 9, kind: 'res', id: 'x', type: 'navigate', payload: { ok: true } });
        expect(client.getSnapshot().state).toBeUndefined();
    });

    it('a second mismatch right after a reload shows S5 with the protocol reason, never S6 again', () => {
        const client = make(true);
        client.receive({ v: 10, kind: 'evt', type: 'shell', seq: 1, payload: {} });
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
        client.receive({ v: 9, kind: 'evt', type: 'shell', seq: 1, payload: { view: { area: 'nowhere' } } });
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

describe('0024 AC-005: the send request and the send result', () => {
    const RESULT = { outcome: 'opened', text: "The prompt is in Copilot's chat. Check it, then send it there.", token: 'k3x9-1' };
    const detail = (key: string) => detailEvent(detailView({ key, stem: key.slice(14, -3) }));

    it('sendPrompt posts one sendPrompt request with exactly the assistant, the target, the line and the token', () => {
        const client = make();
        client.sendPrompt({ assistant: 'claudeCode', target: 'new', line: 'Implement T-003 of p', token: 'k3x9-1' });
        expect(posted.at(-1)).toMatchObject({ v: 9, kind: 'req', type: 'sendPrompt', payload: { assistant: 'claudeCode', target: 'new', line: 'Implement T-003 of p', token: 'k3x9-1' } });
        expect(Object.keys(posted.at(-1)!.payload as object).sort()).toEqual(['assistant', 'line', 'target', 'token']);
    });

    it('a sendResult event is kept in the snapshot; a bad payload is dropped', () => {
        const client = make();
        client.receive({ v: 9, kind: 'evt', type: 'sendResult', payload: RESULT });
        expect(client.getSnapshot().sendResult).toEqual(RESULT);
        client.receive({ v: 9, kind: 'evt', type: 'sendResult', payload: { outcome: 'sent', text: 'x' } });
        expect(client.getSnapshot().sendResult).toEqual(RESULT);
    });

    it('the result is dropped, like the copy result, when the detail moves to another spec, and kept for the same spec', () => {
        const client = make();
        client.receive(shellEvent(baseView(), 1));
        client.receive(detail('.specs/active/0001-a.md'));
        client.receive({ v: 9, kind: 'evt', type: 'sendResult', payload: RESULT });
        client.receive({ v: 9, kind: 'evt', type: 'copyResult', payload: { ok: true, text: 'Copied to the clipboard.' } });
        client.receive(detail('.specs/active/0001-a.md'));
        expect(client.getSnapshot().sendResult).toEqual(RESULT);
        expect(client.getSnapshot().copyResult).toBeDefined();
        client.receive(detail('.specs/active/0002-b.md'));
        expect(client.getSnapshot().sendResult).toBeUndefined();
        expect(client.getSnapshot().copyResult).toBeUndefined();
    });
});


describe('0025 AC-006: the client keeps the last focus the host sent', () => {
    it('0025 AC-006: a focus is kept with its n; a later event without one leaves it; a second one replaces it', () => {
        const client = createClient({ post: () => undefined });
        client.start();
        client.receive({ v: 9, kind: 'evt', type: 'shell', seq: 1, payload: { view: baseView({ area: 'planMap' }) } });
        expect(client.getSnapshot().focus).toBeUndefined();
        client.receive({ v: 9, kind: 'evt', type: 'shell', seq: 2, payload: { view: baseView({ area: 'planMap' }), focus: { n: 1, stem: '0001-a', step: 'T-001' } } });
        const first = client.getSnapshot().focus;
        expect(first).toEqual({ n: 1, stem: '0001-a', step: 'T-001' });
        client.receive({ v: 9, kind: 'evt', type: 'shell', seq: 3, payload: { view: baseView({ area: 'board' }) } });
        expect(client.getSnapshot().focus).toBe(first);
        client.receive({ v: 9, kind: 'evt', type: 'shell', seq: 4, payload: { view: baseView({ area: 'planMap' }), focus: { n: 2, stem: '0001-a', step: 'T-001' } } });
        expect(client.getSnapshot().focus).toEqual({ n: 2, stem: '0001-a', step: 'T-001' });
    });
});
