import { DERIVED_SENTENCES } from '../../../shared/protocol/texts';
import type { ActivityChange, AttentionReason, DerivedRule, SpecRef } from '../../../shared/protocol/missionControl';

export const MC_NOT_AVAILABLE = 'not available';

export const MC_SPECS_HEADING = 'Specs';

export const MC_ZERO_SPECS = 'No specs yet. Run /sdd-specify to write the first one.';

export const MC_FORMULA = 'Done specs with status Implemented or Baseline ÷ (all specs − Deprecated), rounded down';

export const MC_PROGRESS_UNAVAILABLE = 'Progress: not available';

export const MC_DISTRIBUTION_LABEL = 'Specs by state';

export function mcSegment(state: string, count: number, total: number): string {
    return `${state}: ${count} of ${total}`;
}

export function mcFolder(name: string): string {
    return name;
}

export function mcVersion(version: string): string {
    return `FeatherSpec ${version}`;
}

export function mcUpdated(time: string): string {
    return `Model updated ${time}`;
}

export function mcDiagnostics(project: number, specs: number): string {
    const projectPart = project === 1 ? '1 project-level diagnostic' : `${project} project-level diagnostics`;
    const specPart = specs === 1 ? '1 spec with diagnostics' : `${specs} specs with diagnostics`;
    return `${projectPart} · ${specPart}`;
}

export function mcTotal(count: number): string {
    return `Total ${count}`;
}

export function mcDerived(rule: DerivedRule): string {
    return DERIVED_SENTENCES[rule];
}

export function mcDeprecated(count: number): string {
    return `of which Deprecated: ${count}`;
}

export function mcProgress(percent: number, done: number, divisor: number): string {
    return `Progress ${percent} % (${done} of ${divisor})`;
}

export function mcAttentionHeading(count: number): string {
    return `Needs attention (${count})`;
}

export const MC_NOTHING_ATTENTION = 'Nothing needs attention.';

export const MC_ACTIVITY_HEADING = 'Recent activity';

export const MC_NO_ACTIVITY = 'No recent activity.';

export function mcActivityUnavailable(reason: string): string {
    return `Recent activity not available: ${reason}`;
}

export const MC_SPEC_NOT_FOUND = 'spec not found';

export const MC_WHILE_CLOSED = '(changed while Studio was not running)';

export const MC_NO_LONGER_OBSERVED = 'no longer observed';

export function mcReason(reason: AttentionReason): string {
    return reason;
}

export function mcSpecLabel(spec: SpecRef): string {
    return spec.found ? `${spec.number} ${spec.title ?? MC_NOT_AVAILABLE}` : `${spec.stem} — ${MC_SPEC_NOT_FOUND}`;
}

export function mcChange(change: ActivityChange): string {
    switch (change.kind) {
        case 'state':
            return `${change.old} → ${change.new}${change.whileClosed ? ` ${MC_WHILE_CLOSED}` : ''}`;
        case 'gone':
            return `${change.old} → ${MC_NO_LONGER_OBSERVED}`;
    }
}
