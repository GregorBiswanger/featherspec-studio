import type { AttentionReason, AttentionRow, McAttention } from '../../shared/protocol/missionControl';
import type { LifecycleEntry } from '../lifecycle/model';
import type { ShellModel } from '../ports/shell';
import type { RunFacts } from './runFigures';
import type { SpecResolver } from './specRefs';

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function carriesDiagnostic(entry: LifecycleEntry): boolean {
    return entry.diagnostics.some(
        (diagnostic) =>
            diagnostic.kind === 'lifecycle-contradiction' ||
            (diagnostic.kind === 'unreadable-file' && diagnostic.scope !== 'project' && diagnostic.scope.file === entry.key),
    );
}

function reasonsOf(entry: LifecycleEntry, facts: RunFacts): AttentionReason[] {
    const reasons: AttentionReason[] = [];
    if (entry.state === 'Blocked') {
        reasons.push('Blocked');
    }
    const highlighted = entry.state === 'Done' ? undefined : facts.highlightedByStem.get(entry.stem);
    if (highlighted !== undefined) {
        reasons.push(highlighted.status === 'Failed' ? 'Run failed' : 'Run interrupted');
    }
    if (facts.waitingStems.has(entry.stem)) {
        reasons.push('Waiting for you');
    }
    if (carriesDiagnostic(entry)) {
        reasons.push('Diagnostic');
    }
    if (entry.state === 'Review') {
        reasons.push('Review pending');
    }
    return reasons;
}

export function projectAttention(model: ShellModel, facts: RunFacts, specs: SpecResolver): McAttention {
    const rows: AttentionRow[] = [...model.lifecycle.entries]
        .sort((left, right) => compareText(left.number, right.number) || compareText(left.key, right.key))
        .map((entry) => ({ spec: specs.forEntry(entry), reasons: reasonsOf(entry, facts) }))
        .filter((row) => row.reasons.length > 0);
    return { rows, runReasons: facts.view.available ? { available: true } : { available: false, reason: facts.view.reason } };
}
