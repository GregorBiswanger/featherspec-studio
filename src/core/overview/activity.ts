import type { ActivityEntry, McActivity } from '../../shared/protocol/overview';
import type { HistoryView } from '../lifecycle/statusHistory';
import type { SpecResolver } from './specRefs';
import { historyUnavailableText } from '../lifecycle/historyTexts';

export const ACTIVITY_LIMIT = 10;

const HISTORY_PREFIX = historyUnavailableText('');

interface Ranked {
    entry: ActivityEntry;
    time: number;
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

export function projectActivity(history: HistoryView, specs: SpecResolver, open = false): McActivity {
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
        ranked.push({ entry: { at: item.observedAt, spec, change }, time: timeOf(item.observedAt), id: String(index).padStart(8, '0') });
    });
    ranked.sort(
        (left, right) =>
            right.time - left.time ||
            compareText(left.entry.spec.number, right.entry.spec.number) ||
            compareText(left.id, right.id),
    );
    return { available: true, entries: ranked.slice(0, ACTIVITY_LIMIT).map((item) => item.entry), open };
}
