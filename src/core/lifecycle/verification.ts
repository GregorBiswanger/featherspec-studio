import * as path from 'path';
import type { PlanEntry, SpecEntry } from '../specs/readProject';
import type { VerificationCounts, VerificationStatus } from './model';

export const COMPILE_VERDICT_TEXT = '/sdd-compile verdict: not available — FeatherSpec does not persist it.';

export function planInUse(entry: SpecEntry, siblingPlan: PlanEntry | undefined, plans: readonly PlanEntry[]): PlanEntry | undefined {
    if (entry.folder !== 'done') {
        return siblingPlan;
    }
    const classification = entry.parsed?.planClassification;
    if (classification?.kind === 'archive') {
        const key = path.posix.normalize(path.posix.join(path.posix.dirname(entry.key), classification.target));
        return plans.find((plan) => plan.variant === 'archived' && plan.key === key);
    }
    return siblingPlan;
}

export function readVerification(entry: SpecEntry, siblingPlan: PlanEntry | undefined, plans: readonly PlanEntry[]): VerificationStatus {
    const plan = planInUse(entry, siblingPlan, plans);
    const counts: VerificationCounts = { open: 0, built: 0, verified: 0, other: 0 };
    const rows = plan?.parsed?.traceability ?? [];
    for (const row of rows) {
        if (row.state === 'open' || row.state === 'built' || row.state === 'verified') {
            counts[row.state] += 1;
        } else {
            counts.other += 1;
        }
    }
    const summary = rows.length === 0 ? 'not available' : counts.verified === rows.length ? 'all verified' : 'pending';
    return {
        source: rows.length === 0 ? undefined : plan?.key,
        counts,
        summary,
        compileVerdict: 'not available',
        compileVerdictText: COMPILE_VERDICT_TEXT,
    };
}
