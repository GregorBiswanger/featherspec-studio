import type { EntryContext } from './entryContext';
import type { ReadinessCheck, ReadinessId, ReadinessResult } from './model';

export const READINESS_REASONS: Record<ReadinessId, string> = {
    'R-1': 'Not in backlog/ with status Draft.',
    'R-2': 'No acceptance criterion (AC-NNN) found.',
    'R-3': 'No sibling plan, or the Plan line does not link it.',
    'R-4': 'The sibling plan is missing or not "Not started".',
    'R-5': 'The spec is Blocked.',
    'R-6': 'A lifecycle contradiction, unreadable file or duplicate is reported.',
    'R-7': 'Inter-spec dependencies: not available — FeatherSpec has no dependency field.',
};

function check(id: ReadinessId, passes: boolean): ReadinessCheck {
    return passes ? { id, result: 'pass' } : { id, result: 'fail', reason: READINESS_REASONS[id] };
}

function linksSiblingPlan(context: EntryContext): boolean {
    const classification = context.entry.parsed?.planClassification;
    if (context.siblingPlan === undefined || classification?.kind !== 'sibling') {
        return false;
    }
    const expected = context.siblingPlan.key.split('/').pop();
    return classification.target.replace(/^\.\//, '') === expected;
}

function hasProblem(context: EntryContext): boolean {
    return context.contradictions.length > 0 || context.diagnostics.some((diagnostic) => diagnostic.tier === 'problem');
}

export function evaluateReadiness(context: EntryContext): ReadinessResult {
    const checks: ReadinessCheck[] = [
        check('R-1', context.entry.folder === 'backlog' && context.status === 'Draft'),
        check('R-2', (context.entry.parsed?.criteria.length ?? 0) > 0),
        check('R-3', linksSiblingPlan(context)),
        check('R-4', context.planStatus === 'Not started'),
        check('R-5', !context.blocked),
        check('R-6', !hasProblem(context)),
        { id: 'R-7', result: 'not available', reason: READINESS_REASONS['R-7'] },
    ];
    const failing = checks.filter((entry) => entry.result === 'fail').map((entry) => entry.id);
    return { ready: failing.length === 0, checks, failing };
}
