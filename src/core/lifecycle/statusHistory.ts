import type { ClockPort } from '../ports/host';
import type { JsonValue, ReadResult, SpecStatusRecord, StoreState } from '../runtime/model';
import type { ProjectRead } from '../specs/readProject';
import { changedPaths } from './changedPaths';
import { classifyFlow } from './flow';
import type { FlowMarker } from './flow';
import type { LifecycleModel, LifecycleState, RuleId } from './model';

export const HISTORY_LABEL = 'Observed by Studio while it was running — not a reconstruction';

export interface StatusHistoryStore {
    state(): StoreState;
    appendSpecStatusEntry(stem: string, entry: JsonValue): Promise<void>;
    readSpecStatusHistory(stem?: string): Promise<ReadResult<SpecStatusRecord[]>>;
}

export type HistoryCause =
    | { kind: 'files'; paths: string[] }
    | { kind: 'first-observed' }
    | { kind: 'changed-while-not-running' }
    | { kind: 'no-longer-observed' };

export interface StatusHistoryEntry {
    observedAt: string;
    stem: string;
    old: LifecycleState | null;
    new: LifecycleState | null;
    rule: RuleId | null;
    cause: HistoryCause;
    flow: FlowMarker;
}

export type HistoryView =
    | { available: true; label: string; entries: StatusHistoryEntry[] }
    | { available: false; text: string };

export interface StatusHistory {
    readonly label: string;
    observe(previous: ProjectRead | undefined, current: ProjectRead, model: LifecycleModel): Promise<void>;
    read(): Promise<HistoryView>;
}

export interface StatusHistoryDeps {
    store: StatusHistoryStore;
    clock: ClockPort;
}

function isHistoryEntry(value: unknown): value is StatusHistoryEntry {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const entry = value as Record<string, unknown>;
    const cause = entry.cause as { kind?: unknown } | null | undefined;
    return (
        typeof entry.observedAt === 'string' &&
        typeof entry.stem === 'string' &&
        'old' in entry &&
        'new' in entry &&
        typeof cause === 'object' &&
        cause !== null &&
        typeof cause.kind === 'string' &&
        typeof entry.flow === 'string'
    );
}

export function createStatusHistory(deps: StatusHistoryDeps): StatusHistory {
    const { store, clock } = deps;
    const last = new Map<string, LifecycleState>();
    let baselined = false;

    function singleStates(model: LifecycleModel): Map<string, { state: LifecycleState; rule: RuleId }> {
        const counts = new Map<string, number>();
        model.entries.forEach((entry) => counts.set(entry.stem, (counts.get(entry.stem) ?? 0) + 1));
        return new Map(
            model.entries.filter((entry) => counts.get(entry.stem) === 1).map((entry) => [entry.stem, { state: entry.state, rule: entry.rule }]),
        );
    }

    return {
        label: HISTORY_LABEL,
        async observe(previous, current, model) {
            const states = singleStates(model);
            if (!baselined) {
                baselined = true;
                states.forEach((verdict, stem) => last.set(stem, verdict.state));
                return;
            }
            const pending: StatusHistoryEntry[] = [];
            for (const stem of [...states.keys()].sort()) {
                const verdict = states.get(stem);
                const old = last.get(stem);
                if (verdict !== undefined && old !== undefined && old !== verdict.state) {
                    pending.push({
                        observedAt: clock.now(),
                        stem,
                        old,
                        new: verdict.state,
                        rule: verdict.rule,
                        cause: { kind: 'files', paths: changedPaths(stem, previous, current) },
                        flow: classifyFlow(old, verdict.state),
                    });
                }
                if (verdict !== undefined) {
                    last.set(stem, verdict.state);
                }
            }
            for (const entry of pending) {
                await store.appendSpecStatusEntry(entry.stem, entry as unknown as JsonValue);
            }
        },
        async read() {
            const result = await store.readSpecStatusHistory();
            if (!result.available) {
                return { available: false, text: `Status history not available: ${result.reason}` };
            }
            const entries: StatusHistoryEntry[] = [];
            for (const record of result.value) {
                const candidate: unknown = record.entry;
                if (isHistoryEntry(candidate)) {
                    entries.push(candidate);
                }
            }
            return { available: true, label: HISTORY_LABEL, entries };
        },
    };
}
