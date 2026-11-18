import { describe, expect, it } from 'vitest';
import { PROTOCOL_VERSION, type Envelope } from '../../shared/protocol/envelope';
import { createMessageRouter, type RequestHandlers } from './messageRouter';

function setup(overrides: Partial<RequestHandlers> = {}) {
    const calls: string[] = [];
    const lines: string[][] = [];
    const posted: Envelope[] = [];
    const handlers: RequestHandlers = {
        hello: async (payload) => void calls.push(`hello:${payload.lastSeq}`),
        navigate: async (payload) => void calls.push(`navigate:${payload.area}`),
        select: async (payload) => void calls.push(`select:${payload.stem}`),
        runAction: async (payload) => void calls.push(`runAction:${payload.action}`),
        dismissNotice: async () => void calls.push('dismissNotice'),
        boardSetFilter: async () => void calls.push('boardSetFilter'),
        boardSetSort: async (payload) => void calls.push(`boardSetSort:${payload.sort}`),
        boardClearFilters: async () => void calls.push('boardClearFilters'),
        openFile: async () => void calls.push('openFile'),
        copyText: async () => void calls.push('copyText'),
        ...overrides,
    };
    const router = createMessageRouter({
        handlers,
        output: { appendBlock: (block) => void lines.push([...block]) },
        post: (message) => void posted.push(message),
    });
    return { router, calls, lines, posted };
}

const req = (type: string, payload: unknown, extra: Record<string, unknown> = {}) => ({ v: PROTOCOL_VERSION, kind: 'req', id: 'r1', type, payload, ...extra });

describe('AC-021: message router', () => {
    it('runs the handler of a valid request and answers with exactly one ok response carrying the id', async () => {
        const { router, calls, posted, lines } = setup();
        await router.receive(req('navigate', { area: 'board' }));
        expect(calls).toEqual(['navigate:board']);
        expect(posted).toEqual([{ v: PROTOCOL_VERSION, kind: 'res', id: 'r1', type: 'navigate', payload: { ok: true } }]);
        expect(lines).toEqual([]);
    });

    it('answers a failing handler with a generic error and never with its message', async () => {
        const { router, posted } = setup({
            select: async () => {
                throw new Error('secret content of /home/me/file');
            },
        });
        await router.receive(req('select', { stem: '0003-x' }));
        expect(posted).toHaveLength(1);
        expect(JSON.stringify(posted[0])).not.toContain('secret');
        expect(posted[0]?.payload).toEqual({ ok: false, error: 'The request failed.' });
    });

    it('ignores an unknown type of the current version and logs one line with the type and the reason', async () => {
        const { router, calls, lines, posted } = setup();
        await router.receive(req('formatDisk', { path: '/etc/passwd' }));
        expect(calls).toEqual([]);
        expect(posted).toEqual([]);
        expect(lines).toEqual([['Ignored a message from the Studio panel: type formatDisk, unknown message type.']]);
    });

    it('ignores a payload that fails validation and logs the type and the reason, never the content', async () => {
        const { router, calls, lines } = setup();
        await router.receive(req('select', { stem: 'SECRET-STEM', path: 42 }));
        expect(calls).toEqual([]);
        expect(lines).toEqual([['Ignored a message from the Studio panel: type select, invalid payload.']]);
        expect(JSON.stringify(lines)).not.toContain('SECRET');
    });

    it('never writes a type name that could carry content', async () => {
        const { router, lines } = setup();
        await router.receive(req('/home/user/project/AGENTS.md contents', {}));
        expect(lines).toEqual([['Ignored a message from the Studio panel: type <invalid>, unknown message type.']]);
    });

    it('ignores something that is no message at all, and a message that is no request', async () => {
        const { router, lines, posted } = setup();
        await router.receive('hello');
        await router.receive(null);
        await router.receive({ v: PROTOCOL_VERSION, kind: 'evt', type: 'shell', payload: {} });
        expect(posted).toEqual([]);
        expect(lines).toEqual([
            ['Ignored a message from the Studio panel: type <invalid>, not a message.'],
            ['Ignored a message from the Studio panel: type <invalid>, not a message.'],
            ['Ignored a message from the Studio panel: type shell, not a request.'],
        ]);
    });

    it('answers the next valid message as before after an ignored one', async () => {
        const { router, calls, posted } = setup();
        await router.receive(req('select', { stem: 5 }));
        await router.receive(req('hello', { lastSeq: 0 }, { id: 'r2' }));
        expect(calls).toEqual(['hello:0']);
        expect(posted).toEqual([{ v: PROTOCOL_VERSION, kind: 'res', id: 'r2', type: 'hello', payload: { ok: true } }]);
    });

    it('AC-016: a message of another version is answered with versionMismatch, runs no handler and writes no log line', async () => {
        const { router, calls, posted, lines } = setup();
        await router.receive({ v: PROTOCOL_VERSION + 1, kind: 'req', id: 'x', type: 'navigate', payload: { area: 'board' } });
        expect(calls).toEqual([]);
        expect(lines).toEqual([]);
        expect(posted).toEqual([{ v: PROTOCOL_VERSION, kind: 'evt', type: 'versionMismatch', payload: {} }]);
    });

    it('AC-016 control: the same message with the current version is handled', async () => {
        const { router, calls, posted } = setup();
        await router.receive({ v: PROTOCOL_VERSION, kind: 'req', id: 'x', type: 'navigate', payload: { area: 'board' } });
        expect(calls).toEqual(['navigate:board']);
        expect(posted[0]?.kind).toBe('res');
    });
});

describe('0017 AC-010: the moveRequest and boardFocus messages are no longer known', () => {
    it('a moveRequest and a boardFocus with formerly valid payloads are ignored as an unknown message type: no handler, no response', async () => {
        const { router, calls, lines, posted } = setup();
        await router.receive(req('moveRequest', { key: '.specs/active/0003-a.md', target: 'Done' }));
        await router.receive(req('boardFocus', { key: '.specs/active/0003-a.md' }));
        await router.receive(req('boardFocus', { key: null }));
        expect(calls).toEqual([]);
        expect(posted).toEqual([]);
        expect(lines).toEqual([
            ['Ignored a message from the Studio panel: type moveRequest, unknown message type.'],
            ['Ignored a message from the Studio panel: type boardFocus, unknown message type.'],
            ['Ignored a message from the Studio panel: type boardFocus, unknown message type.'],
        ]);
    });

    it('control: a message that stays known is still handled after the ignored ones', async () => {
        const { router, calls } = setup();
        await router.receive(req('moveRequest', { key: 'k', target: 'Done' }));
        await router.receive(req('boardSetSort', { sort: 'title' }));
        expect(calls).toEqual(['boardSetSort:title']);
    });
});

