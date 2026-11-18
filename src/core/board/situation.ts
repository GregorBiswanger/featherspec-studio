import type { CriteriaProgress, FileRow, LineTarget, OpenCriterion, ProgressView, StepsProgress } from '../../shared/protocol/detail';
import { FILE_LABELS } from '../../shared/protocol/texts';
import type { LifecycleEntry } from '../lifecycle/model';
import type { ShellModel } from '../ports/shell';
import type { PlanEntry, SpecEntry } from '../specs/readProject';
import { needsOf } from './needs';
import { openStep } from './nextStep';
import { criteriaProgress, taskProgress } from './progress';
import { plainShort, shortTitle } from './shortTitle';

const CRITERION_CELL = /^[`*_~\s]*([A-Z]+-\d+)[`*_~\s]*$/;

function baseName(key: string): string {
    return key.slice(key.lastIndexOf('/') + 1);
}

function stepsOf(model: ShellModel, entry: LifecycleEntry, plan: PlanEntry): StepsProgress {
    if (plan.parsed === undefined) {
        return { kind: 'unavailable' };
    }
    const counted = taskProgress(plan);
    if (counted === undefined) {
        return { kind: 'none' };
    }
    const next = openStep(model, entry);
    return next === undefined
        ? { kind: 'steps', done: counted.done, total: counted.total }
        : { kind: 'steps', done: counted.done, total: counted.total, next: { id: next.id, title: plainShort(next.title), open: { key: plan.key, line: next.line } } };
}

function criteriaOf(entry: LifecycleEntry, spec: SpecEntry, plan: PlanEntry): CriteriaProgress {
    if (plan.parsed === undefined) {
        return { kind: 'unavailable', reason: 'unreadable' };
    }
    const counted = criteriaProgress(entry.verification);
    if (counted === undefined) {
        return { kind: 'unavailable', reason: 'no-table' };
    }
    const defined = spec.parsed?.criteria ?? [];
    const open: OpenCriterion[] = [];
    for (const row of plan.parsed.traceability) {
        const state = row.state.trim();
        if (state === 'verified') {
            continue;
        }
        const built = state === 'built';
        const id = CRITERION_CELL.exec(row.criterion.trim())?.[1];
        const criterion = id === undefined ? undefined : defined.find((candidate) => candidate.id === id);
        const planRow: LineTarget = { key: plan.key, line: row.line };
        open.push(
            criterion === undefined
                ? { text: row.criterion.trim(), built, open: planRow }
                : { id: criterion.id, text: shortTitle(criterion.text, criterion.id), built, open: { key: spec.key, line: criterion.line } },
        );
    }
    return { kind: 'criteria', verified: counted.done, total: counted.total, open };
}

export function progressOf(model: ShellModel, entry: LifecycleEntry, spec: SpecEntry): ProgressView | undefined {
    const needs = needsOf(model.project, entry);
    const plan = entry.plan === undefined ? undefined : model.project.plans.find((candidate) => candidate.key === entry.plan);
    if (plan === undefined) {
        if (entry.state === 'Done') {
            return undefined;
        }
        return { needs, noPlan: entry.state !== 'Backlog' || needs.length === 0 };
    }
    return { needs, noPlan: false, steps: stepsOf(model, entry, plan), criteria: criteriaOf(entry, spec, plan) };
}

export function filesOf(model: ShellModel, spec: SpecEntry): FileRow[] {
    const row = (label: string, key: string): FileRow => ({ label, name: baseName(key), open: { key, line: 1 } });
    const variants = new Map(model.project.plans.map((plan) => [plan.key, plan.variant]));
    const planKeys = spec.planKeys.filter((key) => variants.has(key));
    return [
        row(FILE_LABELS.spec, spec.key),
        ...planKeys.filter((key) => variants.get(key) === 'sibling').map((key) => row(FILE_LABELS.plan, key)),
        ...planKeys.filter((key) => variants.get(key) === 'archived').map((key) => row(FILE_LABELS.archivedPlan, key)),
        ...spec.returnNoteKeys.map((key) => row(FILE_LABELS.returnNote, key)),
    ];
}
