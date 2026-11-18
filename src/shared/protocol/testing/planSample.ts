import type { PlanStageView, PlanStepView, PlanView } from '../planMap';

export function step(id: string, state: PlanStepView['state'], overrides: Partial<PlanStepView> = {}): PlanStepView {
    return {
        id,
        state,
        title: `Step ${id}`,
        open: { key: '.specs/active/0007-x.plan.md', line: 40 + Number(id.slice(2)) },
        files: [],
        covers: [],
        ...overrides,
    };
}

export function stage(number: number, groups: PlanStageView['groups'], overrides: Partial<PlanStageView> = {}): PlanStageView {
    const steps = groups.flatMap((group) => group.steps).filter((entry) => entry.state !== 'notFound');
    const parallel = groups.some((group) => group.steps.length > 1);
    const sequential = groups.length > 1;
    return {
        number,
        description: `stage ${number}`,
        kind: parallel && sequential ? 'mixed' : parallel ? 'parallel' : sequential ? 'sequential' : 'single',
        parallel,
        current: false,
        finished: steps.length > 0 && steps.every((entry) => entry.state === 'done' || entry.state === 'dropped'),
        groups,
        ...overrides,
    };
}

export function planSample(overrides: Partial<PlanView> = {}): PlanView {
    const key = '.specs/active/0007-x.plan.md';
    return {
        kind: 'plan',
        plan: { key, line: 1 },
        count: { done: 2, total: 5 },
        closing: { text: 'Parallel: stage 2 (add vs. subtract: separate files).', short: 'Parallel: stage 2 (add vs. subtract: separate files).', full: 'Parallel: stage 2 (add vs. subtract: separate files).' },
        staged: true,
        stages: [
            stage(1, [{ steps: [step('T-001', 'done')] }, { sep: '→', steps: [step('T-002', 'done')] }]),
            stage(
                2,
                [
                    {
                        steps: [
                            step('T-003', 'next', { files: ['src/add.ts', 'src/add.test.ts'], covers: [{ id: 'AC-001', open: { key: '.specs/active/0007-x.md', line: 12 } }], doText: 'Add.', verify: 'npm test -- add' }),
                            step('T-004', 'open', { files: ['src/subtract.ts'], covers: [{ id: 'AC-002' }] }),
                        ],
                    },
                ],
                {
                    current: true,
                    ways: {
                        stage: 2,
                        prompts: [`Implement the whole stage 2 of ${key} in sequence`, `Implement the whole stage 2 of ${key} with subagents`, `Implement the whole stage 2 of ${key} with other agents`],
                        startLines: [`Implement T-003 of ${key} as a parallel worker.`, `Implement T-004 of ${key} as a parallel worker.`],
                    },
                },
            ),
            stage(3, [{ steps: [step('T-005', 'open')] }]),
        ],
        loose: [],
        ...overrides,
    };
}
