import type { CardRun } from '../../shared/protocol/board';
import type { ReadResult, RunView } from '../runtime/model';

export type RunIndex = { available: false } | { available: true; latest: ReadonlyMap<string, RunView> };

export function indexRuns(result: ReadResult<RunView[]>): RunIndex {
    if (!result.available) {
        return { available: false };
    }
    const latest = new Map<string, RunView>();
    for (const run of result.value) {
        const known = latest.get(run.spec.stem);
        if (known === undefined || run.created > known.created) {
            latest.set(run.spec.stem, run);
        }
    }
    return { available: true, latest };
}

export function cardRun(index: RunIndex, stem: string): CardRun {
    if (!index.available) {
        return { kind: 'unavailable' };
    }
    const run = index.latest.get(stem);
    if (run === undefined) {
        return { kind: 'none' };
    }
    return run.historyUnreadable ? { kind: 'unreadable', provider: run.providerId } : { kind: 'run', provider: run.providerId, status: run.status };
}
