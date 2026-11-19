import { describe, expect, it } from 'vitest';
import type { PlanStepView, PlanView } from '../../shared/protocol/planMap';
import { buildDetail } from '../board/detail';
import { splitterFiles, TIP_SPLITTER_STEPS } from '../board/testing/caseFixtures';
import { modelOf } from '../board/testing/boardWorld';
import type { ShellModel } from '../ports/shell';
import { dropNotes, fixtureModel, parallelModel, PARALLEL_SPEC, replaceIn, PARALLEL_PLAN } from './testing/plans';

const NO_HISTORY = { available: true as const, label: '', entries: [] };

function stepsOf(model: ShellModel, key: string): Map<string, PlanStepView> {
    const entry = model.lifecycle.entries.find((candidate) => candidate.key === key)!;
    const view = buildDetail({ selection: { stem: entry.stem, path: key }, model, history: NO_HISTORY });
    if (view.kind !== 'spec' || view.plan?.kind !== 'plan') {
        throw new Error('expected a plan');
    }
    const plan: PlanView = view.plan;
    return new Map([...plan.stages.flatMap((stage) => stage.groups.flatMap((group) => group.steps)), ...plan.loose].map((step) => [step.id, step]));
}

describe('0025 AC-007: the card rows Verified, Reported and the state word of a covered criterion', () => {
    it('0025 AC-007: a done step carries its Verified text, short and full; an open step none', async () => {
        const steps = stepsOf(await parallelModel(dropNotes), PARALLEL_SPEC);
        expect(steps.get('T-001')?.verified).toEqual({ short: '2026-11-09 · npm test green', full: '2026-11-09 · npm test green' });
        expect(steps.get('T-003')?.verified).toBeUndefined();
        expect(steps.get('T-003')?.reported).toBeUndefined();
    });

    it('0025 AC-007: a returned step carries what its note reported, a done step does not', async () => {
        const steps = stepsOf(await fixtureModel('fs110-parallel-synthetic'), PARALLEL_SPEC);
        expect(steps.get('T-003')?.state).toBe('returned');
        expect(steps.get('T-003')?.reported?.full).toBe('2026-11-10 · npm test -- add: red → green 3 of 3');
        expect(steps.get('T-003')?.verified).toBeUndefined();
        expect(steps.get('T-001')?.reported).toBeUndefined();
    });

    it('0025 AC-007: a placeholder Verified value gives no row', async () => {
        const steps = stepsOf(await fixtureModel('fs110-parallel-synthetic'), PARALLEL_SPEC);
        expect(steps.get('T-005')?.verified).toBeUndefined();
    });

    it('0025 AC-007: a covered criterion carries its state word only where exactly one traceability row names it with exactly that word', async () => {
        const steps = stepsOf(await parallelModel(dropNotes), PARALLEL_SPEC);
        expect(steps.get('T-002')?.covers.map((cover) => [cover.id, cover.state])).toEqual([['AC-001', 'built'], ['AC-002', 'open']]);
        expect(steps.get('T-005')?.covers.map((cover) => [cover.id, cover.state])).toEqual([['AC-001', 'built'], ['AC-002', 'open']]);
    });

    it('0025 AC-007: a verified row gives the word verified; an unknown word, a doubled row or a missing row give none (no guess)', async () => {
        const verified = await parallelModel(dropNotes, replaceIn(PARALLEL_PLAN, '| AC-001 | T-001, T-003 | `src/add.ts` | `src/add.test.ts` — adds | built |', '| AC-001 | T-001, T-003 | `src/add.ts` | `src/add.test.ts` — adds | verified |'));
        expect(stepsOf(verified, PARALLEL_SPEC).get('T-001')?.covers[0]?.state).toBe('verified');
        const odd = await parallelModel(dropNotes, replaceIn(PARALLEL_PLAN, '| AC-001 | T-001, T-003 | `src/add.ts` | `src/add.test.ts` — adds | built |', '| AC-001 | T-001, T-003 | `src/add.ts` | `src/add.test.ts` — adds | mostly built |'));
        expect(stepsOf(odd, PARALLEL_SPEC).get('T-001')?.covers[0]?.state).toBeUndefined();
        const doubled = await parallelModel(dropNotes, replaceIn(PARALLEL_PLAN, '| AC-003 | T-005 |', '| AC-001 | T-005 | — | — | open |\n| AC-003 | T-005 |'));
        expect(stepsOf(doubled, PARALLEL_SPEC).get('T-001')?.covers[0]?.state).toBeUndefined();
        const missing = await parallelModel(dropNotes, replaceIn(PARALLEL_PLAN, '| AC-002 | T-002, T-004 | — | — | open |\n', ''));
        expect(stepsOf(missing, PARALLEL_SPEC).get('T-004')?.covers[0]?.state).toBeUndefined();
    });
});

describe('0025 AC-008: Copy prompt on the card of the step the first line names', () => {
    it('0025 AC-008: no notes - the step of the first line carries exactly that line, no other card does', async () => {
        const steps = stepsOf(await parallelModel(dropNotes), PARALLEL_SPEC);
        const copies = [...steps.values()].filter((step) => step.copy !== undefined);
        expect(copies.map((step) => step.id)).toEqual(['T-003']);
        expect(copies[0]?.copy).toBe(`Implement T-003 of ${PARALLEL_PLAN}`);
    });

    it('0025 AC-008: while a return note lies no card carries a Copy prompt', async () => {
        const steps = stepsOf(await fixtureModel('fs110-parallel-synthetic'), PARALLEL_SPEC);
        expect([...steps.values()].filter((step) => step.copy !== undefined)).toEqual([]);
        const partial = stepsOf(await fixtureModel('fs-partial-return'), '.specs/active/0001-fixture-demo.md');
        expect([...partial.values()].filter((step) => step.copy !== undefined)).toEqual([]);
    });

    it('0025 AC-008: a first line that is not an Implement line (all steps ticked: /sdd-compile) gives no card a Copy prompt', async () => {
        const model = await modelOf(splitterFiles({ ticked: TIP_SPLITTER_STEPS.map(([id]) => id), status: 'In Progress' }));
        const steps = stepsOf(model, model.lifecycle.entries[0]!.key);
        expect([...steps.values()].filter((step) => step.copy !== undefined)).toEqual([]);
    });
});
