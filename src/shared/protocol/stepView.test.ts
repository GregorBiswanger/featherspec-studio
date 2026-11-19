import { describe, expect, it } from 'vitest';
import { isCardView } from './board';
import { isOverviewView } from './overview';
import { isStepLinkView, isStepView, splitAtId } from './stepView';
import { sampleView } from './testing/overviewSample';

const STEP = { intent: 'Build', short: 'Start T-003', line: 'Start T-003 of p', lines: [{ text: 'Start T-003 of p', intent: 'Start implementing: T-003 Step' }] };

describe('0017 AC-001: the step view guard', () => {
    it('accepts a step with one line and a step with a second line, each under its intent', () => {
        expect(isStepView(STEP)).toBe(true);
        expect(isStepView({ intent: 'Plan', short: '/sdd-plan', line: '/sdd-plan k', lines: [{ text: '/sdd-plan k', intent: 'Write the plan' }, { text: 'p', intent: 'Then: write the plan' }] })).toBe(true);
    });

    it('0021 AC-001: a line takes exactly text and intent, both strings; a label key or a missing intent is refused', () => {
        expect(isStepView({ ...STEP, lines: [{ text: 'Start T-003 of p' }] })).toBe(false);
        expect(isStepView({ ...STEP, lines: [{ text: 'Start T-003 of p', intent: 3 }] })).toBe(false);
        expect(isStepView({ ...STEP, lines: [{ text: 'Start T-003 of p', intent: 'x', label: 'Then:' }] })).toBe(false);
    });

    it('refuses an unknown key in the step or in a line, a missing key, an empty list and a line that is not the first line', () => {
        expect(isStepView({ ...STEP, extra: 1 })).toBe(false);
        expect(isStepView({ ...STEP, lines: [{ text: 'Start T-003 of p', intent: 'x', extra: 1 }] })).toBe(false);
        expect(isStepView({ intent: 'Build', short: 'Start T-003', line: 'Start T-003 of p' })).toBe(false);
        expect(isStepView({ ...STEP, lines: [] })).toBe(false);
        expect(isStepView({ ...STEP, line: 'other' })).toBe(false);
        expect(isStepView({ ...STEP, short: 3 })).toBe(false);
        expect(isStepView({ ...STEP, intent: 3 })).toBe(false);
        const { intent: _intent, ...without } = STEP;
        expect(isStepView(without)).toBe(false);
        expect(isStepView(null)).toBe(false);
    });

    it('a card view takes a step or none, and refuses a bad step', () => {
        const card = {
            key: 'k', stem: '0001-a', number: '0001', title: 'A', titleIsStem: false, path: undefined, state: 'Active', deprecated: false,
            problems: 0, blocked: [], need: undefined, step: undefined, summary: undefined, tasks: undefined, criteria: undefined, lastChange: undefined,
        };
        expect(isCardView(card)).toBe(true);
        expect(isCardView({ ...card, step: STEP })).toBe(true);
        expect(isCardView({ ...card, step: { ...STEP, extra: 1 } })).toBe(false);
        expect(isCardView({ ...card, step: 'Start' })).toBe(false);
    });

    it('an Overview row takes a step or no step key, and refuses a bad step', () => {
        const view = sampleView();
        const row = view.problems.rows[0]!;
        expect(isOverviewView({ ...view, now: { rows: [row], more: 0, stems: [] } })).toBe(true);
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, step: STEP }], more: 0, stems: [] } })).toBe(true);
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, step: { ...STEP, extra: 1 } }], more: 0, stems: [] } })).toBe(false);
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, other: 1 }], more: 0, stems: [] } })).toBe(false);
    });
});

describe('0025 AC-027: step link view and the split at an ID', () => {
    const LINK = { id: 'T-003', open: { key: '.specs/active/0001-a.plan.md', line: 12 } };

    it('splitAtId cuts the text around the first whole ID and gives nothing for a partial one', () => {
        expect(splitAtId('Implement T-003', 'T-003')).toEqual({ before: 'Implement ', after: '' });
        expect(splitAtId('Continue with T-003 Reject money', 'T-003')).toEqual({ before: 'Continue with ', after: ' Reject money' });
        expect(splitAtId('Continue with T-0031', 'T-003')).toBeUndefined();
        expect(splitAtId('/sdd-compile', 'T-003')).toBeUndefined();
    });

    it('the guard takes exactly an ID and a line target', () => {
        expect(isStepLinkView(LINK)).toBe(true);
        expect(isStepLinkView({ ...LINK, extra: 1 })).toBe(false);
        expect(isStepLinkView({ id: 'T-003' })).toBe(false);
        expect(isStepLinkView({ ...LINK, open: { key: 'p', line: '1' } })).toBe(false);
    });

    it('an Overview row takes a link only with a step', () => {
        const view = sampleView();
        const row = view.problems.rows[0]!;
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, step: STEP, link: LINK }], more: 0, stems: [] } })).toBe(true);
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, link: LINK }], more: 0, stems: [] } })).toBe(false);
        expect(isOverviewView({ ...view, now: { rows: [{ ...row, step: STEP, link: { id: 'T-003' } }], more: 0, stems: [] } })).toBe(false);
    });
});
