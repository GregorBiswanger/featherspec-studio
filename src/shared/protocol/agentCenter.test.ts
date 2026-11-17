import { describe, expect, it } from 'vitest';
import { isAgentCenterView, isTimelinePayload, isTimelineRow } from './agentCenter';
import { AREAS } from './areas';
import { isAgentCenterEventPayload, isAgentCenterTimelineEventPayload, isRequestType, REQUEST_GUARDS } from './messages';
import { sampleCenterView } from './testing/agentCenterSample';

const row = { key: 1, kind: 'Message', time: '2026-11-17T10:00:00.000Z', source: 'provider', fields: [{ label: 'Text', text: 'hi' }] };

describe('timeline row and payload contract', () => {
    it('accepts a built row and payload', () => {
        expect(isTimelineRow(row)).toBe(true);
        expect(isTimelinePayload({ runId: 'run-1', rows: [row], hasEarlier: false })).toBe(true);
    });

    it('refuses an extra key anywhere, a wrong type and a missing key', () => {
        expect(isTimelineRow({ ...row, raw: 'x' })).toBe(false);
        expect(isTimelineRow({ ...row, fields: [{ label: 'a', text: 'b', html: '<b>' }] })).toBe(false);
        expect(isTimelineRow({ ...row, key: '1' })).toBe(false);
        expect(isTimelineRow({ ...row, key: 1.5 })).toBe(false);
        expect(isTimelineRow({ key: 1 })).toBe(false);
        expect(isTimelinePayload({ runId: 'run-1', rows: [row], hasEarlier: false, extra: 1 })).toBe(false);
        expect(isTimelinePayload({ runId: '', rows: [], hasEarlier: false })).toBe(false);
        expect(isTimelinePayload({ runId: 'r', rows: [{ ...row, extra: 1 }], hasEarlier: true })).toBe(false);
        expect(isTimelinePayload(null)).toBe(false);
    });
});

describe('Agent Center view contract (AC-027, strict guard)', () => {
    it('accepts a built view, the unavailable form, the empty states and a view without a selection', () => {
        expect(isAgentCenterView(sampleCenterView())).toBe(true);
        expect(isAgentCenterView({ kind: 'unavailable', reason: 'disk is full' })).toBe(true);
        expect(isAgentCenterView(sampleCenterView({ rows: [], detail: undefined, empty: 'no-runs' }))).toBe(true);
        expect(isAgentCenterView(sampleCenterView({ filter: { stem: '0007-board', label: '0007' }, empty: 'no-match', rows: [], detail: undefined }))).toBe(true);
        expect(isAgentCenterView(sampleCenterView({ controls: { kind: 'disabled', reason: 'reader window' }, notice: 'Run x is not in the run history' }))).toBe(true);
        expect(isAgentCenterView(sampleCenterView({ controls: { kind: 'none' } }))).toBe(true);
    });

    it('refuses an extra key at any level, so no raw payload can reach the DOM', () => {
        const view = sampleCenterView() as { rows: object[]; detail: { header: object; requests: object[]; files: object[] } };
        expect(isAgentCenterView({ ...view, raw: 'SECRET' })).toBe(false);
        expect(isAgentCenterView({ ...view, rows: [{ ...view.rows[0], prompt: 'SECRET' }] })).toBe(false);
        expect(isAgentCenterView({ ...view, detail: { ...view.detail, payload: 'SECRET' } })).toBe(false);
        expect(isAgentCenterView({ ...view, detail: { ...view.detail, header: { ...view.detail.header, token: 'SECRET' } } })).toBe(false);
        expect(isAgentCenterView({ ...view, detail: { ...view.detail, requests: [{ ...view.detail.requests[0], answer: 'SECRET' }] } })).toBe(false);
        expect(isAgentCenterView({ ...view, detail: { ...view.detail, files: [{ ...view.detail.files[0], diff: 'SECRET' }] } })).toBe(false);
        expect(isAgentCenterView({ kind: 'unavailable', reason: 'x', extra: 1 })).toBe(false);
    });

    it('refuses wrong types and unknown words', () => {
        const view = sampleCenterView() as { rows: { status: string }[] };
        expect(isAgentCenterView(null)).toBe(false);
        expect(isAgentCenterView({ kind: 'ready' })).toBe(false);
        expect(isAgentCenterView({ ...view, rows: [{ ...view.rows[0], status: 'Paused' }] })).toBe(false);
        expect(isAgentCenterView({ ...view, empty: 'maybe' })).toBe(false);
        expect(isAgentCenterView({ ...view, controls: { kind: 'enabled', reason: 'x' } })).toBe(false);
        expect(isAgentCenterView({ ...view, controls: { kind: 'disabled' } })).toBe(false);
    });
});

