import { findEntry } from './model';
import type { LifecycleModel, LifecycleState, ReadinessId, RuleId } from './model';
import { READINESS_REASONS } from './readiness';

export type Refusal =
    | { kind: 'not-observed' }
    | { kind: 'derived-target'; target: LifecycleState; rule: RuleId }
    | { kind: 'needs-evidence' }
    | { kind: 'not-ready'; failing: ReadinessId[] }
    | { kind: 'lifecycle-move' };

export type TransitionVerdict =
    | { accepted: true; key: string; target: 'Active' }
    | { accepted: false; refusal: Refusal; text: string };

const DERIVED_RULES: Partial<Record<LifecycleState, RuleId>> = { Ready: 'S-READY', Review: 'S-REVIEW', Blocked: 'S-BLOCKED' };

function refuse(refusal: Refusal, text: string): TransitionVerdict {
    return { accepted: false, refusal, text };
}

export function judgeTransition(model: LifecycleModel, key: string, target: LifecycleState): TransitionVerdict {
    const entry = findEntry(model, key);
    if (entry === undefined) {
        return refuse({ kind: 'not-observed' }, 'This spec is no longer in the project.');
    }
    const rule = DERIVED_RULES[target];
    if (rule !== undefined) {
        return refuse({ kind: 'derived-target', target, rule }, `${target} is derived from the files (rule ${rule}); it cannot be set on the board.`);
    }
    if (target === 'Done') {
        return refuse({ kind: 'needs-evidence' }, 'Done needs /sdd-compile evidence and the /sdd-lifecycle move; Studio does not move specs.');
    }
    if (target === 'Active' && entry.state === 'Backlog') {
        const failing = entry.readiness.failing;
        const reasons = failing.map((id) => `${id} ${READINESS_REASONS[id].replace(/\.$/, '')}`).join('; ');
        return refuse({ kind: 'not-ready', failing }, `The spec is not Ready: ${reasons}.`);
    }
    if (target === 'Active' && entry.state === 'Ready') {
        return { accepted: true, key, target: 'Active' };
    }
    return refuse({ kind: 'lifecycle-move' }, 'Studio does not move specs; lifecycle moves belong to /sdd-lifecycle.');
}
