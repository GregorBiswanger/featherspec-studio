import { BOARD_STATES } from '../../shared/protocol/boardFilter';
import type { DerivedRule, McHeader, McProgress, McSpecs, StateCount } from '../../shared/protocol/missionControl';
import { buildBanner } from '../board/cards';
import { headerValue } from '../lifecycle/entryContext';
import type { ShellModel } from '../ports/shell';

const DERIVED_RULES: Partial<Record<(typeof BOARD_STATES)[number], DerivedRule>> = {
    Ready: 'S-READY',
    Review: 'S-REVIEW',
    Blocked: 'S-BLOCKED',
};

const FINISHED_STATUSES = new Set(['Implemented', 'Baseline']);

export function projectSpecFigures(model: ShellModel): McSpecs {
    const { entries } = model.lifecycle;
    if (entries.length === 0) {
        return { kind: 'empty' };
    }
    const statusOf = new Map(model.project.specs.map((spec) => [spec.key, headerValue(spec.parsed?.status)]));
    const deprecated = entries.filter((entry) => entry.deprecated !== undefined).length;
    const states: StateCount[] = BOARD_STATES.map((state) => {
        const count: StateCount = { state, count: entries.filter((entry) => entry.state === state).length };
        const rule = DERIVED_RULES[state];
        if (rule !== undefined) {
            count.derivedRule = rule;
        }
        if (state === 'Done') {
            count.deprecated = deprecated;
        }
        return count;
    });
    const done = entries.filter((entry) => entry.state === 'Done' && entry.deprecated === undefined && FINISHED_STATUSES.has(statusOf.get(entry.key) ?? '')).length;
    const divisor = entries.length - deprecated;
    const progress: McProgress = divisor === 0 ? { kind: 'not available' } : { kind: 'value', percent: Math.floor((100 * done) / divisor), done, divisor };
    return { kind: 'counts', total: entries.length, states, progress };
}

export function projectHeader(active: { name: string; version: string }, model: ShellModel, updatedAt: string): McHeader {
    const stems = model.lifecycle.entries.filter((entry) => entry.diagnostics.length > 0).map((entry) => entry.stem);
    return {
        name: active.name,
        version: active.version,
        updatedAt,
        projectDiagnostics: buildBanner(model.project, model.lifecycle).length,
        diagnosticStems: [...new Set(stems)].sort(),
    };
}
