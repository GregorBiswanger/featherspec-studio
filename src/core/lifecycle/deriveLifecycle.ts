import type { ProjectRead } from '../specs/readProject';
import { buildContexts } from './entryContext';
import type { EntryContext } from './entryContext';
import type { LifecycleEntry, LifecycleModel, LifecycleState, Persistence, ReadinessResult, RuleId } from './model';
import { evaluateReadiness } from './readiness';
import { readSuccessor } from './successor';
import { readVerification } from './verification';

interface Verdict {
    state: LifecycleState;
    rule: RuleId;
    persistence: Persistence;
}

function decide(context: EntryContext, readiness: ReadinessResult): Verdict {
    const { folder } = context.entry;
    if (folder === 'done') {
        return { state: 'Done', rule: 'S-DONE', persistence: 'persisted' };
    }
    if (context.blocked) {
        return { state: 'Blocked', rule: 'S-BLOCKED', persistence: 'derived' };
    }
    if (context.contradictions.length > 0 || !context.specReadable) {
        return { state: folder === 'active' ? 'Active' : 'Backlog', rule: 'S-FOLDER', persistence: 'persisted' };
    }
    if (folder === 'active' && context.status === 'In Progress' && context.planStatus === 'Done') {
        return { state: 'Review', rule: 'S-REVIEW', persistence: 'derived' };
    }
    if (folder === 'active') {
        return { state: 'Active', rule: 'S-ACTIVE', persistence: 'persisted' };
    }
    if (readiness.ready) {
        return { state: 'Ready', rule: 'S-READY', persistence: 'derived' };
    }
    return { state: 'Backlog', rule: 'S-BACKLOG', persistence: 'persisted' };
}

function derivedLabel(verdict: Verdict): string | undefined {
    return verdict.persistence === 'derived' ? `Derived (rule ${verdict.rule})` : undefined;
}

export function deriveLifecycle(project: ProjectRead): LifecycleModel {
    const entries: LifecycleEntry[] = buildContexts(project).map((context) => {
        const readiness = evaluateReadiness(context);
        const verdict = decide(context, readiness);
        return {
            key: context.entry.key,
            stem: context.entry.reference,
            number: context.entry.number,
            folder: context.entry.folder,
            ...verdict,
            derivedLabel: derivedLabel(verdict),
            readiness,
            verification: readVerification(context.entry, context.siblingPlan, project.plans),
            diagnostics: [...context.diagnostics, ...context.contradictions],
            deprecated:
                context.entry.folder === 'done' && context.status === 'Deprecated' && context.entry.parsed !== undefined
                    ? { successor: readSuccessor(context.entry.parsed) }
                    : undefined,
        };
    });
    return { entries, projectDiagnostics: project.diagnostics.filter((diagnostic) => diagnostic.scope === 'project') };
}
