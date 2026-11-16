import { describe, expect, it } from 'vitest';
import { deriveLifecycle } from './deriveLifecycle';
import type { LifecycleEntry } from './model';
import { noteText, planText, readFixture, readMemory, row, specText } from './testing/projects';

const LINKED = '[0001-a.plan.md](0001-a.plan.md)';
const ARCHIVE = '[0001-a.2026-11-01.plan.md](../plan-archive/0001-a.2026-11-01.plan.md)';
const SPEC = { '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: LINKED }) };

async function entryOf(files: Record<string, string>, key = '.specs/active/0001-a.md'): Promise<LifecycleEntry> {
    const entry = deriveLifecycle(await readMemory(files)).entries.find((candidate) => candidate.key === key);
    if (entry === undefined) {
        throw new Error('entry missing');
    }
    return entry;
}

describe('blocking conditions', () => {
    it('AC-027: a Blocked plan and a BLOCKED return note are both reported, the note by its file name', async () => {
        const entry = await entryOf({
            ...SPEC,
            '.specs/active/0001-a.plan.md': planText({ status: 'Blocked' }),
            '.memory-bank/activeContext.0001-T-002.md': noteText('BLOCKED'),
        });
        expect(entry.state).toBe('Blocked');
        expect(entry.blockedBy).toEqual({ plan: true, returnNotes: ['activeContext.0001-T-002.md'] });
    });

    it('AC-027: only the plan, or only a note, is reported as that one condition', async () => {
        const planOnly = await entryOf({ ...SPEC, '.specs/active/0001-a.plan.md': planText({ status: 'Blocked' }) });
        expect(planOnly.blockedBy).toEqual({ plan: true, returnNotes: [] });
        const noteOnly = await entryOf({
            ...SPEC,
            '.specs/active/0001-a.plan.md': planText({ status: 'In Progress' }),
            '.memory-bank/activeContext.0001-T-002.md': noteText('BLOCKED'),
        });
        expect(noteOnly.blockedBy).toEqual({ plan: false, returnNotes: ['activeContext.0001-T-002.md'] });
    });

    it('AC-027: a return note with another status is no condition', async () => {
        const entry = await entryOf({
            ...SPEC,
            '.specs/active/0001-a.plan.md': planText({ status: 'In Progress' }),
            '.memory-bank/activeContext.0001-T-002.md': noteText('DONE'),
        });
        expect([entry.state, entry.blockedBy]).toEqual(['Active', undefined]);
    });

    it('AC-027: an entry that is not Blocked reports none, a done/ spec with a Blocked plan included', async () => {
        const done = await entryOf(
            {
                '.specs/done/0001-a.md': specText({ status: 'Implemented', plan: ARCHIVE }),
                '.specs/done/0001-a.plan.md': planText({ status: 'Blocked' }),
            },
            '.specs/done/0001-a.md',
        );
        expect([done.state, done.blockedBy]).toEqual(['Done', undefined]);
        const fixture = deriveLifecycle(await readFixture('fs110-ready-synthetic'));
        fixture.entries.filter((entry) => entry.state !== 'Blocked').forEach((entry) => expect(entry.blockedBy).toBeUndefined());
    });

    it('AC-027: the parallel fixture names its condition', async () => {
        const model = deriveLifecycle(await readFixture('fs110-parallel-synthetic'));
        const blocked = model.entries.filter((entry) => entry.state === 'Blocked');
        expect(blocked).toHaveLength(1);
        expect(blocked[0]?.blockedBy?.plan === true || (blocked[0]?.blockedBy?.returnNotes.length ?? 0) > 0).toBe(true);
    });
});

describe('plan in use', () => {
    it('AC-028: a sibling plan is reported also without traceability rows', async () => {
        const bare = await entryOf({ ...SPEC, '.specs/active/0001-a.plan.md': planText({ status: 'In Progress' }) });
        expect([bare.plan, bare.verification.source]).toEqual(['.specs/active/0001-a.plan.md', undefined]);
        const rows = await entryOf({ ...SPEC, '.specs/active/0001-a.plan.md': planText({ rows: [row('AC-001', 'open')] }) });
        expect(rows.plan).toBe('.specs/active/0001-a.plan.md');
    });

    it('AC-028: a done/ spec reports the archived plan its Plan line links, else its legacy sibling plan', async () => {
        const archived = await entryOf(
            {
                '.specs/done/0001-a.md': specText({ status: 'Implemented', plan: ARCHIVE }),
                '.specs/done/0001-a.plan.md': planText({ status: 'Done' }),
                '.specs/plan-archive/0001-a.2026-11-01.plan.md': planText({ status: 'Done' }),
            },
            '.specs/done/0001-a.md',
        );
        expect(archived.plan).toBe('.specs/plan-archive/0001-a.2026-11-01.plan.md');
        const legacy = await entryOf(
            { '.specs/done/0001-a.md': specText({ status: 'Implemented' }), '.specs/done/0001-a.plan.md': planText({ status: 'Done' }) },
            '.specs/done/0001-a.md',
        );
        expect(legacy.plan).toBe('.specs/done/0001-a.plan.md');
    });

    it('AC-028: no plan gives none', async () => {
        expect((await entryOf(SPEC)).plan).toBeUndefined();
        const baseline = await entryOf({ '.specs/done/0001-a.md': specText({ status: 'Baseline' }) }, '.specs/done/0001-a.md');
        expect(baseline.plan).toBeUndefined();
    });
});