describe('Agent Center requests and events (messages.ts)', () => {
    it('registers the eight request types with strict guards', () => {
        for (const type of ['acSelect', 'acClearFilter', 'acLoadEarlier', 'acFollow', 'acAnswer', 'acCancel', 'acResume', 'acOpenFile']) {
            expect(isRequestType(type), type).toBe(true);
        }
        expect(REQUEST_GUARDS.acSelect({ runId: 'r1' })).toBe(true);
        expect(REQUEST_GUARDS.acSelect({ runId: '' })).toBe(false);
        expect(REQUEST_GUARDS.acSelect({ runId: 'r1', extra: 1 })).toBe(false);
        expect(REQUEST_GUARDS.acClearFilter({})).toBe(true);
        expect(REQUEST_GUARDS.acClearFilter({ x: 1 })).toBe(false);
        expect(REQUEST_GUARDS.acLoadEarlier({ runId: 'r1' })).toBe(true);
        expect(REQUEST_GUARDS.acCancel({ runId: 'r1' })).toBe(true);
        expect(REQUEST_GUARDS.acResume({ runId: 5 })).toBe(false);
        expect(REQUEST_GUARDS.acFollow({ runId: 'r1', on: false })).toBe(true);
        expect(REQUEST_GUARDS.acFollow({ runId: 'r1', on: 'no' })).toBe(false);
        expect(REQUEST_GUARDS.acOpenFile({ runId: 'r1', path: 'README.md' })).toBe(true);
        expect(REQUEST_GUARDS.acOpenFile({ runId: 'r1', path: '' })).toBe(false);
    });

    it('an answer is an approval with one of the two decisions and an optional reason, or an input with a text; nothing else', () => {
        const guard = REQUEST_GUARDS.acAnswer;
        expect(guard({ runId: 'r1', requestId: 'a1', answer: { kind: 'approval', decision: 'approve-once' } })).toBe(true);
        expect(guard({ runId: 'r1', requestId: 'a1', answer: { kind: 'approval', decision: 'reject', reason: 'no' } })).toBe(true);
        expect(guard({ runId: 'r1', requestId: 'a1', answer: { kind: 'input', text: 'x' } })).toBe(true);
        expect(guard({ runId: 'r1', requestId: 'a1', answer: { kind: 'approval', decision: 'approve-always' } })).toBe(false);
        expect(guard({ runId: 'r1', requestId: 'a1', answer: { kind: 'approval', decision: 'approve-once', text: 'x' } })).toBe(false);
        expect(guard({ runId: 'r1', requestId: 'a1', answer: { kind: 'input' } })).toBe(false);
        expect(guard({ runId: 'r1', requestId: '', answer: { kind: 'input', text: 'x' } })).toBe(false);
        expect(guard({ runId: 'r1', requestId: 'a1', answer: { kind: 'session', decision: 'approve-once' } })).toBe(false);
    });

    it('the view event holds a valid view, the timeline event a valid timeline; anything else is refused', () => {
        expect(isAgentCenterEventPayload({ view: sampleCenterView() })).toBe(true);
        expect(isAgentCenterEventPayload({ view: { kind: 'ready' } })).toBe(false);
        expect(isAgentCenterEventPayload({})).toBe(false);
        expect(isAgentCenterTimelineEventPayload({ runId: 'r1', rows: [], hasEarlier: false })).toBe(true);
        expect(isAgentCenterTimelineEventPayload({ runId: 'r1', rows: [{}], hasEarlier: false })).toBe(false);
    });

    it('no area is a placeholder any more (AC-028 of 0005 now holds through a synthetic area info)', () => {
        expect(AREAS.filter((area) => area.placeholder)).toEqual([]);
    });
});
