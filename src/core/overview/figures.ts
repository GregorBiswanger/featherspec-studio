import { BOARD_STATES } from '../../shared/protocol/boardFilter';
import { percentOf } from '../../shared/protocol/percent';
import type { McProgress, OverviewFigures, StateCount } from '../../shared/protocol/overview';
import { headerValue } from '../lifecycle/entryContext';
import type { ShellModel } from '../ports/shell';

const FINISHED_STATUSES = new Set(['Implemented', 'Baseline']);

export function projectFigures(model: ShellModel): OverviewFigures {
    const { entries } = model.lifecycle;
    if (entries.length === 0) {
        return { kind: 'empty' };
    }
    const statusOf = new Map(model.project.specs.map((spec) => [spec.key, headerValue(spec.parsed?.status)]));
    const deprecated = entries.filter((entry) => entry.deprecated !== undefined).length;
    const states: StateCount[] = BOARD_STATES.map((state) => {
        const count: StateCount = { state, count: entries.filter((entry) => entry.state === state).length };
        if (state === 'Done') {
            count.deprecated = deprecated;
        }
        return count;
    });
    const done = entries.filter((entry) => entry.state === 'Done' && entry.deprecated === undefined && FINISHED_STATUSES.has(statusOf.get(entry.key) ?? '')).length;
    const divisor = entries.length - deprecated;
    const progress: McProgress = divisor === 0 ? { kind: 'not available' } : { kind: 'value', percent: percentOf(done, divisor) ?? 0, done, divisor };
    return { kind: 'counts', total: entries.length, states, progress };
}
