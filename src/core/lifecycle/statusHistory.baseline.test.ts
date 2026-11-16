import { describe, expect, it } from 'vitest';
import { RuntimeRefusal } from '../runtime/model';
import { createHistoryWorld, record } from './testing/historyWorld';
import { planText, specText } from './testing/projects';

const LINKED = '[0001-a.plan.md](0001-a.plan.md)';

function activeSpec(w: ReturnType<typeof createHistoryWorld>, stem = '0001-a'): void {
    w.set(`.specs/active/${stem}.md`, specText({ status: 'In Progress', plan: `[${stem}.plan.md](${stem}.plan.md)` }));
    w.set(`.specs/active/${stem}.plan.md`, planText({ status: 'In Progress' }));
}

describe('status history: baseline after activation', () => {
    it('AC-015: a derived state that differs from the last recorded one appends exactly one entry, at the time of that derivation', async () => {
        const w = createHistoryWorld([record('0001-a', 'Backlog'), record('0001-a', 'Ready')]);
        activeSpec(w);
        await w.observe();
        expect(w.added()).toEqual([
            { observedAt: '2026-11-16T09:00:01Z', stem: '0001-a', old: 'Ready', new: 'Active', rule: 'S-ACTIVE', cause: { kind: 'changed-while-not-running' }, flow: 'not checked' },
        ]);
    });

    it('AC-015: an equal state appends nothing; a later derivation does not repeat the baseline', async () => {
        const w = createHistoryWorld([record('0001-a', 'Active')]);
        activeSpec(w);
        await w.observe();
        await w.observe();
        expect(w.store.records).toHaveLength(1);
    });

    it('AC-015: no intermediate states and no time from file timestamps are recorded', async () => {
        const w = createHistoryWorld([record('0001-a', 'Backlog')]);
        activeSpec(w);
        await w.observe();
        const entry = w.added()[0];
        expect(Object.keys(entry).sort()).toEqual(['cause', 'flow', 'new', 'observedAt', 'old', 'rule', 'stem']);
        expect(entry.observedAt).toBe('2026-11-16T09:00:01Z');
        expect(w.added()).toHaveLength(1);
    });

    it('AC-017: a spec whose stem has no last recorded state gets a first observed entry without an old state', async () => {
        const w = createHistoryWorld();
        activeSpec(w);
        await w.observe();
        expect(w.added()).toEqual([
            { observedAt: '2026-11-16T09:00:01Z', stem: '0001-a', old: null, new: 'Active', rule: 'S-ACTIVE', cause: { kind: 'first-observed' }, flow: 'not checked' },
        ]);
    });

    it('AC-017: a stem whose newest entry is no longer observed has no last recorded state, so the spec is first observed again', async () => {
        const w = createHistoryWorld([record('0001-a', 'Active'), record('0001-a', null)]);
        activeSpec(w);
        await w.observe();
        expect(w.added()[0].cause).toEqual({ kind: 'first-observed' });
    });

    it('AC-017: a stem with a last recorded state that is absent at the first derivation is no longer observed', async () => {
        const w = createHistoryWorld([record('0009-gone', 'Backlog')]);
        activeSpec(w);
        await w.observe();
        expect(w.added().find((entry) => entry.stem === '0009-gone')).toEqual({
            observedAt: '2026-11-16T09:00:02Z',
            stem: '0009-gone',
            old: 'Backlog',
            new: null,
            rule: null,
            cause: { kind: 'no-longer-observed' },
            flow: 'not checked',
        });
    });

    it('AC-017: a stem already marked no longer observed is not marked again (negative control)', async () => {
        const w = createHistoryWorld([record('0009-gone', 'Backlog'), record('0009-gone', null)]);
        activeSpec(w);
        await w.observe();
        expect(w.added().filter((entry) => entry.stem === '0009-gone')).toEqual([]);
    });

    it('AC-017: deleting a spec while running records no longer observed; it reappearing records first observed', async () => {
        const w = createHistoryWorld();
        activeSpec(w);
        await w.baseline();
        w.remove('.specs/active/0001-a.md');
        w.remove('.specs/active/0001-a.plan.md');
        await w.observe();
        activeSpec(w);
        await w.observe();
        expect(w.added().map((entry) => [entry.old, entry.new, (entry.cause as { kind: string }).kind, entry.flow])).toEqual([
            ['Active', null, 'no-longer-observed', 'not checked'],
            [null, 'Active', 'first-observed', 'not checked'],
        ]);
    });

    it('AC-017: a stem change gives no longer observed for the old and first observed for the new stem', async () => {
        const w = createHistoryWorld();
        activeSpec(w);
        await w.baseline();
        w.remove('.specs/active/0001-a.md');
        w.remove('.specs/active/0001-a.plan.md');
        activeSpec(w, '0001-renamed');
        await w.observe();
        expect(w.added().map((entry) => [entry.stem, (entry.cause as { kind: string }).kind])).toEqual([
            ['0001-a', 'no-longer-observed'],
            ['0001-renamed', 'first-observed'],
        ]);
    });

    it('AC-017: a move between lifecycle folders keeps the stem and produces neither entry', async () => {
        const w = createHistoryWorld();
        w.set('.specs/backlog/0001-a.md', specText({ plan: '_none yet_' }));
        await w.baseline();
        w.remove('.specs/backlog/0001-a.md');
        w.set('.specs/active/0001-a.md', specText({ status: 'In Progress', plan: '_none_', origin: 'Reverse — Brownfield' }));
        await w.observe();
        expect(w.added().map((entry) => (entry.cause as { kind: string }).kind)).toEqual(['files']);
    });

    it('AC-017: a stored entry of a foreign shape is skipped when the last recorded state is computed', async () => {
        const w = createHistoryWorld([record('0001-a', 'Active'), { stem: '0001-a', observedAt: 'x', entry: 'garbage' }, { stem: '0001-a', observedAt: 'y', entry: { new: 5 } }]);
        activeSpec(w);
        await w.observe();
        expect(w.store.records).toHaveLength(3);
    });
});

