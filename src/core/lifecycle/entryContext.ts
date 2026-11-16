import type { Diagnostic } from '../specs/diagnostics';
import type { PlanEntry, ProjectRead, SpecEntry } from '../specs/readProject';
import type { HeaderField } from '../specs/parseSpec';
import type { ContradictionDiagnostic } from './model';

export interface EntryContext {
    entry: SpecEntry;
    status: string | undefined;
    specReadable: boolean;
    siblingPlan: PlanEntry | undefined;
    siblingPlanReadable: boolean;
    planStatus: string | undefined;
    blocked: boolean;
    diagnostics: Diagnostic[];
    contradictions: ContradictionDiagnostic[];
}

export function headerValue(field: HeaderField | undefined): string | undefined {
    return field !== undefined && field.value.state === 'value' ? field.value.raw : undefined;
}

export function siblingPlanKey(specKey: string): string {
    return specKey.replace(/\.md$/, '.plan.md');
}

export function buildContexts(project: ProjectRead): EntryContext[] {
    const plans = new Map(project.plans.filter((plan) => plan.variant === 'sibling').map((plan) => [plan.key, plan]));
    return project.specs.map((entry) => {
        const siblingPlan = plans.get(siblingPlanKey(entry.key));
        const own = new Set([entry.key, ...entry.planKeys, ...entry.returnNoteKeys]);
        return {
            entry,
            status: headerValue(entry.parsed?.status),
            specReadable: entry.readable && entry.parsed !== undefined,
            siblingPlan,
            siblingPlanReadable: siblingPlan !== undefined && siblingPlan.readable && siblingPlan.parsed !== undefined,
            planStatus: headerValue(siblingPlan?.parsed?.status),
            blocked: false,
            diagnostics: project.diagnostics.filter((diagnostic) => diagnostic.scope !== 'project' && own.has(diagnostic.scope.file)),
            contradictions: [],
        };
    });
}
