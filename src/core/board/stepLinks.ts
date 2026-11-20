import type { StepLinkView } from '../../shared/protocol/stepView';
import type { LifecycleEntry } from '../lifecycle/model';
import type { ShellModel } from '../ports/shell';

const STEP_ID = /\bT-\d+\b/g;

export function stepLinkOf(model: ShellModel, entry: LifecycleEntry, text: string): StepLinkView | undefined {
    if (entry.state === 'Done' || entry.plan === undefined) {
        return undefined;
    }
    const steps = model.project.plans.find((candidate) => candidate.key === entry.plan)?.parsed?.steps;
    if (steps === undefined) {
        return undefined;
    }
    for (const id of text.match(STEP_ID) ?? []) {
        const step = steps.find((candidate) => candidate.id === id);
        if (step !== undefined) {
            return { id, open: { key: entry.plan, line: step.line } };
        }
    }
    return undefined;
}
