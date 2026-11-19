import { describe, expect, it } from 'vitest';
import { isOverviewEventPayload } from './messages';
import { isOverviewView } from './overview';
import { sampleView } from './testing/overviewSample';

describe('Overview view contract', () => {
    it('AC-026: a built view is accepted, the unavailable forms too', () => {
        const view = sampleView();
        expect(isOverviewView(view)).toBe(true);
        expect(isOverviewView({ ...view, activity: { available: false, reason: 'no store' } })).toBe(true);
        expect(isOverviewView({ ...view, figures: { kind: 'empty' } })).toBe(true);
    });

    it('0025 AC-026: a Now row may carry quiet: true, with a step, and nothing else', () => {
        const view = sampleView();
        const row = { spec: { stem: '0001-r', number: '0001', title: 'R', found: true }, state: 'Active' as const, status: 'Active', problems: 0, step: { intent: 'Integrate', short: '/sdd-plan', line: '/sdd-plan x', lines: [{ text: '/sdd-plan x', intent: 'Integrate' }] } };
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, quiet: true }], more: 0, stems: [] } })).toBe(true);
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, quiet: false } as never], more: 0, stems: [] } })).toBe(false);
        const { step: _step, ...bare } = row;
        expect(isOverviewView({ ...view, now: { rows: [{ ...bare, quiet: true } as never], more: 0, stems: [] } })).toBe(false);
    });

    it('AC-026: a view with an extra key anywhere is refused, so no error text can reach the DOM', () => {
        const view = sampleView();
        expect(isOverviewView({ ...view, extra: 1 })).toBe(false);
        expect(isOverviewView({ ...view, problems: { ...view.problems, errorMessage: 'SECRET-1' } })).toBe(false);
        expect(isOverviewView({ ...view, header: { name: 'demo' } })).toBe(false);
        expect(isOverviewView({ ...view, attention: { rows: [] } })).toBe(false);
    });

    it('0015 AC-010: a view with a run section, a run reason or a run activity entry is refused', () => {
        const view = sampleView();
        expect(isOverviewView(null)).toBe(false);
        expect(isOverviewView({ ...view, figures: { kind: 'counts', total: 1, states: [{ state: 'Nope', count: 1 }], progress: { kind: 'not available' } } })).toBe(false);
        expect(isOverviewView({ ...view, runs: { available: true, running: 0, highlighted: [], unreadable: 0 } })).toBe(false);
        expect(isOverviewView({ ...view, now: { rows: [{ ...view.problems.rows[0], status: 'Run failed', runReasons: 1 }], more: 0, stems: [] } })).toBe(false);
    });

    it('0018 AC-003: the figures name no rule: a state count with a derived rule is refused', () => {
        const view = sampleView();
        const figures = view.figures.kind === 'counts' ? view.figures : undefined;
        expect(figures).toBeDefined();
        expect(isOverviewView({ ...view, figures: { ...figures, states: [{ state: 'Ready', count: 0, derivedRule: 'S-READY' }] } })).toBe(false);
    });

    it('0018 AC-007, 0022 AC-013: Problems carry rows and lines; a line takes exactly where, reason and sentence', () => {
        const view = sampleView();
        expect(isOverviewView({ ...view, problems: { rows: [], lines: [{ where: 'project', reason: 'orphan return note', sentence: 'This return note belongs to no spec (number 0042)' }] } })).toBe(true);
        expect(isOverviewView({ ...view, problems: { rows: [], lines: [{ where: 'project', reason: 'orphan return note' }] } })).toBe(false);
        expect(isOverviewView({ ...view, problems: { rows: [], lines: [{ where: 'project', sentence: 's' }] } })).toBe(false);
        expect(isOverviewView({ ...view, problems: { rows: [], lines: [{ where: 'project', reason: 'x', sentence: 's', extra: 1 }] } })).toBe(false);
        expect(isOverviewView({ ...view, problems: { rows: [] } })).toBe(false);
    });
});

