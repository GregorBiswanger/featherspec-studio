import { describe, expect, it } from 'vitest';
import { run } from '../board/testing/boardWorld';
import { modelFor } from '../missionControl/testing/projects';
import { applyTarget, filterLabel, parseMemory, reconcileSelection, serializeMemory, visibleRuns, type Selection } from './selection';

const runs = [run('R1', '0007-board'), run('R2', '0007-board'), run('R3', '0003-lifecycle')];
const none: Selection = { runId: undefined, stem: undefined };

describe('AC-002: a run target', () => {
    it('clears the filter and selects that run', () => {
        const applied = applyTarget({ runId: 'R3', stem: '0003-lifecycle' }, { kind: 'run', id: 'R1' }, runs);
        expect(applied).toEqual({ selection: { runId: 'R1', stem: undefined }, notice: undefined });
    });

    it('a run the store does not hold gives the notice and selects nothing; the filter is cleared', () => {
        const applied = applyTarget({ runId: 'R3', stem: '0003-lifecycle' }, { kind: 'run', id: 'gone-9' }, runs);
        expect(applied).toEqual({ selection: { runId: undefined, stem: undefined }, notice: 'Run gone-9 is not in the run history' });
    });

    it('the selected run leaving the store gives the same notice and no selection; the filter stays', () => {
        const applied = reconcileSelection({ runId: 'R9', stem: '0007-board' }, runs);
        expect(applied).toEqual({ selection: { runId: undefined, stem: '0007-board' }, notice: 'Run R9 is not in the run history' });
        expect(reconcileSelection({ runId: 'R1', stem: undefined }, runs)).toEqual({ selection: { runId: 'R1', stem: undefined }, notice: undefined });
        expect(reconcileSelection(none, runs)).toEqual({ selection: none, notice: undefined });
    });
});

describe('AC-003: a spec target and the filter', () => {
    it('Given runs R1, R2 of 0007-board and R3 of 0003-lifecycle, a spec target 0007-board lists only R1 and R2 under the label 0007', async () => {
        const applied = applyTarget(none, { kind: 'spec', stem: '0007-board' }, runs);
        expect(applied.selection.stem).toBe('0007-board');
        expect(visibleRuns(runs, applied.selection.stem).map((entry) => entry.runId)).toEqual(['R1', 'R2']);
        const model = await modelFor([{ number: '0007', slug: 'board', kind: 'Active' }]);
        expect(filterLabel('0007-board', model)).toBe('0007');
        expect(visibleRuns(runs, undefined)).toHaveLength(3);
    });

    it('the label of a stem without a spec is the stem; without a model it is the number part', async () => {
        const model = await modelFor([{ number: '0007', slug: 'board', kind: 'Active' }]);
        expect(filterLabel('0099-gone', model)).toBe('0099-gone');
        expect(filterLabel('0007-board', undefined)).toBe('0007');
    });

    it('a new spec target replaces the filter; the run it hides is deselected, a run it shows stays selected', () => {
        const hidden = applyTarget({ runId: 'R3', stem: '0003-lifecycle' }, { kind: 'spec', stem: '0007-board' }, runs);
        expect(hidden.selection).toEqual({ runId: undefined, stem: '0007-board' });
        const shown = applyTarget({ runId: 'R1', stem: undefined }, { kind: 'spec', stem: '0007-board' }, runs);
        expect(shown.selection).toEqual({ runId: 'R1', stem: '0007-board' });
        expect(shown.notice).toBeUndefined();
    });

    it('a board-filter target changes nothing; so does a missing target', () => {
        const current = { runId: 'R1', stem: '0007-board' };
        expect(applyTarget(current, { kind: 'boardFilter', filter: { states: ['Done'] } }, runs)).toEqual({ selection: current, notice: undefined });
        expect(applyTarget(current, undefined, runs)).toEqual({ selection: current, notice: undefined });
    });
});

describe('BR-02, OP-13: selection and filter are remembered per project root', () => {
    it('round trips one project and keeps the others', () => {
        const first = serializeMemory(undefined, 'C:/a', { runId: 'R1', stem: '0007-board' });
        const both = serializeMemory(first, 'C:/b', { runId: undefined, stem: '0003-x' });
        expect(parseMemory(both, 'C:/a')).toEqual({ runId: 'R1', stem: '0007-board' });
        expect(parseMemory(both, 'C:/b')).toEqual({ runId: undefined, stem: '0003-x' });
        expect(parseMemory(both, 'C:/c')).toEqual(none);
        expect(JSON.parse(JSON.stringify(both))).toEqual({ v: 1, projects: { 'C:/a': { runId: 'R1', stem: '0007-board' }, 'C:/b': { stem: '0003-x' } } });
    });

    it('an empty selection drops the project entry; broken memory reads as empty and is replaced, not extended', () => {
        const stored = serializeMemory(undefined, 'C:/a', { runId: 'R1', stem: undefined });
        expect(serializeMemory(stored, 'C:/a', none)).toEqual({ v: 1, projects: {} });
        for (const broken of [undefined, null, 'x', 3, { v: 2, projects: {} }, { v: 1 }, { v: 1, projects: { 'C:/a': { runId: 5 } } }, { v: 1, projects: { 'C:/a': 'x' } }]) {
            expect(parseMemory(broken, 'C:/a'), JSON.stringify(broken)).toEqual(none);
        }
        expect(serializeMemory('garbage', 'C:/a', { runId: 'R2', stem: undefined })).toEqual({ v: 1, projects: { 'C:/a': { runId: 'R2' } } });
    });
});
