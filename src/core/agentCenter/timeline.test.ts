import { describe, expect, it } from 'vitest';
import { END_STATUSES, OPEN_STATUSES } from '../runtime/model';
import { ERROR_CLASSES } from '../orchestrator/errorClasses';
import { EVENT_KINDS } from '../providers/vocabulary';
import { ERROR_CLASS_WORDS, EVENT_KIND_FIELDS, EVENT_KIND_WORDS, PAYLOAD_FIELD_LABELS, RUN_STATUS_WORDS } from '../../shared/protocol/agentCenterTexts';
import { fromProvider, stored } from './testing/events';
import { timelineRows } from './timeline';

describe('AC-008: rows in ascending order, deltas folded', () => {
    it('3 message.delta and 1 message.completed, then 1 tool.started give 2 rows: the message with the completed text, then the tool call', () => {
        const rows = timelineRows([
            fromProvider(1, 'message.delta', { text: 'Hello ' }),
            fromProvider(2, 'message.delta', { text: 'from the ' }),
            fromProvider(3, 'message.delta', { text: 'fake.' }),
            fromProvider(4, 'message.completed', { text: 'Hello from the fake.' }),
            fromProvider(5, 'tool.started', { toolName: 'edit', callId: 'c1' }),
        ]);
        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatchObject({ key: 1, kind: 'Message', source: 'provider', fields: [{ label: 'Text', text: 'Hello from the fake.' }] });
        expect(rows[1]).toMatchObject({ key: 5, kind: 'Tool started', fields: [{ label: 'Tool', text: 'edit' }, { label: 'Call ID', text: 'c1' }] });
    });

    it('a message still growing shows the joined deltas; its key does not change when more arrive', () => {
        const two = timelineRows([fromProvider(1, 'message.delta', { text: 'a' }), fromProvider(2, 'message.delta', { text: 'b' })]);
        const three = timelineRows([fromProvider(1, 'message.delta', { text: 'a' }), fromProvider(2, 'message.delta', { text: 'b' }), fromProvider(3, 'message.delta', { text: 'c' })]);
        expect(two).toHaveLength(1);
        expect(two[0]?.fields[0]?.text).toBe('ab');
        expect(three[0]).toMatchObject({ key: 1, fields: [{ label: 'Text', text: 'abc' }] });
    });

    it('a message.completed without deltas is its own row; two messages stay two rows', () => {
        const rows = timelineRows([
            fromProvider(1, 'message.completed', { text: 'one' }),
            fromProvider(2, 'message.delta', { text: 'tw' }),
            fromProvider(3, 'message.completed', { text: 'two' }),
        ]);
        expect(rows.map((row) => row.fields[0]?.text)).toEqual(['one', 'two']);
        expect(rows.map((row) => row.key)).toEqual([1, 2]);
    });

    it('the loaded events may start inside a message: the first loaded deltas fold with the next completed', () => {
        const rows = timelineRows([fromProvider(7, 'message.delta', { text: 'tail ' }), fromProvider(8, 'message.completed', { text: 'whole tail' })]);
        expect(rows).toEqual([expect.objectContaining({ key: 7, fields: [{ label: 'Text', text: 'whole tail' }] })]);
    });

    it('payload text is plain text: markup is kept as the same characters, nothing is interpreted', () => {
        const rows = timelineRows([fromProvider(1, 'reasoning', { text: '<b>x</b>' })]);
        expect(rows[0]?.fields).toEqual([{ label: 'Text', text: '<b>x</b>' }]);
        expect(rows[0]?.fields[0]?.text).toHaveLength(8);
    });

    it('rows keep the sequence order of the given events and show only the fields of their kind', () => {
        const rows = timelineRows([
            fromProvider(1, 'session.started', { sessionRef: 's-1', model: 'm-1', secret: 'x' }),
            fromProvider(2, 'tool.completed', { toolName: 'edit', callId: 'c1', ok: false, errorText: 'boom' }),
            fromProvider(3, 'file.changed', { path: 'a.md', operation: 'add', confidence: 'derived', outsideProject: false }),
            fromProvider(4, 'plan.updated', { items: [{ text: 'one', done: true }, { text: 'two', done: false }] }),
            fromProvider(5, 'usage', { totals: { inputTokens: 3, outputTokens: 4 } }),
        ]);
        expect(rows.map((row) => row.key)).toEqual([1, 2, 3, 4, 5]);
        expect(rows[0]?.fields).toEqual([{ label: 'Session', text: 's-1' }, { label: 'Model', text: 'm-1' }]);
        expect(rows[1]?.fields).toEqual([{ label: 'Tool', text: 'edit' }, { label: 'Call ID', text: 'c1' }, { label: 'Succeeded', text: 'no' }, { label: 'Error text', text: 'boom' }]);
        expect(rows[2]?.fields).toContainEqual({ label: 'Basis', text: 'derived' });
        expect(rows[3]?.fields).toEqual([{ label: 'Items', text: '[x] one\n[ ] two' }]);
        expect(rows[4]?.fields).toEqual([{ label: 'Totals', text: 'inputTokens: 3\noutputTokens: 4' }]);
    });
});

