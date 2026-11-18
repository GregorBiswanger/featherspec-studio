import { HISTORY_LABEL } from '../../shared/protocol/texts';
import type { ClockPort } from '../ports/host';
import type { JsonValue, ReadResult, SpecStatusRecord, StoreState } from '../runtime/model';
import type { ProjectRead } from '../specs/readProject';
import { changedPaths } from './changedPaths';
import { classifyFlow } from './flow';
import type { FlowMarker } from './flow';
import type { LifecycleModel, LifecycleState, RuleId } from './model';
import { historyUnavailableText } from './historyTexts';

export { HISTORY_LABEL };

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

function message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

interface Verdict {
    state: LifecycleState;
    rule: RuleId;
}

export function createStatusHistory(deps: StatusHistoryDeps): StatusHistory {
    const { store, clock } = deps;
    const last = new Map<string, LifecycleState>();
    let baselined = false;

    function verdicts(model: LifecycleModel): { singles: Map<string, Verdict>; present: Set<string> } {
        const counts = new Map<string, number>();
        model.entries.forEach((entry) => counts.set(entry.stem, (counts.get(entry.stem) ?? 0) + 1));
        const singles = new Map(
            model.entries
                .filter((entry) => counts.get(entry.stem) === 1)
                .map((entry): [string, Verdict] => [entry.stem, { state: entry.state, rule: entry.rule }]),
        );
        return { singles, present: new Set(counts.keys()) };
    }

    async function readStored(): Promise<{ ok: true; recorded: Map<string, LifecycleState>; entries: StatusHistoryEntry[] } | { ok: false; reason: string }> {
        let result;
        try {
            result = await store.readSpecStatusHistory();
        } catch (error) {
            return { ok: false, reason: message(error) };
        }
        if (!result.available) {
            return { ok: false, reason: result.reason };
        }
        const recorded = new Map<string, LifecycleState>();
        const entries: StatusHistoryEntry[] = [];
        for (const record of result.value) {
            const candidate: unknown = record.entry;
            if (isHistoryEntry(candidate)) {
                entries.push(candidate);
                if (candidate.new === null) {
                    recorded.delete(record.stem);
                } else {
                    recorded.set(record.stem, candidate.new);
                }
            }
        }
        return { ok: true, recorded, entries };
    }

    function entryFor(stem: string, old: LifecycleState | null, verdict: Verdict | undefined, cause: HistoryCause, flow: FlowMarker): StatusHistoryEntry {
        return { observedAt: clock.now(), stem, old, new: verdict?.state ?? null, rule: verdict?.rule ?? null, cause, flow };
    }

    async function append(entries: StatusHistoryEntry[]): Promise<void> {
        if (store.state().kind !== 'writable') {
            return;
        }
        for (const entry of entries) {
            try {
                await store.appendSpecStatusEntry(entry.stem, entry as unknown as JsonValue);
            } catch {
                return;
            }
        }
    }

    async function baseline(model: LifecycleModel): Promise<void> {
        const stored = await readStored();
        baselined = true;
        const { singles, present } = verdicts(model);
        if (!stored.ok) {
            singles.forEach((verdict, stem) => last.set(stem, verdict.state));
            return;
        }
        const pending: StatusHistoryEntry[] = [];
        for (const stem of [...new Set([...singles.keys(), ...stored.recorded.keys()])].sort()) {
            const verdict = singles.get(stem);
            const recorded = stored.recorded.get(stem);
            if (verdict !== undefined) {
                last.set(stem, verdict.state);
                if (recorded === undefined) {
                    pending.push(entryFor(stem, null, verdict, { kind: 'first-observed' }, 'not checked'));
                } else if (recorded !== verdict.state) {
                    pending.push(entryFor(stem, recorded, verdict, { kind: 'changed-while-not-running' }, 'not checked'));
                }
            } else if (recorded !== undefined) {
                if (present.has(stem)) {
                    last.set(stem, recorded);
                } else {
                    pending.push(entryFor(stem, recorded, undefined, { kind: 'no-longer-observed' }, 'not checked'));
                }
            }
        }
        await append(pending);
    }

    return {
        label: HISTORY_LABEL,
        async observe(previous, current, model) {
            if (!baselined) {
                await baseline(model);
                return;
            }
            const { singles, present } = verdicts(model);
            const pending: StatusHistoryEntry[] = [];
            for (const stem of [...new Set([...singles.keys(), ...last.keys()])].sort()) {
                const verdict = singles.get(stem);
                const old = last.get(stem);
                if (verdict !== undefined) {
                    if (old === undefined) {
                        pending.push(entryFor(stem, null, verdict, { kind: 'first-observed' }, 'not checked'));
                    } else if (old !== verdict.state) {
                        pending.push(
                            entryFor(stem, old, verdict, { kind: 'files', paths: changedPaths(stem, previous, current) }, classifyFlow(old, verdict.state)),
                        );
                    }
                    last.set(stem, verdict.state);
                } else if (!present.has(stem) && old !== undefined) {
                    pending.push(entryFor(stem, old, undefined, { kind: 'no-longer-observed' }, 'not checked'));
                    last.delete(stem);
                }
            }
            await append(pending);
        },
        async read() {
            const stored = await readStored();
            if (!stored.ok) {
                return { available: false, text: historyUnavailableText(stored.reason) };
            }
            return { available: true, label: HISTORY_LABEL, entries: stored.entries };
        },
    };
}
