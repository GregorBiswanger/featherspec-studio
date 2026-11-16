import { describe, expect, it } from 'vitest';
import type { EventPayloads } from '../ports/agentProvider';
import type { JsonValue } from '../runtime/model';
import { EVENT_KINDS, type EventKind } from './vocabulary';

const SAMPLES: { [K in EventKind]: EventPayloads[K] } = {
    'session.started': { sessionRef: 's', model: 'm' },
    'turn.started': {},
    'turn.completed': {},
    'message.delta': { text: 't' },
    'message.completed': { text: 't' },
    reasoning: { text: 't' },
    'tool.started': { toolName: 'n', callId: 'c' },
    'tool.progress': { toolName: 'n', callId: 'c' },
    'tool.completed': { toolName: 'n', callId: 'c', ok: true, errorText: 'e' },
    'file.changed': { path: 'p', operation: 'update', confidence: 'reported', outsideProject: false },
    'approval.requested': { requestId: 'r', actionKind: 'shell', summary: 's', outsideProject: false },
    'approval.resolved': { requestId: 'r', decision: 'reject' },
    'input.requested': { requestId: 'r', question: 'q' },
    'input.resolved': { requestId: 'r' },
    'plan.updated': { items: [{ text: 'a', done: true }] },
    usage: { totals: { input: 1 } },
    warning: { text: 'w' },
    retry: { text: 'r' },
    'auth.status': { result: 'available', reason: 'x' },
    'run.completed': { finalMessage: 'f' },
    'run.failed': { category: 'auth', text: 't', providerMessage: 'p', hint: 'h' },
    'run.cancelled': { cause: 'c' },
    'provider.unknown': { typeName: 't', fieldNames: ['a'] },
};

function asJson(value: JsonValue): JsonValue {
    return value;
}

describe('payload types', () => {
    it('AC-007: every kind has a payload type and each payload is assignable to the runtime store JsonValue', () => {
        expect(Object.keys(SAMPLES).sort()).toEqual([...EVENT_KINDS].sort());
        for (const kind of EVENT_KINDS) {
            expect(JSON.parse(JSON.stringify(asJson(SAMPLES[kind])))).toEqual(SAMPLES[kind]);
        }
    });
});
