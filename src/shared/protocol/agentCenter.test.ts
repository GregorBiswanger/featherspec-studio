import { describe, expect, it } from 'vitest';
import { isTimelinePayload, isTimelineRow } from './agentCenter';

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
