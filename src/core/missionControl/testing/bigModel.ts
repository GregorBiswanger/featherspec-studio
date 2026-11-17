import type { LifecycleState } from '../../lifecycle/model';
import type { HistoryView, StatusHistoryEntry } from '../../lifecycle/statusHistory';
import type { ShellModel } from '../../ports/shell';
import { modelFor, stemOf, type SpecInput, type SpecKind } from './projects';

const KINDS: SpecKind[] = ['Backlog', 'Ready', 'Active', 'Review', 'Done', 'Blocked', 'Deprecated'];
const STATES: LifecycleState[] = ['Backlog', 'Ready', 'Active', 'Review', 'Done', 'Blocked'];

export interface BigModel {
    model: ShellModel;
    history: HistoryView;
}

export async function generateModel(specCount: number, historyEntries: number): Promise<BigModel> {
    const inputs: SpecInput[] = Array.from({ length: specCount }, (_, index) => ({
        number: String(index + 1).padStart(4, '0'),
        kind: KINDS[index % KINDS.length] ?? 'Backlog',
    }));
    const model = await modelFor(inputs);
    const entries: StatusHistoryEntry[] = Array.from({ length: historyEntries }, (_, index) => ({
        observedAt: new Date(Date.UTC(2026, 10, 2, 0, 0, index)).toISOString(),
        stem: stemOf(inputs[index % inputs.length] as SpecInput),
        old: STATES[index % STATES.length] ?? 'Backlog',
        new: STATES[(index + 1) % STATES.length] ?? 'Backlog',
        rule: null,
        cause: { kind: 'files', paths: [] },
        flow: 'not checked',
    }));
    return { model, history: { available: true, label: 'Observed', entries } };
}
