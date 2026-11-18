import { DERIVED_SENTENCES, HISTORY_GONE_TEXT, HISTORY_WHILE_CLOSED_TEXT } from '../../../shared/protocol/texts';
import type { ActivityChange, AttentionReason, SpecRef } from '../../../shared/protocol/overview';
import type { DerivedRule } from '../../../shared/protocol/board';

export const MC_NOT_AVAILABLE = 'not available';

export const MC_SPECS_HEADING = 'Specs';

export const NOW_HEADING = 'Now';

export const UP_NEXT_HEADING = 'Up next';

export const NOTHING_IN_PROGRESS_TEXT = 'Nothing in progress.';

export const NOTHING_UP_NEXT_TEXT = 'Nothing up next. Start the next spec with /sdd-specify';

export function moreText(count: number): string {
    return `+ ${count} more`;
}

export const MC_FORMULA = 'Done specs with status Implemented or Baseline ÷ (all specs − Deprecated), rounded down';

export const MC_PROGRESS_UNAVAILABLE = 'Progress: not available';

export const MC_DISTRIBUTION_LABEL = 'Specs by state';

export function mcSegment(state: string, count: number, total: number): string {
    return `${state}: ${count} of ${total}`;
}

export function mcProblems(count: number): string {
    return count === 1 ? '1 problem' : `${count} problems`;
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

export const MC_WHILE_CLOSED = HISTORY_WHILE_CLOSED_TEXT;

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
            return `${change.old} → ${HISTORY_GONE_TEXT}`;
    }
}
