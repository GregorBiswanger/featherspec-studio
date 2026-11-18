import type { BoardState } from '../../../shared/protocol/boardFilter';
import type { NavigationRequest } from '../../../shared/protocol/messages';
import type { ActivityEntry, OverviewRow, SpecRef } from '../../../shared/protocol/overview';

export const PROBLEMS_SET_LABEL = 'Problems';
export const UP_NEXT_SET_LABEL = 'Up next';

function namedSet(label: string, stems: readonly string[]): NavigationRequest {
    return { area: 'board', target: { kind: 'boardFilter', filter: { set: { label, stems: [...stems] } } } };
}

export function totalRequest(): NavigationRequest {
    return { area: 'board' };
}

export function stateRequest(state: BoardState): NavigationRequest {
    return { area: 'board', target: { kind: 'boardFilter', filter: { states: [state] } } };
}

export function upNextRequest(stems: readonly string[]): NavigationRequest {
    return namedSet(UP_NEXT_SET_LABEL, stems);
}

export function problemsRequest(rows: readonly OverviewRow[]): NavigationRequest {
    return namedSet(PROBLEMS_SET_LABEL, [...new Set(rows.map((row) => row.spec.stem))]);
}

export function rowRequest(row: { spec: SpecRef }): NavigationRequest {
    const { stem, path } = row.spec;
    return { area: 'specExplorer', target: path === undefined ? { kind: 'spec', stem } : { kind: 'spec', stem, path } };
}

export function activityRequest(entry: ActivityEntry): NavigationRequest | undefined {
    return entry.spec.found ? { area: 'specExplorer', target: { kind: 'spec', stem: entry.spec.stem } } : undefined;
}
