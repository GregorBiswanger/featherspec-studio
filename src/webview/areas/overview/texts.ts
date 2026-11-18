import { HISTORY_GONE_TEXT, HISTORY_WHILE_CLOSED_TEXT } from '../../../shared/protocol/texts';
import type { ActivityChange, SpecRef } from '../../../shared/protocol/overview';

export const NOT_AVAILABLE_TEXT = 'not available';

export const NOW_HEADING = 'Now';

export const UP_NEXT_HEADING = 'Up next';

export const NOTHING_IN_PROGRESS_TEXT = 'Nothing in progress.';

export const NOTHING_UP_NEXT_TEXT = 'Nothing up next. Start the next spec with /sdd-specify';

export function moreText(count: number): string {
    return `+ ${count} more`;
}

export function problemsHeading(count: number): string {
    return `Problems (${count})`;
}

export function problemLineText(where: string, reason: string): string {
    return `${where}: ${reason}`;
}

export function totalText(count: number): string {
    return `Total ${count}`;
}

export function stateFigureText(state: string, count: number): string {
    return `${state} ${count}`;
}

export function deprecatedText(count: number): string {
    return `of which Deprecated: ${count}`;
}

export const FORMULA_TEXT = 'Done specs with status Implemented or Baseline ÷ (all specs − Deprecated), rounded down';

export const PROGRESS_UNAVAILABLE_TEXT = 'Progress: not available';

export function progressText(percent: number, done: number, divisor: number): string {
    return `Progress ${percent} % (${done} of ${divisor}): ${FORMULA_TEXT}`;
}

export const FIGURES_LABEL = 'Figures';

export const ACTIVITY_HEADING = 'Activity';

export function activityHeading(count: number): string {
    return `Activity (${count})`;
}

export function activityUnavailableText(reason: string): string {
    return `Activity not available: ${reason}`;
}

export const SPEC_NOT_FOUND_TEXT = 'spec not found';

export function specLabelText(spec: SpecRef): string {
    return spec.found ? `${spec.number} ${spec.title ?? NOT_AVAILABLE_TEXT}` : `${spec.stem} — ${SPEC_NOT_FOUND_TEXT}`;
}

export function changeText(change: ActivityChange): string {
    switch (change.kind) {
        case 'state':
            return `${change.old} → ${change.new}${change.whileClosed ? ` ${HISTORY_WHILE_CLOSED_TEXT}` : ''}`;
        case 'gone':
            return `${change.old} → ${HISTORY_GONE_TEXT}`;
    }
}
