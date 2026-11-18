import type { AttentionReason, AttentionRow, McAttention } from '../../shared/protocol/missionControl';
import type { LifecycleEntry } from '../lifecycle/model';
import type { ShellModel } from '../ports/shell';
import type { SpecResolver } from './specRefs';

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function carriesProblem(entry: LifecycleEntry): boolean {
    return entry.diagnostics.some((diagnostic) => diagnostic.tier === 'problem');
}

function reasonsOf(entry: LifecycleEntry): AttentionReason[] {
    const reasons: AttentionReason[] = [];
    if (entry.state === 'Blocked') {
        reasons.push('Blocked');
    }
    if (carriesProblem(entry)) {
        reasons.push('Problem');
    }
    if (entry.state === 'Review') {
        reasons.push('Review pending');
    }
    return reasons;
}

export function projectAttention(model: ShellModel, specs: SpecResolver): McAttention {
    const rows: AttentionRow[] = [...model.lifecycle.entries]
        .sort((left, right) => compareText(left.number, right.number) || compareText(left.key, right.key))
        .map((entry) => ({ spec: specs.forEntry(entry), reasons: reasonsOf(entry) }))
        .filter((row) => row.reasons.length > 0);
    return { rows };
}
