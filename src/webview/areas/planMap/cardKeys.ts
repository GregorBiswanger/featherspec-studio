import type { PlanStageView, PlanStepView, PlanView } from '../../../shared/protocol/planMap';

export const LOOSE_STAGE = 'loose';

function keyOf(place: string, id: string, seen: Map<string, number>): string {
    const base = `${place}|${id}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return `${base}|${count}`;
}

export function stageCardKeys(stage: PlanStageView): string[][] {
    const seen = new Map<string, number>();
    return stage.groups.map((group) => group.steps.map((step) => keyOf(String(stage.number), step.id, seen)));
}

export function looseCardKeys(loose: readonly PlanStepView[]): string[] {
    const seen = new Map<string, number>();
    return loose.map((step) => keyOf(LOOSE_STAGE, step.id, seen));
}

export function cardRowsOf(plan: PlanView): string[][] {
    const rows: string[][] = [];
    for (const stage of plan.stages) {
        if (!stage.finished) {
            stageCardKeys(stage).forEach((keys, index) => rows.push(keys.filter((_, position) => stage.groups[index]!.steps[position]!.state !== 'notFound')));
        }
    }
    const loose = looseCardKeys(plan.loose);
    if (plan.staged) {
        rows.push(loose);
    } else {
        loose.forEach((key) => rows.push([key]));
    }
    return rows.filter((row) => row.length > 0);
}
