import {
    continueIntent,
    INTEGRATE_INTENT,
    NEXT_STEP_DONE_TEXT,
    NEXT_STEP_UNREADABLE_TEXT,
    nextStepNumberUsedText,
    NS2_INTENT,
    NS4_INTENT,
    NS5_INTENT,
    NS5_THEN_INTENT,
    NS6_REPORT_FIRST_INTENT,
    NS6_REPORT_INTENT,
    NS6_RESUME_INTENT,
    NS8_INTENT,
    NS9_INTENT,
    NS9_THEN_INTENT,
    startIntent,
    STEP_GUIDES,
    type StepCase,
    verifiedWithoutTickReason,
    WRITE_PLAN_INTENT,
} from '../../shared/protocol/nextStepTexts';
import type { StepView } from '../../shared/protocol/stepView';
import type { LifecycleEntry } from '../lifecycle/model';
import type { ShellModel } from '../ports/shell';
import type { ParsedPlan } from '../specs/parsePlan';
import type { PlanStep } from '../specs/planSteps';
import type { SpecEntry } from '../specs/readProject';
import { levelsOnImplement } from '../specs/version';
import { plainShort } from './shortTitle';

export const NEXT_STEP_RULE_IDS = ['NS-1', 'NS-2', 'NS-11', 'NS-3', 'NS-4', 'NS-5', 'NS-6', 'NS-7', 'NS-8', 'NS-9', 'NS-10'] as const;
export type NextStepRuleId = (typeof NEXT_STEP_RULE_IDS)[number];

export interface NextStepLine {
    text: string;
    intent: string;
}

export type NextStep = { rule: NextStepRuleId; case: StepCase; lines: NextStepLine[]; reason?: string } | { rule: NextStepRuleId; text: string };

function lines(rule: NextStepRuleId, stepCase: StepCase, ...texts: NextStepLine[]): NextStep {
    return { rule, case: stepCase, lines: texts };
}

export function openStep(model: ShellModel, entry: LifecycleEntry): PlanStep | undefined {
    const plan = model.project.plans.find((candidate) => candidate.key === entry.plan);
    return (plan?.parsed?.steps ?? []).find((step) => step.ticked !== true && !step.struck);
}

export function verifiedWithoutTick(plan: ParsedPlan | undefined): PlanStep | undefined {
    return (plan?.steps ?? []).find((step) => !step.struck && step.ticked !== true && step.verified.state === 'value');
}

const STEP_TOKEN = /\bT-\d+\b/g;

export function reportSign(plan: ParsedPlan | undefined, open: PlanStep): boolean {
    const field = plan?.currentStep.value;
    if (plan === undefined || field?.state !== 'value') {
        return false;
    }
    const named = new Set(field.raw.match(STEP_TOKEN) ?? []);
    const unfinished = plan.steps.filter((step) => named.has(step.id) && step.ticked !== true && !step.struck);
    return unfinished.length > 0 && !unfinished.some((step) => step.id === open.id);
}

export function startLine(model: ShellModel, entry: LifecycleEntry): string {
    const plan = entry.plan ?? '';
    const id = openStep(model, entry)?.id;
    return id === undefined ? `Implement ${plan}` : `Start ${id} of ${plan}`;
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
        return lines('NS-2', 'NS-2', { intent: NS2_INTENT, text: `/sdd-lifecycle ${key}` });
    }
    if (others.some((other) => other.number === spec.number && other.slug !== spec.slug)) {
        return { rule: 'NS-11', text: nextStepNumberUsedText(spec.number) };
    }
    switch (entry.state) {
        case 'Done':
            return { rule: 'NS-3', text: NEXT_STEP_DONE_TEXT };
        case 'Blocked':
            return entry.plan === undefined
                ? lines('NS-4', 'NS-4', { intent: NS4_INTENT, text: '/sdd-overview' })
                : lines('NS-4', 'NS-4-plan', { intent: NS4_INTENT, text: `/sdd-plan ${key}` });
        case 'Review':
            return lines('NS-5', 'NS-5', { intent: NS5_INTENT, text: `/sdd-compile ${key}` }, { intent: NS5_THEN_INTENT, text: `/sdd-lifecycle ${key}` });
        case 'Active': {
            if (spec.returnNoteKeys.length > 0) {
                return lines('NS-6', 'NS-6-returned', { intent: INTEGRATE_INTENT, text: `/sdd-plan ${key}` });
            }
            if (entry.plan === undefined) {
                return lines('NS-6', 'NS-6-plan', { intent: WRITE_PLAN_INTENT, text: `/sdd-plan ${key}` });
            }
            const open = openStep(model, entry);
            if (open === undefined) {
                return lines('NS-6', 'NS-6-resume', { intent: NS6_RESUME_INTENT, text: `/sdd-plan ${key}` });
            }
            const continueLine = { intent: continueIntent(open.id, plainShort(open.title)), text: `Implement ${open.id} of ${entry.plan}` };
            const plan = model.project.plans.find((candidate) => candidate.key === entry.plan)?.parsed;
            const untouched = verifiedWithoutTick(plan);
            if (untouched !== undefined) {
                return {
                    ...lines('NS-6', 'NS-6-report', { intent: NS6_REPORT_FIRST_INTENT, text: `/sdd-plan ${key}` }, continueLine),
                    reason: verifiedWithoutTickReason(untouched.id),
                } as NextStep;
            }
            if (reportSign(plan, open) && !levelsOnImplement(model.project.version)) {
                return lines('NS-6', 'NS-6-report', { intent: NS6_REPORT_FIRST_INTENT, text: `/sdd-plan ${key}` }, continueLine);
            }
            return lines('NS-6', 'NS-6-open', continueLine, { intent: NS6_REPORT_INTENT, text: `/sdd-plan ${key}` });
        }
        case 'Ready': {
            const open = openStep(model, entry);
            return lines('NS-7', 'NS-7', { intent: startIntent(open?.id, plainShort(open?.title ?? '')), text: startLine(model, entry) });
        }
        case 'Backlog': {
            if (entry.readiness.checks.some((check) => check.id === 'R-2' && check.result === 'fail')) {
                return lines('NS-8', 'NS-8', { intent: NS8_INTENT, text: `/sdd-specify ${key}` });
            }
            if (entry.plan === undefined) {
                return lines('NS-9', 'NS-9', { intent: NS9_INTENT, text: `/sdd-clarify ${key}` }, { intent: NS9_THEN_INTENT, text: `/sdd-plan ${key}` });
            }
            return lines('NS-10', 'NS-10', { intent: WRITE_PLAN_INTENT, text: `/sdd-plan ${key}` });
        }
    }
}

export function shortForm(line: string): string {
    const command = /^\/sdd-[a-z-]+/.exec(line);
    if (command !== null) {
        return command[0];
    }
    const start = /^Start (\S+) of /.exec(line);
    if (start !== null) {
        return `Start ${start[1]}`;
    }
    const implement = /^Implement (\S+) of /.exec(line);
    if (implement !== null) {
        return `Implement ${implement[1]}`;
    }
    return line.startsWith('Implement ') ? 'Implement' : line;
}

export function stepView(model: ShellModel, key: string): StepView | undefined {
    const next = nextStep(model, key);
    if (next === undefined || !('lines' in next)) {
        return undefined;
    }
    const first = next.lines[0]!;
    return { intent: STEP_GUIDES[next.case].short, short: shortForm(first.text), line: first.text, lines: next.lines.map((line) => ({ text: line.text, intent: line.intent })) };
}
