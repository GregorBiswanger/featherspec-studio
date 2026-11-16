import { describe, expect, it } from 'vitest';
import type { RunsRead } from './runSource';
import { projectRuns } from './runFigures';
import { createSpecResolver } from './specRefs';
import { modelFor, type SpecInput } from './testing/projects';
import { makeRun } from './testing/runs';

const SPECS: SpecInput[] = [
    { number: '0001', kind: 'Active', title: 'Alpha' },
    { number: '0002', kind: 'Done', title: 'Beta' },
    { number: '0003', kind: 'Backlog', title: null },
];

async function facts(runs: Parameters<typeof makeRun>[0][], specs: SpecInput[] = SPECS, read?: RunsRead) {
    const model = await modelFor(specs);
    const resolver = createSpecResolver(model);
    return projectRuns(read ?? { available: true, runs: runs.map(makeRun) }, model, (stem) => resolver.forStem(stem));
}

function view(result: Awaited<ReturnType<typeof facts>>) {
    if (!result.view.available) {
        throw new Error('expected available runs');
    }
    return result.view;
}

describe('Running figure', () => {
    it('AC-005: WaitingForInput, Interrupted and Completed give Running 1, with that run as the single run', async () => {
        const result = view(
            await facts([
                { id: 'r1', stem: '0001-thing', status: 'WaitingForInput' },
                { id: 'r2', stem: '0001-thing', status: 'Interrupted', created: '2026-11-16T09:00:00.000Z' },
                { id: 'r3', stem: '0001-thing', status: 'Completed', created: '2026-11-16T08:00:00.000Z' },
            ]),
        );
        expect(result.running).toBe(1);
        expect(result.singleRunId).toBe('r1');
    });

    it('AC-005: all four open statuses count, a run of a stem with no spec counts too (PD-046), and two runs have no single run', async () => {
        const result = view(
            await facts([
                { id: 'a', stem: '0001-thing', status: 'Starting' },
                { id: 'b', stem: '0001-thing', status: 'Running' },
                { id: 'c', stem: '0001-thing', status: 'WaitingForApproval' },
                { id: 'd', stem: '0099-vanished', status: 'WaitingForInput' },
            ]),
        );
        expect(result.running).toBe(4);
        expect(result.singleRunId).toBeUndefined();
    });

    it('AC-005 negative control: end statuses never count, and no runs give Running 0 with no highlighted run', async () => {
        const none = view(await facts([]));
        expect(none).toMatchObject({ running: 0, highlighted: [], unreadable: 0 });
        expect(none.singleRunId).toBeUndefined();
        const ended = view(await facts([{ id: 'a', stem: '0001-thing', status: 'Cancelled' }]));
        expect(ended.running).toBe(0);
    });
});

