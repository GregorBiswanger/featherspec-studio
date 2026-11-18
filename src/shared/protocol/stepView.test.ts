import { describe, expect, it } from 'vitest';
import { isCardView } from './board';
import { isOverviewView } from './overview';
import { isStepView } from './stepView';
import { sampleView } from './testing/overviewSample';

const STEP = { short: 'Start T-003', line: 'Start T-003 of p', lines: [{ text: 'Start T-003 of p', intent: 'Start implementing: T-003 Step' }] };

describe('0017 AC-001: the step view guard', () => {
    it('accepts a step with one line and a step with a second line, each under its intent', () => {
        expect(isStepView(STEP)).toBe(true);
        expect(isStepView({ short: '/sdd-plan', line: '/sdd-plan k', lines: [{ text: '/sdd-plan k', intent: 'Write the plan' }, { text: 'p', intent: 'Then: write the plan' }] })).toBe(true);
    });

    it('0021 AC-001: a line takes exactly text and intent, both strings; a label key or a missing intent is refused', () => {
        expect(isStepView({ ...STEP, lines: [{ text: 'Start T-003 of p' }] })).toBe(false);
        expect(isStepView({ ...STEP, lines: [{ text: 'Start T-003 of p', intent: 3 }] })).toBe(false);
        expect(isStepView({ ...STEP, lines: [{ text: 'Start T-003 of p', intent: 'x', label: 'Then:' }] })).toBe(false);
    });

    it('refuses an unknown key in the step or in a line, a missing key, an empty list and a line that is not the first line', () => {
        expect(isStepView({ ...STEP, extra: 1 })).toBe(false);
        expect(isStepView({ ...STEP, lines: [{ text: 'Start T-003 of p', intent: 'x', extra: 1 }] })).toBe(false);
        expect(isStepView({ short: 'Start T-003', line: 'Start T-003 of p' })).toBe(false);
        expect(isStepView({ ...STEP, lines: [] })).toBe(false);
        expect(isStepView({ ...STEP, line: 'other' })).toBe(false);
        expect(isStepView({ ...STEP, short: 3 })).toBe(false);
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
        expect(isOverviewView({ ...view, now: [row] })).toBe(true);
        expect(isOverviewView({ ...view, now: [{ ...row, step: STEP }] })).toBe(true);
        expect(isOverviewView({ ...view, now: [{ ...row, step: { ...STEP, extra: 1 } }] })).toBe(false);
        expect(isOverviewView({ ...view, now: [{ ...row, other: 1 }] })).toBe(false);
    });
});
