import { describe, expect, it } from 'vitest';
import type { ClockPort } from '../ports/host';
import { createMemorySpecSource } from '../specs/testing/memorySpecSource';
import { readProject } from '../specs/readProject';
import type { ProjectRead } from '../specs/readProject';
import { deriveLifecycle } from './deriveLifecycle';
import { createStatusHistory, HISTORY_LABEL } from './statusHistory';
import { appended, createFakeHistoryStore } from './testing/fakeHistoryStore';
import { noteText, planText, ROOT, specText, VERSION } from './testing/projects';

const LINKED = '[0001-a.plan.md](0001-a.plan.md)';

function setup() {
    const source = createMemorySpecSource();
    const store = createFakeHistoryStore();
    let tick = 0;
    const clock: ClockPort = { now: () => `2026-11-16T09:00:0${++tick}Z`, setTimeout: () => ({ dispose: () => undefined }) };
    const history = createStatusHistory({ store, clock });
    let previous: ProjectRead | undefined;
    return {
        source,
        store,
        history,
        set: (path: string, content: string) => source.setFile(ROOT, path, content),
        remove: (path: string) => source.remove(ROOT, path),
        async observe(): Promise<void> {
            const current = await readProject(source, ROOT, VERSION);
            await history.observe(previous, current, deriveLifecycle(current));
            previous = current;
        },
    };
}

describe('status history: live changes', () => {
    it('AC-014: a plan going from In Progress to Done appends one Active -> Review entry with the plan path as cause', async () => {
        const w = setup();
        w.set('.specs/active/0001-a.md', specText({ status: 'In Progress', plan: LINKED }));
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'In Progress' }));
        await w.observe();
        expect(w.store.records).toEqual([]);
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'Done' }));
        await w.observe();
        expect(w.store.records.map((record) => record.stem)).toEqual(['0001-a']);
        expect(appended(w.store)).toEqual([
            {
                observedAt: '2026-11-16T09:00:01Z',
                stem: '0001-a',
                old: 'Active',
                new: 'Review',
                rule: 'S-REVIEW',
                cause: { kind: 'files', paths: ['.specs/active/0001-a.plan.md'] },
                flow: 'in flow',
            },
        ]);
    });

    it('AC-009: a change outside the FeatherSpec flow is recorded with that marker; the new state is the one the files define', async () => {
        const w = setup();
        w.set('.specs/active/0001-a.md', specText({ status: 'In Progress', plan: '_none_', origin: 'Reverse — Brownfield' }));
        await w.observe();
        w.remove('.specs/active/0001-a.md');
        w.set('.specs/backlog/0001-a.md', specText({ status: 'Draft', plan: '_none yet_' }));
        await w.observe();
        const entry = appended(w.store)[0];
        expect([entry.old, entry.new, entry.rule, entry.flow]).toEqual(['Active', 'Backlog', 'S-BACKLOG', 'outside the FeatherSpec flow']);
        expect(entry.cause).toEqual({ kind: 'files', paths: ['.specs/active/0001-a.md', '.specs/backlog/0001-a.md'] });
    });

    it('AC-014: a Blocked return note is a cause; unblocking records the way back', async () => {
        const w = setup();
        w.set('.specs/active/0001-a.md', specText({ status: 'In Progress', plan: LINKED }));
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'In Progress' }));
        await w.observe();
        w.set('.memory-bank/activeContext.0001-T-002.md', noteText('BLOCKED'));
        await w.observe();
        w.remove('.memory-bank/activeContext.0001-T-002.md');
        await w.observe();
        const entries = appended(w.store);
        expect(entries.map((entry) => [entry.old, entry.new, entry.flow])).toEqual([
            ['Active', 'Blocked', 'in flow'],
            ['Blocked', 'Active', 'in flow'],
        ]);
        expect((entries[0].cause as { paths: string[] }).paths).toEqual(['.memory-bank/activeContext.0001-T-002.md']);
    });

    it('AC-014: a Status edit that leaves the state unchanged appends nothing (OP-008)', async () => {
        const w = setup();
        w.set('.specs/active/0001-a.md', specText({ status: 'In Progress', plan: LINKED }));
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'Not started' }));
        await w.observe();
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'In Progress' }));
        await w.observe();
        expect(w.store.records).toEqual([]);
    });

    it('AC-023: several changes in one notification give one entry from the old to the final state', async () => {
        const w = setup();
        w.set('.specs/backlog/0001-a.md', specText({ plan: LINKED }));
        w.set('.specs/backlog/0001-a.plan.md', planText());
        await w.observe();
        w.remove('.specs/backlog/0001-a.md');
        w.remove('.specs/backlog/0001-a.plan.md');
        w.set('.specs/active/0001-a.md', specText({ status: 'In Progress', plan: LINKED }));
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'Done' }));
        await w.observe();
        expect(appended(w.store)).toHaveLength(1);
        const entry = appended(w.store)[0];
        expect([entry.old, entry.new, entry.flow]).toEqual(['Ready', 'Review', 'in flow']);
        expect((entry.cause as { paths: string[] }).paths).toHaveLength(4);
    });

    it('AC-016: an observation without a state change appends nothing, and the label is supplied once', async () => {
        const w = setup();
        w.set('.specs/active/0001-a.md', specText({ status: 'In Progress', plan: LINKED }));
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'In Progress' }));
        await w.observe();
        await w.observe();
        await w.observe();
        expect(w.store.appendAttempts()).toBe(0);
        expect(w.history.label).toBe(HISTORY_LABEL);
        expect(HISTORY_LABEL).toBe('Observed by Studio while it was running — not a reconstruction');
        const view = await w.history.read();
        expect(view).toEqual({ available: true, label: HISTORY_LABEL, entries: [] });
        expect(JSON.stringify(view).split(HISTORY_LABEL)).toHaveLength(2);
    });

    it('AC-016: the stored entry holds no file contents', async () => {
        const w = setup();
        w.set('.specs/active/0001-a.md', specText({ status: 'In Progress', plan: LINKED }));
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'In Progress' }));
        await w.observe();
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'Done' }));
        await w.observe();
        expect(JSON.stringify(w.store.records)).not.toContain('The system shall work');
        expect(Object.keys(appended(w.store)[0]).sort()).toEqual(['cause', 'flow', 'new', 'observedAt', 'old', 'rule', 'stem']);
    });

    it('AC-014: read returns the stored entries of this shape', async () => {
        const w = setup();
        w.set('.specs/active/0001-a.md', specText({ status: 'In Progress', plan: LINKED }));
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'In Progress' }));
        await w.observe();
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'Done' }));
        await w.observe();
        const view = await w.history.read();
        expect(view.available && view.entries.map((entry) => [entry.stem, entry.old, entry.new])).toEqual([['0001-a', 'Active', 'Review']]);
    });
});
