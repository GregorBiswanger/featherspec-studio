import { describe, expect, it } from 'vitest';
import type { HistoryCause, HistoryView, StatusHistoryEntry } from '../lifecycle/statusHistory';
import type { LifecycleState } from '../lifecycle/model';
import type { RunsRead } from './runSource';
import { projectActivity } from './activity';
import { createSpecResolver } from './specRefs';
import { modelFor, type SpecInput } from './testing/projects';
import { makeRun, type RunInput } from './testing/runs';

const SPECS: SpecInput[] = [
    { number: '0001', kind: 'Active', title: 'Alpha' },
    { number: '0002', kind: 'Backlog', title: 'Beta' },
];

function entry(stem: string, old: LifecycleState | null, next: LifecycleState | null, at: string, cause: HistoryCause = { kind: 'files', paths: [] }): StatusHistoryEntry {
    return { observedAt: at, stem, old, new: next, rule: null, cause, flow: 'not checked' };
}

function history(entries: StatusHistoryEntry[]): HistoryView {
    return { available: true, label: 'Observed', entries };
}

async function activity(entries: StatusHistoryEntry[] | HistoryView, runs: RunInput[] | RunsRead = [], specs: SpecInput[] = SPECS) {
    const model = await modelFor(specs);
    const resolver = createSpecResolver(model);
    const read: RunsRead = Array.isArray(runs) ? { available: true, runs: runs.map(makeRun) } : runs;
    return projectActivity(Array.isArray(entries) ? history(entries) : entries, read, resolver);
}

function list(result: Awaited<ReturnType<typeof activity>>) {
    if (!result.available) {
        throw new Error('expected activity');
    }
    return result.entries;
}

describe('Recent activity', () => {
    it('AC-010: spec changes carry old and new state, the time and the spec number and title', async () => {
        const result = list(await activity([entry('0001-thing', 'Backlog', 'Ready', '2026-11-16T09:00:00.000Z')]));
        expect(result).toEqual([
            {
                at: '2026-11-16T09:00:00.000Z',
                spec: { stem: '0001-thing', number: '0001', title: 'Alpha', found: true },
                change: { kind: 'state', old: 'Backlog', new: 'Ready', whileClosed: false },
            },
        ]);
    });

    it('AC-010: entries with the cause "first observed" are never shown (negative control: a changed entry beside it is)', async () => {
        const result = list(
            await activity([
                entry('0001-thing', null, 'Backlog', '2026-11-16T09:00:00.000Z', { kind: 'first-observed' }),
                entry('0002-thing', 'Backlog', 'Ready', '2026-11-16T08:00:00.000Z'),
            ]),
        );
        expect(result.map((item) => item.spec.number)).toEqual(['0002']);
    });

    it('BR-07: "changed while Studio was not running" is shown and named, "no longer observed" is shown as gone', async () => {
        const result = list(
            await activity([
                entry('0001-thing', 'Ready', 'Active', '2026-11-16T09:00:00.000Z', { kind: 'changed-while-not-running' }),
                entry('0099-vanished', 'Done', null, '2026-11-16T08:00:00.000Z', { kind: 'no-longer-observed' }),
            ]),
        );
        expect(result[0]?.change).toEqual({ kind: 'state', old: 'Ready', new: 'Active', whileClosed: true });
        expect(result[1]).toMatchObject({ spec: { stem: '0099-vanished', number: '0099', found: false }, change: { kind: 'gone', old: 'Done' } });
    });

    it('BR-07: run entries show every status but Running (a change to Running is not shown)', async () => {
        const result = list(
            await activity([], [
                {
                    id: 'r1',
                    stem: '0001-thing',
                    status: 'Completed',
                    history: [
                        { status: 'Starting', at: '2026-11-16T07:00:00.000Z' },
                        { status: 'Running', at: '2026-11-16T07:01:00.000Z' },
                        { status: 'WaitingForInput', at: '2026-11-16T07:02:00.000Z' },
                        { status: 'Completed', at: '2026-11-16T07:03:00.000Z' },
                    ],
                },
            ]),
        );
        expect(result.map((item) => (item.change.kind === 'run' ? item.change.status : '-'))).toEqual(['Completed', 'WaitingForInput', 'Starting']);
    });

    it('AC-010: the 10 newest entries, newest first; fewer than 10 are all shown', async () => {
        const many = Array.from({ length: 14 }, (_, index) => entry('0001-thing', 'Backlog', 'Ready', `2026-11-16T09:${String(index).padStart(2, '0')}:00.000Z`));
        const result = list(await activity(many));
        expect(result).toHaveLength(10);
        expect(result[0]?.at).toBe('2026-11-16T09:13:00.000Z');
        expect(result[9]?.at).toBe('2026-11-16T09:04:00.000Z');
        expect(list(await activity(many.slice(0, 3)))).toHaveLength(3);
    });

    it('A-005: equal times — spec entries before run entries, then ascending spec number', async () => {
        const at = '2026-11-16T09:00:00.000Z';
        const result = list(
            await activity(
                [entry('0002-thing', 'Backlog', 'Ready', at), entry('0001-thing', 'Backlog', 'Ready', at)],
                [{ id: 'r1', stem: '0001-thing', status: 'Failed', history: [{ status: 'Failed', at }] }],
            ),
        );
        expect(result.map((item) => [item.spec.number, item.change.kind])).toEqual([
            ['0001', 'state'],
            ['0002', 'state'],
            ['0001', 'run'],
        ]);
    });

    it('A-007: an entry of a duplicated stem shows the first entry in key order and no path', async () => {
        const model = await modelFor([{ number: '0001', kind: 'Active', title: 'Alpha' }], { '.specs/done/0001-thing.md': '# Dup\n\n**Status:** Implemented\n**Plan:** _none_\n' });
        const result = projectActivity(history([entry('0001-thing', 'Backlog', 'Ready', '2026-11-16T09:00:00.000Z')]), { available: true, runs: [] }, createSpecResolver(model));
        expect(result.available && result.entries[0]?.spec).toMatchObject({ title: 'Alpha' });
        expect(result.available && result.entries[0]?.spec.path).toBeUndefined();
    });

    it('A-006: with the history not available the list is "not available" with its reason, not empty', async () => {
        const result = await activity({ available: false, text: 'Status history not available: no store' });
        expect(result).toEqual({ available: false, reason: 'no store' });
    });

    it('A-006: with the runs not available the list is "not available" with the store reason, even if the history is readable', async () => {
        const result = await activity([entry('0001-thing', 'Backlog', 'Ready', '2026-11-16T09:00:00.000Z')], { available: false, reason: 'disk is full' });
        expect(result).toEqual({ available: false, reason: 'disk is full' });
    });

    it('AC-011: only status changes appear — a run with events and an error text yields run status entries only, never the text', async () => {
        const result = await activity([], [{ id: 'r1', stem: '0001-thing', status: 'Failed', errorMessage: 'SECRET-1' }]);
        expect(JSON.stringify(result)).not.toContain('SECRET');
        expect(list(result).every((item) => item.change.kind === 'run')).toBe(true);
    });

    it('AC-010: an unreadable run adds no entry (its history is a placeholder)', async () => {
        const result = list(await activity([], [{ id: 'bad', stem: '0001-thing', status: 'Starting', unreadable: true }]));
        expect(result).toEqual([]);
    });

    it('an empty history and no runs give an available, empty list', async () => {
        expect(await activity([])).toEqual({ available: true, entries: [] });
    });
});