describe('AC-011: time and source of every row', () => {
    it('the time is occurred-at when delivered, otherwise received-at', () => {
        const rows = timelineRows([
            fromProvider(1, 'turn.started', {}, { occurredAt: '2026-11-17T09:00:00.000Z', receivedAt: '2026-11-17T09:00:05.000Z' }),
            fromProvider(2, 'turn.completed', {}, { receivedAt: '2026-11-17T09:00:06.000Z' }),
        ]);
        expect(rows.map((row) => row.time)).toEqual(['2026-11-17T09:00:00.000Z', '2026-11-17T09:00:06.000Z']);
    });

    it('the source is provider or derived as stored, Studio for the truncated event, "not available" where none is stored', () => {
        const rows = timelineRows([
            stored(1, 'turn.started', { source: 'provider' }),
            stored(2, 'run.failed', { source: 'derived', category: 'unknown', text: 'gone' }),
            stored(3, 'truncated', {}),
            stored(4, 'turn.completed', {}),
            stored(5, 'warning', { text: 'w', source: 'weird' }),
        ]);
        expect(rows.map((row) => row.source)).toEqual(['provider', 'derived', 'Studio', 'not available', 'not available']);
        expect(rows[2]).toMatchObject({ kind: 'Event history truncated at the size cap', fields: [] });
    });
});

describe('AC-026: unknown events', () => {
    it('provider.unknown shows the provider type name and no payload; later events go on', () => {
        const rows = timelineRows([
            fromProvider(1, 'provider.unknown', { typeName: 'fake.mystery', fieldNames: ['a', 'b'] }),
            fromProvider(2, 'turn.completed', {}),
        ]);
        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatchObject({ key: 1, kind: 'Unknown provider event: fake.mystery', fields: [], source: 'provider' });
        expect(rows[1]?.kind).toBe('Turn completed');
    });

    it('a stored type outside the known kinds shows the stored type and no payload', () => {
        const rows = timelineRows([stored(1, 'x.custom', { secret: 'S' })]);
        expect(rows[0]).toMatchObject({ kind: 'Unknown provider event: x.custom', fields: [] });
    });

    it('provider.unknown without a type name falls back to the stored type', () => {
        expect(timelineRows([stored(1, 'provider.unknown', {})])[0]?.kind).toBe('Unknown provider event: provider.unknown');
    });
});

describe('AC-014: tool calls are rows of tool.* events only', () => {
    it('a tool call appears as its tool.started, tool.progress and tool.completed rows; other events never produce tool rows', () => {
        const rows = timelineRows([
            fromProvider(1, 'tool.started', { toolName: 'edit', callId: 'c' }),
            fromProvider(2, 'tool.progress', { toolName: 'edit', callId: 'c' }),
            fromProvider(3, 'tool.completed', { toolName: 'edit', callId: 'c', ok: true }),
            fromProvider(4, 'file.changed', { path: 'a', operation: 'update', confidence: 'reported', outsideProject: false }),
            fromProvider(5, 'message.completed', { text: 'I ran the tool edit' }),
        ]);
        expect(rows.filter((row) => row.kind.startsWith('Tool')).map((row) => row.key)).toEqual([1, 2, 3]);
        expect(rows).toHaveLength(5);
    });
});

describe('the text table is complete', () => {
    it('every event kind, run status and error class has a word, every kind has its field list, every listed field a label', () => {
        for (const kind of EVENT_KINDS.filter((candidate) => candidate !== 'provider.unknown')) {
            expect(EVENT_KIND_WORDS[kind], kind).toBeTypeOf('string');
            expect(EVENT_KIND_FIELDS[kind], kind).toBeDefined();
        }
        for (const fields of Object.values(EVENT_KIND_FIELDS)) {
            for (const field of fields) {
                expect(PAYLOAD_FIELD_LABELS[field], field).toBeTypeOf('string');
            }
        }
        for (const status of [...OPEN_STATUSES, ...END_STATUSES]) {
            expect(RUN_STATUS_WORDS[status], status).toBeTypeOf('string');
        }
        for (const errorClass of ERROR_CLASSES) {
            expect(ERROR_CLASS_WORDS[errorClass], errorClass).toBeTypeOf('string');
        }
    });

    it('negative control: a word that is not in the table is reported missing', () => {
        expect(EVENT_KIND_WORDS['made.up']).toBeUndefined();
        expect(RUN_STATUS_WORDS['Paused']).toBeUndefined();
    });
});
