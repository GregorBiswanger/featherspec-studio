import type { HighlightedRun, HighlightedStatus, McRuns, SpecRef } from '../../shared/protocol/missionControl';
import type { ShellModel } from '../ports/shell';
import type { RunStatus, RunView } from '../runtime/model';
import { OPEN_STATUSES } from '../runtime/model';
import type { RunsRead } from './runSource';

export interface RunFacts {
    view: McRuns;
    highlightedByStem: ReadonlyMap<string, HighlightedRun>;
    waitingStems: ReadonlySet<string>;
}

const WAITING: readonly RunStatus[] = ['WaitingForApproval', 'WaitingForInput'];

function isOpen(status: RunStatus): boolean {
    return (OPEN_STATUSES as readonly string[]).includes(status);
}

function isHighlightStatus(status: RunStatus): status is HighlightedStatus {
    return status === 'Failed' || status === 'Interrupted';
}

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function isNewerRun(candidate: RunView, known: RunView): boolean {
    return candidate.created > known.created || (candidate.created === known.created && compareText(candidate.runId, known.runId) > 0);
}

function statusTime(run: RunView): string {
    return run.statusHistory[run.statusHistory.length - 1]?.at ?? run.created;
}

export function projectRuns(read: RunsRead, model: ShellModel, refOf: (stem: string) => SpecRef): RunFacts {
    if (!read.available) {
        return { view: { available: false, reason: read.reason }, highlightedByStem: new Map(), waitingStems: new Set() };
    }
    const readable = read.runs.filter((run) => !run.historyUnreadable);
    const unreadable = read.runs.length - readable.length;
    const open = readable.filter((run) => isOpen(run.status));
    const latest = new Map<string, RunView>();
    for (const run of readable) {
        const known = latest.get(run.spec.stem);
        if (known === undefined || isNewerRun(run, known)) {
            latest.set(run.spec.stem, run);
        }
    }
    const notDone = new Set(model.lifecycle.entries.filter((entry) => entry.state !== 'Done').map((entry) => entry.stem));
    const present = new Set(model.lifecycle.entries.map((entry) => entry.stem));
    const highlighted = [...latest.values()]
        .filter((run) => isHighlightStatus(run.status) && (!present.has(run.spec.stem) || notDone.has(run.spec.stem)))
        .sort((left, right) => compareText(statusTime(right), statusTime(left)) || compareText(right.runId, left.runId));
    const rows: HighlightedRun[] = highlighted.map((run) => ({ runId: run.runId, status: run.status as HighlightedStatus, spec: refOf(run.spec.stem) }));
    const highlightedByStem = new Map(rows.filter((row) => row.spec.found).map((row) => [row.spec.stem, row]));
    const waitingStems = new Set(readable.filter((run) => WAITING.includes(run.status)).map((run) => run.spec.stem));
    const view: McRuns = { available: true, running: open.length, highlighted: rows, unreadable };
    if (open.length === 1 && open[0] !== undefined) {
        view.singleRunId = open[0].runId;
    }
    return { view, highlightedByStem, waitingStems };
}