describe('status history: duplicated stems', () => {
    function duplicated(w: ReturnType<typeof createHistoryWorld>): void {
        w.set('.specs/active/0001-a.md', specText({ status: 'In Progress', plan: LINKED }));
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'In Progress' }));
        w.set('.specs/backlog/0001-a.md', specText({ plan: '_none yet_' }));
    }

    it('AC-026: while two entries share the stem no entry is appended; when one remains its state is compared with the last recorded one', async () => {
        const w = createHistoryWorld();
        activeSpec(w);
        await w.baseline();
        w.set('.specs/backlog/0001-a.md', specText({ plan: '_none yet_' }));
        await w.observe();
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'Done' }));
        await w.observe();
        expect(w.store.records).toEqual([]);
        w.remove('.specs/backlog/0001-a.md');
        await w.observe();
        expect(w.added().map((entry) => [entry.old, entry.new, entry.flow, (entry.cause as { kind: string }).kind])).toEqual([['Active', 'Review', 'in flow', 'files']]);
    });

    it('AC-026: an unchanged state after the duplication ends appends nothing', async () => {
        const w = createHistoryWorld();
        activeSpec(w);
        await w.baseline();
        w.set('.specs/backlog/0001-a.md', specText({ plan: '_none yet_' }));
        await w.observe();
        w.remove('.specs/backlog/0001-a.md');
        await w.observe();
        expect(w.store.records).toEqual([]);
    });

    it('AC-026: a stem without a last recorded state is first observed when the duplication ends', async () => {
        const w = createHistoryWorld();
        duplicated(w);
        await w.observe();
        expect(w.store.records).toEqual([]);
        w.remove('.specs/backlog/0001-a.md');
        await w.observe();
        expect(w.added().map((entry) => (entry.cause as { kind: string }).kind)).toEqual(['first-observed']);
    });

    it('AC-026: a duplicated stem at the first derivation is not marked no longer observed, even with a stored state', async () => {
        const w = createHistoryWorld([record('0001-a', 'Active')]);
        duplicated(w);
        await w.observe();
        expect(w.store.records).toHaveLength(1);
    });
});

describe('status history: store outage', () => {
    it('AC-024: a read-only store appends nothing and the change is not recorded later', async () => {
        const w = createHistoryWorld();
        activeSpec(w);
        await w.baseline();
        w.store.setState('read-only', 'another window holds the lock');
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'Done' }));
        await w.observe();
        expect(w.store.records).toEqual([]);
        w.store.setState('writable');
        await w.observe();
        expect(w.store.records).toEqual([]);
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'In Progress' }));
        await w.observe();
        expect(w.added().map((entry) => [entry.old, entry.new])).toEqual([['Review', 'Active']]);
    });

    it('AC-024: a failing append (RuntimeRefusal) does not reach the caller and is not retried later', async () => {
        const w = createHistoryWorld();
        activeSpec(w);
        await w.baseline();
        w.store.failAppends(new RuntimeRefusal('storage-failed', 'disk full'));
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'Done' }));
        await expect(w.observe()).resolves.toBeUndefined();
        w.store.failAppends(undefined);
        await w.observe();
        expect(w.store.records).toEqual([]);
    });

    it('AC-024: an unreadable history is reported as not available with the reason and nothing is appended', async () => {
        const w = createHistoryWorld();
        w.store.failReads('history unreadable');
        activeSpec(w);
        await w.observe();
        expect(w.store.records).toEqual([]);
        expect(await w.history.read()).toEqual({ available: false, text: 'Status history not available: history unreadable' });
    });

    it('AC-024: an unavailable store keeps deriving: the baseline is taken from the first readable derivation, with no entry for the gap', async () => {
        const w = createHistoryWorld([record('0001-a', 'Backlog')]);
        w.store.setState('unavailable', 'no storage');
        activeSpec(w);
        await w.observe();
        expect(w.store.records).toHaveLength(1);
        w.store.setState('writable');
        await w.observe();
        expect(w.added().map((entry) => (entry.cause as { kind: string }).kind)).toEqual(['changed-while-not-running']);
    });

    it('AC-024: a read-only store at the first derivation seeds the states; later writable appends only new changes', async () => {
        const w = createHistoryWorld([record('0001-a', 'Backlog')]);
        w.store.setState('read-only', 'another window holds the lock');
        activeSpec(w);
        await w.observe();
        expect(w.store.records).toHaveLength(1);
        w.store.setState('writable');
        await w.observe();
        expect(w.store.records).toHaveLength(1);
    });

    it('AC-024: a thrown read is reported as not available', async () => {
        const w = createHistoryWorld();
        w.store.readSpecStatusHistory = async () => {
            throw new Error('boom');
        };
        activeSpec(w);
        await expect(w.observe()).resolves.toBeUndefined();
        expect(await w.history.read()).toEqual({ available: false, text: 'Status history not available: boom' });
    });
});