describe('highlighted runs', () => {
    it('AC-007: a Failed or Interrupted latest run is listed with number, title and status; a Cancelled one never', async () => {
        const result = await facts([
            { id: 'f', stem: '0001-thing', status: 'Failed' },
            { id: 'i', stem: '0003-thing', status: 'Interrupted', created: '2026-11-16T09:00:00.000Z' },
            { id: 'c', stem: '0001-thing', status: 'Cancelled', created: '2026-11-15T10:00:00.000Z' },
        ]);
        expect(view(result).highlighted.map((entry) => [entry.runId, entry.status, entry.spec.number, entry.spec.title])).toEqual([
            ['f', 'Failed', '0001', 'Alpha'],
            ['i', 'Interrupted', '0003', null],
        ]);
        const cancelled = await facts([{ id: 'c', stem: '0001-thing', status: 'Cancelled' }]);
        expect(view(cancelled).highlighted).toEqual([]);
    });

    it('AC-007: a newer run of the same stem ends the highlight', async () => {
        const result = await facts([
            { id: 'old', stem: '0001-thing', status: 'Failed', created: '2026-11-16T09:00:00.000Z' },
            { id: 'new', stem: '0001-thing', status: 'Completed', created: '2026-11-16T10:00:00.000Z' },
        ]);
        expect(view(result).highlighted).toEqual([]);
    });

    it('AC-007: a Done spec is not highlighted (BR-06)', async () => {
        const result = await facts([{ id: 'f', stem: '0002-thing', status: 'Failed' }]);
        expect(view(result).highlighted).toEqual([]);
    });

    it('AC-007: a run that is removed from the store is gone (the read no longer holds it)', async () => {
        const before = await facts([{ id: 'f', stem: '0001-thing', status: 'Failed' }]);
        const after = await facts([]);
        expect(view(before).highlighted).toHaveLength(1);
        expect(view(after).highlighted).toEqual([]);
    });

    it('AC-007: a run whose stem matches no spec is listed with its recorded stem and found false (PD-046)', async () => {
        const result = await facts([{ id: 'f', stem: '0099-vanished', status: 'Interrupted' }]);
        expect(view(result).highlighted).toEqual([{ runId: 'f', status: 'Interrupted', spec: { stem: '0099-vanished', number: '0099', title: null, found: false } }]);
    });

    it('OP-10: highlighted runs are ordered by the newest status first, ties by the higher run ID', async () => {
        const result = await facts([
            { id: 'a', stem: '0001-thing', status: 'Failed', created: '2026-11-16T07:00:00.000Z', history: [{ status: 'Failed', at: '2026-11-16T07:30:00.000Z' }] },
            { id: 'b', stem: '0003-thing', status: 'Interrupted', created: '2026-11-16T06:00:00.000Z', history: [{ status: 'Interrupted', at: '2026-11-16T09:00:00.000Z' }] },
            { id: 'c', stem: '0099-gone', status: 'Failed', created: '2026-11-16T05:00:00.000Z', history: [{ status: 'Failed', at: '2026-11-16T07:30:00.000Z' }] },
        ]);
        expect(view(result).highlighted.map((entry) => entry.runId)).toEqual(['b', 'c', 'a']);
    });

    it('A-009: two runs with the same created time — the higher run ID is the latest', async () => {
        const result = await facts([
            { id: 'run-1', stem: '0001-thing', status: 'Failed', created: '2026-11-16T09:00:00.000Z' },
            { id: 'run-2', stem: '0001-thing', status: 'Completed', created: '2026-11-16T09:00:00.000Z' },
        ]);
        expect(view(result).highlighted).toEqual([]);
        const flipped = await facts([
            { id: 'run-1', stem: '0001-thing', status: 'Completed', created: '2026-11-16T09:00:00.000Z' },
            { id: 'run-2', stem: '0001-thing', status: 'Failed', created: '2026-11-16T09:00:00.000Z' },
        ]);
        expect(view(flipped).highlighted.map((entry) => entry.runId)).toEqual(['run-2']);
    });

    it('A-008: with a duplicated stem the highlight holds while one entry with that stem is not Done', async () => {
        const model = await modelFor([{ number: '0001', kind: 'Active' }], {
            '.specs/done/0001-thing.md': '# Dup\n\n**Status:** Implemented\n**Plan:** _none_\n',
        });
        const resolver = createSpecResolver(model);
        const result = projectRuns({ available: true, runs: [makeRun({ id: 'f', stem: '0001-thing', status: 'Failed' })] }, model, (stem) => resolver.forStem(stem));
        expect(result.view).toMatchObject({ available: true, highlighted: [{ runId: 'f' }] });
        expect(result.highlightedByStem.has('0001-thing')).toBe(true);
    });
});

describe('unreadable runs and unavailable runs', () => {
    it('AC-027: a run with unreadable history is not counted, is never the latest run, and is counted as unreadable', async () => {
        const result = await facts([
            { id: 'ok', stem: '0001-thing', status: 'Running' },
            { id: 'bad', stem: '0001-thing', status: 'Starting', unreadable: true, created: '2026-11-17T10:00:00.000Z' },
        ]);
        expect(view(result)).toMatchObject({ running: 1, singleRunId: 'ok', unreadable: 1 });
        const shadow = await facts([
            { id: 'failed', stem: '0001-thing', status: 'Failed', created: '2026-11-16T09:00:00.000Z' },
            { id: 'bad', stem: '0001-thing', status: 'Starting', unreadable: true, created: '2026-11-16T10:00:00.000Z' },
        ]);
        expect(view(shadow).highlighted.map((entry) => entry.runId)).toEqual(['failed']);
    });

    it('AC-018: unavailable runs give the reason and no figure, no highlighted run and no waiting stem', async () => {
        const result = await facts([], SPECS, { available: false, reason: 'disk is full' });
        expect(result.view).toEqual({ available: false, reason: 'disk is full' });
        expect(result.highlightedByStem.size).toBe(0);
        expect(result.waitingStems.size).toBe(0);
    });

    it('AC-026: no run error message, result or prompt reaches the projected figures', async () => {
        const result = await facts([
            { id: 'f', stem: '0001-thing', status: 'Failed', errorMessage: 'SECRET-1' },
            { id: 'w', stem: '0003-thing', status: 'WaitingForInput' },
        ]);
        const text = JSON.stringify(result.view);
        expect(text).not.toContain('SECRET');
        expect(text).not.toContain('prompt');
        expect(text).toContain('"runId":"f"');
    });
});
