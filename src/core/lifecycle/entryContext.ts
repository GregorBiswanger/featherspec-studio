import type { Diagnostic } from '../specs/diagnostics';
import type { PlanEntry, ProjectRead, SpecEntry } from '../specs/readProject';
import type { HeaderField } from '../specs/parseSpec';
import type { ContradictionDiagnostic, ContradictionKind } from './model';

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

const DONE_STATUSES = new Set(['Implemented', 'Baseline', 'Deprecated']);
const EXPECTED_STATUS: Record<'backlog' | 'active', string> = { backlog: 'Draft', active: 'In Progress' };

function contradiction(kind: ContradictionKind, file: string, reason: string): ContradictionDiagnostic {
    return { kind: 'lifecycle-contradiction', contradiction: kind, scope: { file }, reason };
}

function findContradictions(context: Omit<EntryContext, 'contradictions'>): ContradictionDiagnostic[] {
    const { entry, status, siblingPlan } = context;
    const parsed = entry.parsed;
    if (!context.specReadable || parsed === undefined) {
        return [];
    }
    const found: ContradictionDiagnostic[] = [];
    const matches = entry.folder === 'done' ? status !== undefined && DONE_STATUSES.has(status) : status === EXPECTED_STATUS[entry.folder];
    if (!matches) {
        found.push(contradiction('folder-status', entry.key, `Folder ${entry.folder}/ does not match status "${status ?? '(missing)'}".`));
    }
    const classification = parsed.planClassification;
    if (entry.folder === 'active' && siblingPlan === undefined) {
        const archived = classification.kind === 'archive';
        const reactivatedBaseline =
            headerValue(parsed.origin) !== undefined && classification.kind === 'placeholder' && classification.raw === '_none_';
        if (!archived && !reactivatedBaseline) {
            found.push(contradiction('active-without-plan', entry.key, 'active/ spec without a sibling plan.'));
        }
    }
    if (entry.folder === 'done' && status === 'Implemented' && classification.kind !== 'archive' && siblingPlan === undefined) {
        found.push(contradiction('done-without-archive-link', entry.key, 'done/ Implemented spec without an archive link in its Plan line.'));
    }
    return found;
}

export function buildContexts(project: ProjectRead): EntryContext[] {
    const plans = new Map(project.plans.filter((plan) => plan.variant === 'sibling').map((plan) => [plan.key, plan]));
    const notes = new Map(project.returnNotes.map((note) => [note.key, note]));
    return project.specs.map((entry) => {
        const siblingPlan = plans.get(siblingPlanKey(entry.key));
        const own = new Set([entry.key, ...entry.planKeys, ...entry.returnNoteKeys]);
        const planStatus = headerValue(siblingPlan?.parsed?.status);
        const noteBlocks = entry.returnNoteKeys.some((key) => headerValue(notes.get(key)?.parsed?.status) === 'BLOCKED');
        const base = {
            entry,
            status: headerValue(entry.parsed?.status),
            specReadable: entry.readable && entry.parsed !== undefined,
            siblingPlan,
            siblingPlanReadable: siblingPlan !== undefined && siblingPlan.readable && siblingPlan.parsed !== undefined,
            planStatus,
            blocked: entry.folder !== 'done' && (planStatus === 'Blocked' || noteBlocks),
            diagnostics: project.diagnostics.filter((diagnostic) => diagnostic.scope !== 'project' && own.has(diagnostic.scope.file)),
        };
        return { ...base, contradictions: findContradictions(base) };
    });
}
