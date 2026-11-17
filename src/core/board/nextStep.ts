import {
    NEXT_STEP_DONE_TEXT,
    NEXT_STEP_THEN_AFTER_READY_LABEL,
    NEXT_STEP_THEN_LABEL,
    NEXT_STEP_UNREADABLE_TEXT,
    nextStepNumberUsedText,
} from '../../shared/protocol/nextStepTexts';
import type { LifecycleEntry } from '../lifecycle/model';
import type { ShellModel } from '../ports/shell';
import type { SpecEntry } from '../specs/readProject';

export const NEXT_STEP_RULE_IDS = ['NS-1', 'NS-2', 'NS-11', 'NS-3', 'NS-4', 'NS-5', 'NS-6', 'NS-7', 'NS-8', 'NS-9', 'NS-10'] as const;
export type NextStepRuleId = (typeof NEXT_STEP_RULE_IDS)[number];

export interface NextStepLine {
    text: string;
    label?: string;
}

export type NextStep = { rule: NextStepRuleId; lines: NextStepLine[] } | { rule: NextStepRuleId; text: string };

function lines(rule: NextStepRuleId, ...texts: NextStepLine[]): NextStep {
    return { rule, lines: texts };
}

function openStep(model: ShellModel, entry: LifecycleEntry): string | undefined {
    const plan = model.project.plans.find((candidate) => candidate.key === entry.plan);
    const first = (plan?.parsed?.steps ?? []).find((step) => step.ticked !== true && !step.struck);
    return first?.id;
}

function readable(spec: SpecEntry): boolean {
    return spec.readable && spec.parsed !== undefined;
}

export function nextStep(model: ShellModel, key: string): NextStep | undefined {
    const entry = model.lifecycle.entries.find((candidate) => candidate.key === key);
    const spec = model.project.specs.find((candidate) => candidate.key === key);
    if (entry === undefined || spec === undefined) {
        return undefined;
    }
    if (!readable(spec)) {
        return { rule: 'NS-1', text: NEXT_STEP_UNREADABLE_TEXT };
    }
    const others = model.project.specs.filter((candidate) => candidate.key !== key);
    const contradiction = entry.diagnostics.some((diagnostic) => diagnostic.kind === 'lifecycle-contradiction');
    if (contradiction || others.some((other) => other.reference === spec.reference)) {
        return lines('NS-2', { text: `/sdd-lifecycle ${key}` });
    }
    if (others.some((other) => other.number === spec.number && other.slug !== spec.slug)) {
        return { rule: 'NS-11', text: nextStepNumberUsedText(spec.number) };
    }
    switch (entry.state) {
        case 'Done':
            return { rule: 'NS-3', text: NEXT_STEP_DONE_TEXT };
        case 'Blocked':
            return lines('NS-4', { text: entry.plan === undefined ? '/sdd-overview' : `/sdd-plan ${key}` });
        case 'Review':
            return lines('NS-5', { text: `/sdd-compile ${key}` }, { text: `/sdd-lifecycle ${key}`, label: NEXT_STEP_THEN_AFTER_READY_LABEL });
        case 'Active':
            return lines('NS-6', { text: `/sdd-plan ${key}` });
        case 'Ready': {
            const plan = entry.plan ?? '';
            const id = openStep(model, entry);
            return lines('NS-7', { text: id === undefined ? `Implement ${plan}` : `Start ${id} of ${plan}` });
        }
        case 'Backlog': {
            if (entry.readiness.checks.some((check) => check.id === 'R-2' && check.result === 'fail')) {
                return lines('NS-8', { text: `/sdd-specify ${key}` });
            }
            if (entry.plan === undefined) {
                return lines('NS-9', { text: `/sdd-clarify ${key}` }, { text: `/sdd-plan ${key}`, label: NEXT_STEP_THEN_LABEL });
            }
            return lines('NS-10', { text: `/sdd-plan ${key}` });
        }
    }
}
