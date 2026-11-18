import { BOARD_STATES } from '../../shared/protocol/boardFilter';
import { STATE_RULES } from '../../shared/protocol/board';
import type { McHeader, McProgress, McSpecs, StateCount } from '../../shared/protocol/overview';
import { projectFindings } from '../board/cards';
import { headerValue } from '../lifecycle/entryContext';
import type { ShellModel } from '../ports/shell';

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
        const rule = STATE_RULES[state];
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

function problemKey(diagnostic: { scope: 'project' | { file: string; line?: number }; reason: string }): string {
    return diagnostic.scope === 'project' ? `project|${diagnostic.reason}` : `${diagnostic.scope.file}|${diagnostic.scope.line ?? ''}|${diagnostic.reason}`;
}

export function projectHeader(active: { name: string; version: string }, model: ShellModel, updatedAt: string): McHeader {
    const withProblems = model.lifecycle.entries.filter((entry) => entry.diagnostics.some((diagnostic) => diagnostic.tier === 'problem'));
    const counted = new Set<string>();
    for (const entry of withProblems) {
        entry.diagnostics.filter((diagnostic) => diagnostic.tier === 'problem').forEach((diagnostic) => counted.add(problemKey(diagnostic)));
    }
    const project = projectFindings(model.project, model.lifecycle).problems.length;
    return {
        name: active.name,
        version: active.version,
        updatedAt,
        problems: counted.size + project,
        problemStems: [...new Set(withProblems.map((entry) => entry.stem))].sort(),
    };
}
