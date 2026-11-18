import {
    NEED_CRITERIA_TEXT,
    NEED_PLAN_LINK_TEXT,
    NEED_PLAN_NO_STATUS_TEXT,
    NEED_PLAN_STARTED_TEXT,
    NEED_PLAN_TEXT,
} from '../../shared/protocol/texts';
import { headerValue, siblingPlanKey } from '../lifecycle/entryContext';
import type { LifecycleEntry } from '../lifecycle/model';
import type { ProjectRead } from '../specs/readProject';

export type NeedRule = 'R-2' | 'R-3' | 'R-4';

export interface Need {
    text: string;
    rule: NeedRule;
}

export function needsOf(project: ProjectRead, entry: LifecycleEntry): Need[] {
    if (entry.state !== 'Backlog') {
        return [];
    }
    const spec = project.specs.find((candidate) => candidate.key === entry.key);
    if (spec === undefined || spec.parsed === undefined) {
        return [];
    }
    const failing = new Set(entry.readiness.failing);
    const plan = project.plans.find((candidate) => candidate.variant === 'sibling' && candidate.key === siblingPlanKey(entry.key));
    const needs: Need[] = [];
    if (failing.has('R-2')) {
        needs.push({ text: NEED_CRITERIA_TEXT, rule: 'R-2' });
    }
    if (failing.has('R-3')) {
        needs.push({ text: plan === undefined ? NEED_PLAN_TEXT : NEED_PLAN_LINK_TEXT, rule: 'R-3' });
    }
    if (failing.has('R-4') && plan?.parsed !== undefined) {
        const status = headerValue(plan.parsed.status);
        if (status === 'In Progress' || status === 'Done') {
            needs.push({ text: NEED_PLAN_STARTED_TEXT, rule: 'R-4' });
        } else if (status === undefined) {
            needs.push({ text: NEED_PLAN_NO_STATUS_TEXT, rule: 'R-4' });
        }
    }
    return needs;
}
