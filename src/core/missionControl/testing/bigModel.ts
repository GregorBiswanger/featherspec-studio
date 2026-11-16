import type { LifecycleState } from '../../lifecycle/model';
import type { HistoryView, StatusHistoryEntry } from '../../lifecycle/statusHistory';
import type { ShellModel } from '../../ports/shell';
import type { RunStatus, RunView } from '../../runtime/model';
import { modelFor, stemOf, type SpecInput, type SpecKind } from './projects';
import { makeRun } from './runs';

const KINDS: SpecKind[] = ['Backlog', 'Ready', 'Active', 'Review', 'Done', 'Blocked', 'Deprecated'];
const STATES: LifecycleState[] = ['Backlog', 'Ready', 'Active', 'Review', 'Done', 'Blocked'];
const STATUSES: RunStatus[] = ['Running', 'Failed', 'Completed', 'WaitingForInput', 'Interrupted'];

export interface BigModel {
    model: ShellModel;
    runs: RunView[];
    history: HistoryView;
}

export async function generateModel(specCount: number, runsPerSpec: number, historyEntries: number): Promise<BigModel> {
    const inputs: SpecInput[] = Array.from({ length: specCount }, (_, index) => ({
        number: String(index + 1).padStart(4, '0'),
        kind: KINDS[index % KINDS.length] ?? 'Backlog',
    }));
    const model = await modelFor(inputs);
    const runs: RunView[] = [];
    for (const input of inputs) {
        for (let run = 0; run < runsPerSpec; run += 1) {
            runs.push(
                makeRun({
                    id: `${input.number}-r${run}`,
                    stem: stemOf(input),
                    status: STATUSES[(Number(input.number) + run) % STATUSES.length] ?? 'Running',
                    created: new Date(Date.UTC(2026, 10, 1, 0, 0, run)).toISOString(),
                }),
            );
        }
    }
    const entries: StatusHistoryEntry[] = Array.from({ length: historyEntries }, (_, index) => ({
        observedAt: new Date(Date.UTC(2026, 10, 2, 0, 0, index)).toISOString(),
        stem: stemOf(inputs[index % inputs.length] as SpecInput),
        old: STATES[index % STATES.length] ?? 'Backlog',
        new: STATES[(index + 1) % STATES.length] ?? 'Backlog',
        rule: null,
        cause: { kind: 'files', paths: [] },
        flow: 'not checked',
    }));
    return { model, runs, history: { available: true, label: 'Observed', entries } };
}
