import { describe, expect, it } from 'vitest';
import { planText, specText } from '../lifecycle/testing/projects';
import { parseStepTipSettings } from '../settings/stepTipSettings';
import { STEP_GUIDES, stepShortForm } from '../../shared/protocol/nextStepTexts';
import { modelOf } from './testing/boardWorld';
import { nextStep, stepView } from './nextStep';
import { stepTips } from './stepTips';

const BACKLOG = '.specs/backlog/0007-x.md';
const BACKLOG_PLAN = '.specs/backlog/0007-x.plan.md';
const ACTIVE = '.specs/active/0007-x.md';
const ACTIVE_PLAN = '.specs/active/0007-x.plan.md';
const LINK = '[0007-x.plan.md](0007-x.plan.md)';
const STEPS = (marks: string[]): string => `${planText()}\n## Steps\n\n${marks.map((mark, index) => `### T-00${index + 1} — Step\n\n- ${mark} **Verified (T-00${index + 1}):** —\n`).join('\n')}`;
const SHOW = parseStepTipSettings(true, {});

describe('0033 AC-001: a Ready spec in backlog/ starts via /sdd-lifecycle', () => {
    it('0033 AC-001 the only line is the start step, no follow-up', async () => {
        const model = await modelOf({ [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: STEPS(['[ ]', '[ ]']) });
        expect(nextStep(model, BACKLOG)).toEqual({
            rule: 'NS-7',
            case: 'NS-7-start',
            lines: [{ intent: 'Start: move the spec and its plan to active', text: `/sdd-lifecycle ${BACKLOG} In Progress` }],
        });
    });

    it('0033 AC-001 short form, Tip and effect read literally', async () => {
        const model = await modelOf({ [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: STEPS(['[ ]']) });
        const view = stepView(model, BACKLOG)!;
        expect(stepShortForm(view)).toBe('Start · Set active');
        expect(STEP_GUIDES['NS-7-start'].short).toBe('Start');
        expect(STEP_GUIDES['NS-7-start'].then).toBeUndefined();
        expect(STEP_GUIDES['NS-7-start'].effect).toBe('The agent moves spec and plan to active and sets the status to In Progress. Afterwards the Studio offers T-001.');
        expect(stepTips('NS-7-start', SHOW).coach).toBe('Tip: Use any chat with a fast model.');
    });

    it('0033 AC-001 a backlog spec with a ticked step keeps today\'s Implement line (A-002)', async () => {
        const model = await modelOf({ [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: STEPS(['[x]', '[ ]']) });
        expect(nextStep(model, BACKLOG)).toMatchObject({ rule: 'NS-7', case: 'NS-7', lines: [{ text: `Implement T-002 of ${BACKLOG_PLAN}` }] });
    });

    it('0033 AC-001 a Ready spec with every step ticked keeps NS-6-resume (A-001)', async () => {
        const model = await modelOf({ [BACKLOG]: specText({ plan: LINK }), [BACKLOG_PLAN]: STEPS(['[x]']) });
        expect(nextStep(model, BACKLOG)).toMatchObject({ case: 'NS-6-resume' });
    });
});

describe('0033 AC-002: Implement follows in active/', () => {
    it('0033 AC-002 an active spec without a tick offers Start implementing and Implement of the active plan', async () => {
        const model = await modelOf({ [ACTIVE]: specText({ status: 'In Progress', plan: LINK }), [ACTIVE_PLAN]: STEPS(['[ ]', '[ ]']) });
        expect(nextStep(model, ACTIVE)).toEqual({ rule: 'NS-7', case: 'NS-7', lines: [{ intent: 'Start implementing: T-001 Step', text: `Implement T-001 of ${ACTIVE_PLAN}` }] });
    });

    it('0033 AC-002 NS-7\'s effect no longer names the move to active', () => {
        expect(STEP_GUIDES['NS-7'].effect).toBe('The agent builds one step, runs its check, ticks it and stops.');
        expect(STEP_GUIDES['NS-7'].effect).not.toMatch(/moves the spec to active/);
    });

    it('0033 AC-002 an active spec with a tick keeps NS-6-open', async () => {
        const model = await modelOf({ [ACTIVE]: specText({ status: 'In Progress', plan: LINK }), [ACTIVE_PLAN]: STEPS(['[x]', '[ ]']) });
        expect(nextStep(model, ACTIVE)).toMatchObject({ rule: 'NS-6', case: 'NS-6-open' });
    });
});
