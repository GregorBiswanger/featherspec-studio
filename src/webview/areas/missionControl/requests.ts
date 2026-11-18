import type { BoardState } from '../../../shared/protocol/boardFilter';
import type { NavigationRequest } from '../../../shared/protocol/messages';
import type { ActivityEntry, AttentionRow, McHeader } from '../../../shared/protocol/missionControl';

export const ATTENTION_SET_LABEL = 'Needs attention';
export const PROBLEMS_SET_LABEL = 'Problems';

function namedSet(label: string, stems: readonly string[]): NavigationRequest {
    return { area: 'board', target: { kind: 'boardFilter', filter: { set: { label, stems: [...stems] } } } };
}

export function totalRequest(): NavigationRequest {
    return { area: 'board' };
}

export function stateRequest(state: BoardState): NavigationRequest {
    return { area: 'board', target: { kind: 'boardFilter', filter: { states: [state] } } };
}

export function attentionRequest(rows: readonly AttentionRow[]): NavigationRequest {
    return namedSet(ATTENTION_SET_LABEL, [...new Set(rows.map((row) => row.spec.stem))]);
}

export function problemsRequest(header: McHeader): NavigationRequest {
    return header.problemStems.length === 0 ? totalRequest() : namedSet(PROBLEMS_SET_LABEL, header.problemStems);
}

export function attentionRowRequest(row: AttentionRow): NavigationRequest {
    const { stem, path } = row.spec;
    return { area: 'specExplorer', target: path === undefined ? { kind: 'spec', stem } : { kind: 'spec', stem, path } };
}

export function activityRequest(entry: ActivityEntry): NavigationRequest | undefined {
    return entry.spec.found ? { area: 'specExplorer', target: { kind: 'spec', stem: entry.spec.stem } } : undefined;
}
