import { describe, expect, it } from 'vitest';
import { modelFor, type SpecInput } from '../missionControl/testing/projects';
import { currentSpec, pickOrder, readyCount, specsWithStep, type SpecStep } from './currentSpec';

const URGENT: SpecInput[] = [
    { number: '0015', kind: 'Review' },
    { number: '0012', kind: 'Active' },
    { number: '0020', kind: 'Blocked' },
];

async function stepsOf(inputs: readonly SpecInput[], extra: Record<string, string> = {}) {
    const model = await modelFor(inputs, extra);
    return { model, steps: specsWithStep(model) };
}

function step(number: string, state: SpecStep['state'], key = `.specs/active/${number}-thing.md`): SpecStep {
    return { key, stem: `${number}-thing`, number, state, title: 'T', label: `${number} T`, step: { short: '/sdd-plan', line: `/sdd-plan ${key}`, lines: [{ text: `/sdd-plan ${key}` }] } };
}

describe('0017 AC-013: the current spec', () => {
    it('with no selection the most urgent state wins: Blocked 0020 before Review 0015 before Active 0012', async () => {
        const { steps } = await stepsOf(URGENT);
        expect(currentSpec(steps, undefined)).toMatchObject({ number: '0020', state: 'Blocked', step: { short: '/sdd-plan' } });
        expect(currentSpec(steps.filter((entry) => entry.number !== '0020'), undefined)?.number).toBe('0015');
        expect(currentSpec(steps.filter((entry) => entry.state === 'Active'), undefined)?.number).toBe('0012');
    });

    it('a selected Done spec has no step, so the same spec as without a selection is chosen', async () => {
        const { steps } = await stepsOf([...URGENT, { number: '0003', kind: 'Done' }]);
        expect(steps.some((entry) => entry.number === '0003')).toBe(false);
        expect(currentSpec(steps, { stem: '0003-thing' })?.number).toBe('0020');
    });

    it('rule (1): a selected spec with a step wins over a more urgent one, also a Ready or Backlog spec', async () => {
        const { steps } = await stepsOf([...URGENT, { number: '0007', kind: 'Ready' }, { number: '0008', kind: 'Backlog' }]);
        expect(currentSpec(steps, { stem: '0007-thing' })?.number).toBe('0007');
        expect(currentSpec(steps, { stem: '0008-thing' })?.number).toBe('0008');
        expect(currentSpec(steps, { stem: '0012-thing' })?.number).toBe('0012');
    });

    it('rule (1) with a path picks that file; an unknown selection falls through to rule (2)', () => {
        const first = step('0005', 'Active', '.specs/active/0005-thing.md');
        const second = step('0005', 'Backlog', '.specs/backlog/0005-thing.md');
        expect(currentSpec([first, second], { stem: '0005-thing', path: '.specs/backlog/0005-thing.md' })).toBe(second);
        expect(currentSpec([first, second], { stem: '0099-gone' })).toBe(first);
    });

    it('rule (2) never picks a Ready or Backlog spec, and rule (3) gives none', async () => {
        const { steps } = await stepsOf([
            { number: '0001', kind: 'Backlog' },
            { number: '0002', kind: 'Ready' },
        ]);
        expect(steps).toHaveLength(2);
        expect(currentSpec(steps, undefined)).toBeUndefined();
    });

    it('rule (2) breaks ties by number ascending, then path (negative control: the order of the input does not matter)', () => {
        const high = step('0009', 'Blocked');
        const low = step('0003', 'Blocked');
        expect(currentSpec([high, low], undefined)).toBe(low);
        expect(currentSpec([low, high], undefined)).toBe(low);
        const byPathB = step('0003', 'Blocked', '.specs/b/0003-thing.md');
        const byPathA = step('0003', 'Blocked', '.specs/a/0003-thing.md');
        expect(currentSpec([byPathB, byPathA], undefined)).toBe(byPathA);
    });
});

describe('0017 AC-003: the order is the same for the same snapshot and selection', () => {
    it('two models read from the same files give the same current spec and the same quick-pick order', async () => {
        const inputs: SpecInput[] = [...URGENT, { number: '0007', kind: 'Ready' }, { number: '0008', kind: 'Backlog' }];
        const first = await stepsOf(inputs);
        const second = await stepsOf(inputs);
        expect(currentSpec(first.steps, { stem: '0008-thing' })).toEqual(currentSpec(second.steps, { stem: '0008-thing' }));
        expect(pickOrder(first.steps)).toEqual(pickOrder(second.steps));
    });

    it('the quick pick runs Blocked, Review, Active, Ready, Backlog, then Done, each by number then path', () => {
        const mixed = [step('0001', 'Done'), step('0002', 'Backlog'), step('0003', 'Ready'), step('0005', 'Active'), step('0004', 'Active'), step('0006', 'Review'), step('0007', 'Blocked')];
        expect(pickOrder(mixed).map((entry) => `${entry.number} ${entry.state}`)).toEqual(['0007 Blocked', '0006 Review', '0004 Active', '0005 Active', '0003 Ready', '0002 Backlog', '0001 Done']);
        expect(pickOrder([step('0004', 'Active', '.specs/b/0004-thing.md'), step('0004', 'Active', '.specs/a/0004-thing.md')]).map((entry) => entry.key)).toEqual(['.specs/a/0004-thing.md', '.specs/b/0004-thing.md']);
    });

    it('the label is "<number> <title>" and the stem where no title is read', async () => {
        const { steps } = await stepsOf([{ number: '0004', kind: 'Blocked', title: 'The title' }, { number: '0005', kind: 'Blocked', title: null }]);
        expect(steps.map((entry) => entry.label)).toEqual(['0004 The title', '0005-thing']);
    });
});

describe('0017 AC-015: the Ready count', () => {
    it('counts the specs in the state Ready only', async () => {
        const { model } = await stepsOf([...URGENT, { number: '0007', kind: 'Ready' }, { number: '0008', kind: 'Ready' }, { number: '0009', kind: 'Backlog' }]);
        expect(readyCount(model)).toBe(2);
    });
});
