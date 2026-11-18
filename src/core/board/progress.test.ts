import { describe, expect, it } from 'vitest';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { planText, readFixture, readMemory, row, specText } from '../lifecycle/testing/projects';
import { buildCards } from './cards';
import { cardLastChange } from './lastChange';
import { criteriaProgress, taskProgress } from './progress';

const LINKED = '[0001-a.plan.md](0001-a.plan.md)';
const ARCHIVE = '[0001-a.2026-11-01.plan.md](../plan-archive/0001-a.2026-11-01.plan.md)';

function steps(lines: string[]): string {
    return `${planText({ status: 'In Progress' })}\n## Steps\n\n${lines.join('\n')}\n`;
}

const STEP = (id: string, ticked: boolean | undefined, struck = false) =>
    `### ${struck ? '~~' : ''}${id} — Title${struck ? '~~' : ''}\n\n- ${ticked === undefined ? '' : `[${ticked ? 'x' : ' '}] `}**Verified (${id}):** ${ticked ? 'done' : '—'}\n`;

async function entryOf(files: Record<string, string>, key = '.specs/active/0001-a.md') {
    const project = await readMemory(files);
    const lifecycle = deriveLifecycle(project);
    const entry = lifecycle.entries.find((candidate) => candidate.key === key)!;
    return { project, lifecycle, entry, plan: project.plans.find((candidate) => candidate.key === entry.plan) };
}

const SPEC = { '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: LINKED }) };

describe('task progress', () => {
    it('AC-006: ticked steps of all steps, struck steps not counted, an undetermined tick counts as not ticked', async () => {
        const text = steps([STEP('T-001', true), STEP('T-002', true), STEP('T-003', false), STEP('T-004', true, true), STEP('T-005', undefined)]);
        const { plan } = await entryOf({ ...SPEC, '.specs/active/0001-a.plan.md': text });
        expect(taskProgress(plan)).toEqual({ done: 2, total: 4 });
    });

    it('AC-006: no plan, or a plan with no countable step, gives not available and never zero', async () => {
        const none = await entryOf(SPEC);
        expect(taskProgress(none.plan)).toBeUndefined();
        const empty = await entryOf({ ...SPEC, '.specs/active/0001-a.plan.md': planText({ status: 'In Progress' }) });
        expect(taskProgress(empty.plan)).toBeUndefined();
        const onlyStruck = await entryOf({ ...SPEC, '.specs/active/0001-a.plan.md': steps([STEP('T-001', true, true)]) });
        expect(taskProgress(onlyStruck.plan)).toBeUndefined();
    });

    it('AC-006: a done/ spec counts the archived plan its Plan line links', async () => {
        const { plan } = await entryOf(
            {
                '.specs/done/0001-a.md': specText({ status: 'Implemented', plan: ARCHIVE }),
                '.specs/plan-archive/0001-a.2026-11-01.plan.md': steps([STEP('T-001', true), STEP('T-002', true)]),
            },
            '.specs/done/0001-a.md',
        );
        expect(taskProgress(plan)).toEqual({ done: 2, total: 2 });
    });
});

describe('criteria progress', () => {
    it('AC-006: verified rows of all rows, other values counted in the total; the same numbers as 0003 reports', async () => {
        const { entry } = await entryOf({
            ...SPEC,
            '.specs/active/0001-a.plan.md': planText({ rows: [row('AC-001', 'verified'), row('AC-002', 'built'), row('AC-003', 'open'), row('AC-004', 'wip')] }),
        });
        expect(criteriaProgress(entry.verification)).toEqual({ done: 1, total: 4 });
    });

    it('AC-006: no table or no rows gives not available, never 0 of 0', async () => {
        const { entry } = await entryOf({ ...SPEC, '.specs/active/0001-a.plan.md': planText({ rows: [] }) });
        expect(criteriaProgress(entry.verification)).toBeUndefined();
    });
});

describe('card last change', () => {
    it('AC-021: a card takes the date of L-1 from the spec, its plan and the plan\'s Last updated line', async () => {
        const project = await readFixture('fs110-ready-synthetic');
        const lifecycle = deriveLifecycle(project);
        const cards = buildCards(project, lifecycle);
        cards.forEach((card) => {
            const spec = project.specs.find((candidate) => candidate.key === card.key)!;
            const plan = project.plans.find((candidate) => candidate.key === lifecycle.entries.find((entry) => entry.key === card.key)?.plan);
            expect(card.lastChange).toEqual(cardLastChange(plan?.parsed?.lastUpdated.value, spec.modifiedMs, plan?.modifiedMs));
        });
        expect(cards.some((card) => card.lastChange !== undefined)).toBe(true);
    });

    it('AC-025: a card carries the figures of the progress functions', async () => {
        const { project, lifecycle } = await entryOf({ ...SPEC, '.specs/active/0001-a.plan.md': steps([STEP('T-001', true), STEP('T-002', false)]) });
        const card = buildCards(project, lifecycle)[0]!;
        expect(card.tasks).toEqual({ done: 1, total: 2 });
        expect(card.criteria).toBeUndefined();
    });
});
