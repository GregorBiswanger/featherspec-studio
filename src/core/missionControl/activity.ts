import type { ActivityEntry, McActivity } from '../../shared/protocol/missionControl';
import type { HistoryView } from '../lifecycle/statusHistory';
import type { RunsRead } from './runSource';
import type { SpecResolver } from './specRefs';

export const ACTIVITY_LIMIT = 10;

const HISTORY_PREFIX = 'Status history not available: ';

interface Ranked {
    entry: ActivityEntry;
    time: number;
    order: number;
    id: string;
}

function timeOf(value: string): number {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
}

function historyReason(text: string): string {
    return text.startsWith(HISTORY_PREFIX) ? text.slice(HISTORY_PREFIX.length) : text;
}

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

export function projectActivity(history: HistoryView, runs: RunsRead, specs: SpecResolver): McActivity {
    if (!runs.available) {
        return { available: false, reason: runs.reason };
    }
    if (!history.available) {
        return { available: false, reason: historyReason(history.text) };
    }
    const ranked: Ranked[] = [];
    history.entries.forEach((item, index) => {
        const kind = item.cause.kind;
        if (kind === 'first-observed' || item.old === null) {
            return;
        }
        const spec = specs.forStem(item.stem);
        const change: ActivityEntry['change'] =
            item.new === null
                ? { kind: 'gone', old: item.old }
                : { kind: 'state', old: item.old, new: item.new, whileClosed: kind === 'changed-while-not-running' };
        if (item.new === null && kind !== 'no-longer-observed') {
            return;
        }
        ranked.push({ entry: { at: item.observedAt, spec, change }, time: timeOf(item.observedAt), order: 0, id: String(index).padStart(8, '0') });
    });
    for (const run of runs.runs) {
        if (run.historyUnreadable) {
            continue;
        }
        run.statusHistory.forEach((item, index) => {
            if (item.status === 'Running') {
                return;
            }
            ranked.push({
                entry: { at: item.at, spec: specs.forStem(run.spec.stem), change: { kind: 'run', status: item.status, runId: run.runId } },
                time: timeOf(item.at),
                order: 1,
                id: `${run.runId}:${String(index).padStart(4, '0')}`,
            });
        });
    }
    ranked.sort(
        (left, right) =>
            right.time - left.time ||
            left.order - right.order ||
            compareText(left.entry.spec.number, right.entry.spec.number) ||
            compareText(left.id, right.id),
    );
    return { available: true, entries: ranked.slice(0, ACTIVITY_LIMIT).map((item) => item.entry) };
}