describe('0022 AC-013: a Problems row may carry the reasons as its tooltip text', () => {
    const base = { spec: { stem: '0001-a', number: '0001', title: 'A', found: true }, state: 'Active', status: 'Studio cannot read this spec', problems: 1 };

    it('accepts reasons as text, refuses another type', () => {
        const view = sampleView();
        const withRow = (row: unknown) => ({ ...view, problems: { rows: [row], lines: [] } });
        expect(isOverviewView(withRow({ ...base, reasons: 'not valid UTF-8' }))).toBe(true);
        expect(isOverviewView(withRow(base))).toBe(true);
        expect(isOverviewView(withRow({ ...base, reasons: 4 }))).toBe(false);
        expect(isOverviewView(withRow({ ...base, reason: 'typo' }))).toBe(false);
    });
});

describe('0018 Overview rows contract', () => {
    const row = { spec: { stem: '0001-a', number: '0001', title: 'A', found: true }, state: 'Active', status: 'Active', problems: 0 };

    it('accepts rows in Now and Up next, with and without a step', () => {
        const view = sampleView();
        expect(isOverviewView({ ...view, now: { rows: [row, { ...row, step: { line: '/sdd-plan 0001', intent: 'Plan', short: '/sdd-plan', lines: [{ text: '/sdd-plan 0001', intent: 'Write the plan' }] } }], more: 0, stems: [] } })).toBe(true);
        expect(isOverviewView({ ...view, upNext: { rows: [row], more: 2, stems: ['0001-a', '0002-b', '0003-c'] } })).toBe(true);
    });

    it('refuses an extra key, a wrong state, a negative count and a missing key in a row or in Up next', () => {
        const view = sampleView();
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, extra: 1 }], more: 0, stems: [] } })).toBe(false);
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, state: 'Nope' }], more: 0, stems: [] } })).toBe(false);
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, problems: -1 }], more: 0, stems: [] } })).toBe(false);
        expect(isOverviewView({ ...view, now: { rows: [{ spec: row.spec, state: 'Active', problems: 0 }], more: 0, stems: [] } })).toBe(false);
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

describe('0021 AC-009: the tips of a row', () => {
    const TIPS = { coach: 'new chat · strong model', about: ['a', 'b', 'c', 'd'] };

    it('a row takes tips with a coach line and a list of paragraphs, and refuses a bad one', () => {
        const view = sampleView();
        const row = view.problems.rows[0]!;
        const step = { intent: 'Plan', short: '/sdd-plan', line: '/sdd-plan 0001', lines: [{ text: '/sdd-plan 0001', intent: 'Write the plan' }] };
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, step, tips: TIPS }], more: 0, stems: [] } })).toBe(true);
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, step, tips: { ...TIPS, extra: 1 } }], more: 0, stems: [] } })).toBe(false);
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, step, tips: { coach: 3, about: [] } }], more: 0, stems: [] } })).toBe(false);
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, step, tips: { coach: 'x', about: [1] } }], more: 0, stems: [] } })).toBe(false);
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, step, tips: 'x' }], more: 0, stems: [] } })).toBe(false);
    });
});

describe('0024 AC-003: the send view of a row', () => {
    const SEND = { assistant: 'claudeCode', target: 'new', targets: ['new'] };
    const step = { intent: 'Plan', short: '/sdd-plan', line: '/sdd-plan 0001', lines: [{ text: '/sdd-plan 0001', intent: 'Write the plan' }] };

    it('a row with a step takes a send view and refuses a bad one or one without a step', () => {
        const view = sampleView();
        const row = view.problems.rows[0]!;
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, step, send: SEND }], more: 0, stems: [] } })).toBe(true);
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, step, tips: { coach: 'x', about: ['a'] }, send: { assistant: 'copilot', target: 'current', targets: ['new', 'current'] } }], more: 0, stems: [] } })).toBe(true);
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, step, send: { ...SEND, extra: 1 } }], more: 0, stems: [] } })).toBe(false);
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, step, send: { ...SEND, target: 'current' } }], more: 0, stems: [] } })).toBe(false);
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, step, send: 'copilot' }], more: 0, stems: [] } })).toBe(false);
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, send: SEND }], more: 0, stems: [] } })).toBe(false);
    });
});

