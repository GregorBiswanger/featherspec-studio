import { describe, expect, it } from 'vitest';
import { isAgentCenterView, isTimelinePayload, isTimelineRow } from './agentCenter';
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
