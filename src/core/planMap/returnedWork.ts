import { waitingIntegrateIntent } from '../../shared/protocol/nextStepTexts';
import { groupReturnedText, returnedWorkText, type ReturnedClause } from '../../shared/protocol/planMapTexts';
import { nextStep } from '../board/nextStep';
import type { LifecycleEntry } from '../lifecycle/model';
import type { ShellModel } from '../ports/shell';
import type { PlanEntry, ReturnNoteEntry, SpecEntry } from '../specs/readProject';
import { headOf, idGroupsOf, separatorsOf, STAGE_NUMBER } from './stageLines';

interface Returned {
    ids: string[];
    blocked: Set<string>;
}

function statusOf(note: ReturnNoteEntry): 'DONE' | 'BLOCKED' | 'unknown' {
    const value = note.parsed?.status.value;
    const raw = value?.state === 'value' ? value.raw : undefined;
    return raw === 'DONE' || raw === 'BLOCKED' ? raw : 'unknown';
}

function returnedOf(model: ShellModel, spec: SpecEntry): Returned {
    const ids: string[] = [];
    const blocked = new Set<string>();
    for (const note of model.project.returnNotes.filter((candidate) => spec.returnNoteKeys.includes(candidate.key))) {
        if (ids.includes(note.stepId)) {
            continue;
        }
        ids.push(note.stepId);
        if (statusOf(note) === 'BLOCKED') {
            blocked.add(note.stepId);
        }
    }
    return { ids, blocked };
}

function clauseOf(model: ShellModel, key: string): ReturnedClause {
    const next = nextStep(model, key);
    if (next === undefined || !('case' in next)) {
        return 'none';
    }
    return next.case === 'NS-6-returned' ? 'integrates' : next.case === 'NS-4' || next.case === 'NS-4-plan' ? 'finds-out' : 'none';
}

function inPlanOrder(ids: Iterable<string>, order: readonly string[]): string[] {
    const wanted = new Set(ids);
    const known = order.filter((id) => wanted.has(id));
    return [...known, ...[...wanted].filter((id) => !order.includes(id)).sort()];
}

function groupView(plan: PlanEntry, returned: Returned, order: readonly string[]): { text: string; out: string[] } | undefined {
    const parsed = plan.parsed;
    if (parsed === undefined) {
        return undefined;
    }
    const steps = new Map(parsed.steps.map((step) => [step.id, step]));
    let k = 0;
    let m = 0;
    const blocked: string[] = [];
    const out: string[] = [];
    for (const stage of parsed.stages.stages) {
        const { head } = headOf(stage.raw.split('\n')[0]!.replace(STAGE_NUMBER, ''));
        for (const group of idGroupsOf(separatorsOf(head))) {
            const members = group.filter((id) => steps.has(id) && steps.get(id)!.struck !== true);
            const back = members.filter((id) => returned.ids.includes(id));
            if (members.length < 2 || back.length === 0) {
                continue;
            }
            k += back.length;
            m += members.length;
            blocked.push(...back.filter((id) => returned.blocked.has(id)));
            out.push(...members.filter((id) => !returned.ids.includes(id) && steps.get(id)!.ticked !== true));
        }
    }
    return out.length === 0 ? undefined : { text: groupReturnedText(k, m, inPlanOrder(blocked, order), inPlanOrder(out, order)), out: inPlanOrder(out, order) };
}

export interface ReturnedWork {
    text: string;
    group: boolean;
    out?: string[];
}

export function returnedWorkViewOf(model: ShellModel, entry: LifecycleEntry, spec: SpecEntry): ReturnedWork | undefined {
    const returned = returnedOf(model, spec);
    if (returned.ids.length === 0) {
        return undefined;
    }
    const plan = model.project.plans.find((candidate) => candidate.key === entry.plan);
    const order = (plan?.parsed?.steps ?? []).map((step) => step.id);
    const group = plan === undefined ? undefined : groupView(plan, returned, order);
    return group === undefined ? { text: returnedWorkText(returned.ids.length, inPlanOrder(returned.blocked, order), clauseOf(model, entry.key)), group: false } : { text: group.text, group: true, out: group.out };
}

export function returnedWorkOf(model: ShellModel, entry: LifecycleEntry, spec: SpecEntry): string | undefined {
    return returnedWorkViewOf(model, entry, spec)?.text;
}

export function integrateIsQuiet(model: ShellModel, entry: LifecycleEntry, spec: SpecEntry): boolean {
    const next = nextStep(model, entry.key);
    return returnedWorkViewOf(model, entry, spec)?.group === true && next !== undefined && 'case' in next && next.case === 'NS-6-returned';
}

/** 0032 §6.5: the intent of the quiet Integrate names the members that are not back; undefined once all are back. */
export function waitingIntentOf(model: ShellModel, entry: LifecycleEntry, spec: SpecEntry): string | undefined {
    if (!integrateIsQuiet(model, entry, spec)) {
        return undefined;
    }
    const out = returnedWorkViewOf(model, entry, spec)?.out;
    return out === undefined || out.length === 0 ? undefined : waitingIntegrateIntent(out);
}
