import { describe, expect, it } from 'vitest';
import { fixtureModel, parallelModel, PARALLEL_NOTE_3, PARALLEL_NOTE_4, PARALLEL_SPEC, dropNotes } from '../planMap/testing/plans';
import type { ShellModel } from '../ports/shell';
import { buildDetail } from './detail';

const NO_HISTORY = { available: true as const, label: '', entries: [] };

function parallelOf(model: ShellModel, key: string): unknown {
    const entry = model.lifecycle.entries.find((candidate) => candidate.key === key)!;
    const view = buildDetail({ selection: { stem: entry.stem, path: key }, model, history: NO_HISTORY });
    if (view.kind !== 'spec' || !('lines' in view.nextStep)) {
        throw new Error('expected next step lines');
    }
    return (view.nextStep as { parallel?: unknown }).parallel;
}

describe('0025 AC-016: the detail knows the current stage can run in parallel', () => {
    it('0025 AC-016: the no-notes variant names its parallel stage', async () => {
        const model = await parallelModel(dropNotes);
        expect(parallelOf(model, PARALLEL_SPEC)).toEqual({ stage: 2 });
    });

    it('0025 AC-016: with both notes there is no hint', async () => {
        const model = await fixtureModel('fs110-parallel-synthetic');
        expect(model.project.returnNotes.length).toBeGreaterThan(0);
        expect(parallelOf(model, PARALLEL_SPEC)).toBeUndefined();
        expect([PARALLEL_NOTE_3, PARALLEL_NOTE_4].length).toBe(2);
    });

    it('0025 AC-016: while a return note lies (U-08) there is no hint either', async () => {
        const model = await fixtureModel('fs-partial-return');
        expect(parallelOf(model, '.specs/active/0001-fixture-demo.md')).toBeUndefined();
    });
});
