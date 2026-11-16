import type { BoardState } from '../../../shared/protocol/boardFilter';
import type { NavigationRequest } from '../../../shared/protocol/messages';
import type { ActivityEntry, AttentionRow, HighlightedRun, McHeader, McRuns } from '../../../shared/protocol/missionControl';

export const ATTENTION_SET_LABEL = 'Needs attention';
export const DIAGNOSTICS_SET_LABEL = 'Diagnostics';

function namedSet(label: string, stems: readonly string[]): NavigationRequest {
    return { area: 'specBoard', target: { kind: 'boardFilter', filter: { set: { label, stems: [...stems] } } } };
}

export function totalRequest(): NavigationRequest {
    return { area: 'specBoard' };
}

export function stateRequest(state: BoardState): NavigationRequest {
    return { area: 'specBoard', target: { kind: 'boardFilter', filter: { states: [state] } } };
}

export function attentionRequest(rows: readonly AttentionRow[]): NavigationRequest {
    return namedSet(ATTENTION_SET_LABEL, [...new Set(rows.map((row) => row.spec.stem))]);
}

export function diagnosticsRequest(header: McHeader): NavigationRequest {
    return namedSet(DIAGNOSTICS_SET_LABEL, header.diagnosticStems);
}

export function attentionRowRequest(row: AttentionRow): NavigationRequest {
    const { stem, path } = row.spec;
    return { area: 'specExplorer', target: path === undefined ? { kind: 'spec', stem } : { kind: 'spec', stem, path } };
}

export function runningRequest(runs: Extract<McRuns, { available: true }>): NavigationRequest {
    return runs.singleRunId === undefined ? { area: 'agentCenter' } : { area: 'agentCenter', target: { kind: 'run', id: runs.singleRunId } };
}

export function runRequest(run: HighlightedRun): NavigationRequest {
    return { area: 'agentCenter', target: { kind: 'run', id: run.runId } };
}

export function activityRequest(entry: ActivityEntry): NavigationRequest | undefined {
    return entry.spec.found ? { area: 'specExplorer', target: { kind: 'spec', stem: entry.spec.stem } } : undefined;
}
