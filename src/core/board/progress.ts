import type { Progress } from '../../shared/protocol/board';
import type { VerificationStatus } from '../lifecycle/model';
import type { PlanEntry } from '../specs/readProject';

export function taskProgress(plan: PlanEntry | undefined): Progress | undefined {
    const steps = (plan?.parsed?.steps ?? []).filter((step) => !step.struck);
    return steps.length === 0 ? undefined : { done: steps.filter((step) => step.ticked === true).length, total: steps.length };
}

export function criteriaProgress(verification: VerificationStatus): Progress | undefined {
    if (verification.summary === 'not available') {
        return undefined;
    }
    const { open, built, verified, other } = verification.counts;
    return { done: verified, total: open + built + verified + other };
}
