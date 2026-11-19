import type { LineTarget } from '../../shared/protocol/detail';
import { startLine, stagePrompt } from '../../shared/protocol/planMapTexts';
import type { PlanGroupView, PlanReturnView, PlanStageKind, PlanStageView, PlanStepState, PlanStepView, PlanUnreadableView, PlanView, PlanWaysView } from '../../shared/protocol/planMap';
import { plainShort, plainText } from '../board/shortTitle';
import { nextStep, openStep } from '../board/nextStep';
import { taskProgress } from '../board/progress';
import type { LifecycleEntry } from '../lifecycle/model';
import type { ShellModel } from '../ports/shell';
import { returnedWorkOf } from './returnedWork';
import { headOf, PARALLEL, SEQUENCE, separatorsOf, STAGE_NUMBER, type StageItem } from './stageLines';
import type { PlanStage } from '../specs/parsePlan';
import type { PlanStep } from '../specs/planSteps';
import type { ReturnNoteEntry, SpecEntry } from '../specs/readProject';


interface Context {
    steps: Map<string, PlanStep>;
    notes: Map<string, ReturnNoteEntry>;
    spec: SpecEntry;
    planKey: string;
    next: string | undefined;
    noteLies: boolean;
    returned: string | undefined;
}

function splitList(raw: string): string[] {
    return raw
        .split(',')
        .map((part) => part.replace(/`/g, '').trim())
        .filter((part) => part.length > 0);
}

function fieldText(value: { state: string; raw?: string }): string | undefined {
    return value.state === 'value' && value.raw !== undefined ? value.raw : undefined;
}

function returnOf(note: ReturnNoteEntry): PlanReturnView {
    const status = note.parsed === undefined ? undefined : fieldText(note.parsed.status.value);
    if (note.parsed === undefined || (status !== 'DONE' && status !== 'BLOCKED')) {
        return { status: 'unknown' };
    }
    if (status === 'DONE') {
        return { status: 'done' };
    }
    const reason = fieldText(note.parsed.blockedOn.value);
    return reason === undefined ? { status: 'blocked' } : { status: 'blocked', reason: plainShort(reason), reasonFull: plainText(reason) };
}

function stateOf(step: PlanStep, context: Context): PlanStepState {
    if (step.struck) {
        return 'dropped';
    }
    if (context.notes.has(step.id)) {
        return 'returned';
    }
    if (step.ticked === true) {
        return 'done';
    }
    return !context.noteLies && context.next === step.id ? 'next' : 'open';
}

function stepView(id: string, context: Context): PlanStepView {
    const step = context.steps.get(id);
    if (step === undefined) {
        return { id, state: 'notFound', title: '', files: [], covers: [] };
    }
    const state = stateOf(step, context);
    const note = context.notes.get(id);
    const doText = fieldText(step.doText);
    const verify = fieldText(step.verify);
    const files = fieldText(step.files);
    const defined = context.spec.parsed?.criteria ?? [];
    return {
        id,
        state,
        title: plainShort(step.title),
        open: { key: context.planKey, line: step.line },
        files: files === undefined ? [] : splitList(files),
        covers: step.coveredCriteria.map((cover) => {
            const criterion = defined.find((candidate) => candidate.id === cover);
            return criterion === undefined ? { id: cover } : { id: cover, open: { key: context.spec.key, line: criterion.line } };
        }),
        ...(doText === undefined ? {} : { doText: plainShort(doText) }),
        ...(verify === undefined ? {} : { verify: plainShort(verify) }),
        ...(note === undefined || state !== 'returned' ? {} : { returned: returnOf(note) }),
    };
}

function groupsOf(items: StageItem[], context: Context): PlanGroupView[] {
    const groups: PlanGroupView[] = [];
    for (const item of items) {
        const last = groups[groups.length - 1];
        if (last !== undefined && item.sep === PARALLEL) {
            last.steps.push(stepView(item.id, context));
        } else {
            groups.push({ ...(item.sep === SEQUENCE ? { sep: '→' as const } : {}), steps: [stepView(item.id, context)] });
        }
    }
    return groups;
}

function unfinished(step: PlanStepView): boolean {
    return step.state === 'next' || step.state === 'open';
}

function stageView(stage: PlanStage, items: StageItem[], description: string, current: boolean, context: Context): PlanStageView {
    const groups = groupsOf(items, context);
    const steps = groups.flatMap((group) => group.steps).filter((step) => step.state !== 'notFound');
    const holdsReturned = steps.some((step) => step.state === 'returned');
    const kind: PlanStageKind = stage.kind;
    return {
        number: stage.number,
        description,
        kind,
        parallel: kind === 'parallel' || kind === 'mixed',
        current,
        finished: steps.length > 0 && steps.every((step) => step.state === 'done' || step.state === 'dropped'),
        ...(!holdsReturned || context.returned === undefined ? {} : { returned: context.returned }),
        groups,
    };
}

function waysOf(stage: PlanStageView, planKey: string, active: boolean, nextId: string | undefined): PlanWaysView | undefined {
    if (!stage.groups.some((group) => group.steps.filter(unfinished).length >= 2)) {
        return undefined;
    }
    const holder = stage.groups.find((group) => group.steps.some((step) => step.id === nextId));
    const lines = !active || holder === undefined || holder.steps.filter(unfinished).length < 2 ? [] : holder.steps.filter(unfinished).map((step) => startLine(step.id, planKey));
    return {
        stage: stage.number,
        prompts: [stagePrompt('sequence', stage.number, planKey), stagePrompt('subagents', stage.number, planKey), stagePrompt('otherAgents', stage.number, planKey)],
        startLines: lines,
    };
}

function closingView(raw: string): PlanView['closing'] {
    const text = raw
        .split('\n')
        .map((line) => line.trim())
        .join(' ');
    return { text, short: plainShort(text), full: plainText(text) };
}

export function planOf(model: ShellModel, entry: LifecycleEntry, spec: SpecEntry): PlanView | PlanUnreadableView | undefined {
    if (entry.state === 'Done' || entry.plan === undefined) {
        return undefined;
    }
    const plan = model.project.plans.find((candidate) => candidate.key === entry.plan);
    if (plan === undefined) {
        return undefined;
    }
    if (plan.parsed === undefined) {
        return { kind: 'unreadable' };
    }
    const notes = new Map<string, ReturnNoteEntry>();
    for (const note of model.project.returnNotes.filter((candidate) => spec.returnNoteKeys.includes(candidate.key))) {
        if (!notes.has(note.stepId)) {
            notes.set(note.stepId, note);
        }
    }
    const context: Context = {
        steps: new Map(plan.parsed.steps.map((step) => [step.id, step])),
        notes,
        spec,
        planKey: plan.key,
        next: openStep(model, entry)?.id,
        noteLies: spec.returnNoteKeys.length > 0,
        returned: returnedWorkOf(model, entry, spec),
    };
    const rows = plan.parsed.stages.stages
        .map((stage) => {
            const { head, description } = headOf(stage.raw.split('\n')[0]!.replace(STAGE_NUMBER, ''));
            const rest = stage.raw.split('\n').slice(1).map((line) => line.trim());
            return { stage, items: separatorsOf(head), description: plainText([description, ...rest].join(' ')) };
        })
        .filter((row) => row.items.length > 0);
    const placed = new Set(rows.flatMap((row) => row.items.map((item) => item.id)));
    const currentIndex = rows.findIndex((row) => context.next !== undefined && row.items.some((item) => item.id === context.next));
    const stages = rows.map((row, index) => stageView(row.stage, row.items, row.description, index === currentIndex, context));
    const next = nextStep(model, entry.key);
    const waysCase = !context.noteLies && next !== undefined && 'lines' in next && (next.case === 'NS-6-open' || next.case === 'NS-7');
    const current = stages[currentIndex];
    if (waysCase && current !== undefined) {
        const ways = waysOf(current, plan.key, entry.state === 'Active', context.next);
        if (ways !== undefined) {
            current.ways = ways;
        }
    }
    const counted = taskProgress(plan);
    const closing = plan.parsed.stages.closing;
    const loose = plan.parsed.steps.filter((step) => rows.length === 0 || !placed.has(step.id)).map((step) => stepView(step.id, context));
    const target: LineTarget = { key: plan.key, line: 1 };
    return {
        kind: 'plan',
        plan: target,
        ...(counted === undefined ? {} : { count: counted }),
        ...(closing === undefined ? {} : { closing: closingView(closing.raw) }),
        ...(context.returned === undefined ? {} : { returned: context.returned }),
        staged: rows.length > 0,
        stages,
        loose,
    };
}
