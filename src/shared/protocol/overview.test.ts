import { describe, expect, it } from 'vitest';
import { isOverviewEventPayload } from './messages';
import { isOverviewView } from './overview';
import { sampleView } from './testing/overviewSample';

describe('Overview view contract', () => {
    it('AC-026: a built view is accepted, the unavailable forms too', () => {
        const view = sampleView();
        expect(isOverviewView(view)).toBe(true);
        expect(isOverviewView({ ...view, activity: { available: false, reason: 'no store' } })).toBe(true);
        expect(isOverviewView({ ...view, specs: { kind: 'empty' } })).toBe(true);
    });

    it('AC-026: a view with an extra key anywhere is refused, so no error text can reach the DOM', () => {
        const view = sampleView();
        expect(isOverviewView({ ...view, extra: 1 })).toBe(false);
        expect(isOverviewView({ ...view, header: { ...view.header, errorMessage: 'SECRET-1' } })).toBe(false);
        expect(isOverviewView({ ...view, attention: { ...view.attention, extra: 1 } })).toBe(false);
    });

    it('0015 AC-010: a view with a run section, a run reason or a run activity entry is refused', () => {
        const view = sampleView();
        expect(isOverviewView(null)).toBe(false);
        expect(isOverviewView({ ...view, header: { ...view.header, projectDiagnostics: '1' } })).toBe(false);
        expect(isOverviewView({ ...view, attention: { ...view.attention, rows: [{ spec: view.attention.rows[0]?.spec, reasons: ['Made up'] }] } })).toBe(false);
        expect(isOverviewView({ ...view, specs: { kind: 'counts', total: 1, states: [{ state: 'Nope', count: 1 }], progress: { kind: 'not available' } } })).toBe(false);
        expect(isOverviewView({ ...view, runs: { available: true, running: 0, highlighted: [], unreadable: 0 } })).toBe(false);
        expect(isOverviewView({ ...view, attention: { rows: [{ spec: view.attention.rows[0]?.spec, reasons: ['Run failed'] }] } })).toBe(false);
        expect(isOverviewView({ ...view, attention: { ...view.attention, runReasons: { available: true } } })).toBe(false);
    });
});

describe('0018 Overview rows contract', () => {
    const row = { spec: { stem: '0001-a', number: '0001', title: 'A', found: true }, state: 'Active', status: 'Active', problems: 0 };

    it('accepts rows in Now and Up next, with and without a step', () => {
        const view = sampleView();
        expect(isOverviewView({ ...view, now: [row, { ...row, step: { line: '/sdd-plan 0001', short: '/sdd-plan', lines: [{ text: '/sdd-plan 0001' }] } }] })).toBe(true);
        expect(isOverviewView({ ...view, upNext: { rows: [row], more: 2, stems: ['0001-a', '0002-b', '0003-c'] } })).toBe(true);
    });

    it('refuses an extra key, a wrong state, a negative count and a missing key in a row or in Up next', () => {
        const view = sampleView();
        expect(isOverviewView({ ...view, now: [{ ...row, extra: 1 }] })).toBe(false);
        expect(isOverviewView({ ...view, now: [{ ...row, state: 'Nope' }] })).toBe(false);
        expect(isOverviewView({ ...view, now: [{ ...row, problems: -1 }] })).toBe(false);
        expect(isOverviewView({ ...view, now: [{ spec: row.spec, state: 'Active', problems: 0 }] })).toBe(false);
        expect(isOverviewView({ ...view, upNext: { rows: [], more: 0 } })).toBe(false);
        expect(isOverviewView({ ...view, upNext: { rows: [], more: 0, stems: [], extra: 1 } })).toBe(false);
        const { now: _now, ...withoutNow } = view;
        expect(isOverviewView(withoutNow)).toBe(false);
    });
});

describe('Overview event payload', () => {
    it('accepts a payload that holds a valid view and refuses anything else (negative control: a board view is no Overview view)', () => {
        expect(isOverviewEventPayload({ view: sampleView() })).toBe(true);
        expect(isOverviewEventPayload({ view: { columns: [] } })).toBe(false);
        expect(isOverviewEventPayload(undefined)).toBe(false);
        expect(isOverviewEventPayload({})).toBe(false);
    });
});
