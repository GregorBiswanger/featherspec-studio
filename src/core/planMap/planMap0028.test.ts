import { describe, expect, it } from 'vitest';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { readMemory } from '../lifecycle/testing/projects';
import type { PlanView } from '../../shared/protocol/planMap';
import type { ShellModel } from '../ports/shell';
import { SPLITTER_SPEC, splitterFiles, type TipSplitterOptions } from '../board/testing/caseFixtures';
import { planOf } from './planMap';

const STAGES = '1. T-001 → T-002\n2. T-003 ‖ T-004\n3. T-005 → T-006';
const PLAN = '.specs/active/0001-tip-splitter.plan.md';

async function viewOf(options: TipSplitterOptions, version: string): Promise<{ view: PlanView; state: string }> {
    const project = await readMemory(splitterFiles({ stages: STAGES, ticked: ['T-001', 'T-002'], ...options }), version);
    const model: ShellModel = { project, lifecycle: deriveLifecycle(project) };
    const entry = model.lifecycle.entries[0]!;
    const view = planOf(model, entry, model.project.specs.find((spec) => spec.key === SPLITTER_SPEC)!);
    if (view === undefined || view.kind !== 'plan') {
        throw new Error('no plan view');
    }
    return { view, state: entry.state };
}

describe('0028 AC-007: while Report first holds the Plan map offers no ways and marks the open step', () => {
    it('Current step T-004 below 1.11.0: Active, no Ways to run stage 2, the next marker on T-003', async () => {
        const { view, state } = await viewOf({ currentStep: 'T-004' }, '1.10.0');
        expect(state).toBe('Active');
        expect(view.stages.every((stage) => stage.ways === undefined)).toBe(true);
        const stage = view.stages[1]!;
        expect(stage.current).toBe(true);
        expect(stage.groups.flatMap((group) => group.steps).map((step) => [step.id, step.state])).toEqual([['T-003', 'next'], ['T-004', 'open']]);
    });

    it('Current step naming the open step T-003: the same plan shows the ways of stage 2 with both start lines (0023 AC-009)', async () => {
        const { view } = await viewOf({ currentStep: 'T-003' }, '1.10.0');
        expect(view.stages[1]!.ways).toMatchObject({ stage: 2, startLines: [`Implement T-003 of ${PLAN} as a parallel worker.`, `Implement T-004 of ${PLAN} as a parallel worker.`] });
        expect(view.stages[0]!.ways).toBeUndefined();
    });

    it('negative control: the sign from 1.11.0 gives variant A, and the ways show again', async () => {
        const { view } = await viewOf({ currentStep: 'T-004' }, '1.11.0');
        expect(view.stages[1]!.ways).toMatchObject({ stage: 2 });
    });

    it('negative control: a plan Not started with an open step is Active and shows the ways', async () => {
        const { view, state } = await viewOf({ status: 'Not started' }, '1.10.0');
        expect(state).toBe('Active');
        expect(view.stages[1]!.ways).toMatchObject({ stage: 2 });
    });

    it('a Review spec (finished plan) offers no ways', async () => {
        const { view, state } = await viewOf({ ticked: ['T-001', 'T-002', 'T-003', 'T-004', 'T-005', 'T-006'] }, '1.10.0');
        expect(state).toBe('Review');
        expect(view.stages.every((stage) => stage.ways === undefined)).toBe(true);
    });
});
