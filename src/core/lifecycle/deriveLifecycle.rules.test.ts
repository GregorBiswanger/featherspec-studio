import { describe, expect, it } from 'vitest';
import { createMemorySpecSource } from '../specs/testing/memorySpecSource';
import { readProject } from '../specs/readProject';
import { deriveLifecycle } from './deriveLifecycle';
import type { LifecycleEntry } from './model';
import { noteText, planText, readFixture, readMemory, ROOT, specText, VERSION } from './testing/projects';

const LINKED = '[0001-a.plan.md](0001-a.plan.md)';
const ARCHIVE = '[0001-a.2026-11-01.plan.md](../plan-archive/0001-a.2026-11-01.plan.md)';

function only(model: ReturnType<typeof deriveLifecycle>, stem = '0001-a'): LifecycleEntry {
    const entry = model.entries.find((candidate) => candidate.stem === stem);
    if (entry === undefined) {
        throw new Error('entry missing');
    }
    return entry;
}

function kinds(entry: LifecycleEntry): string[] {
    return entry.diagnostics
        .filter((diagnostic) => diagnostic.kind !== 'dangling-link')
        .map((diagnostic) => (diagnostic.kind === 'lifecycle-contradiction' ? diagnostic.contradiction : diagnostic.kind));
}

describe('Blocked (S-BLOCKED)', () => {
    it('AC-020: the parallel fixture is Blocked from its Blocked plan and from its BLOCKED return note', async () => {
        const model = deriveLifecycle(await readFixture('fs110-parallel-synthetic'));
        expect(model.entries.map((entry) => [entry.state, entry.rule, entry.persistence])).toEqual([['Blocked', 'S-BLOCKED', 'derived']]);
    });

    it('AC-020: a Blocked sibling plan alone blocks; so does a BLOCKED return note alone', async () => {
        const byPlan = deriveLifecycle(
            await readMemory({ '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: LINKED }), '.specs/active/0001-a.plan.md': planText({ status: 'Blocked' }) }),
        );
        expect(only(byPlan).state).toBe('Blocked');
        const byNote = deriveLifecycle(
            await readMemory({
                '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: LINKED }),
                '.specs/active/0001-a.plan.md': planText({ status: 'In Progress' }),
                '.memory-bank/activeContext.0001-T-002.md': noteText('BLOCKED'),
            }),
        );
        expect(only(byNote).state).toBe('Blocked');
    });

    it('AC-020: a return note with another status, Blockers prose and a Blocker section do not block (negative controls)', async () => {
        const model = deriveLifecycle(
            await readMemory({
                '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: LINKED }),
                '.specs/active/0001-a.plan.md': `${planText({ status: 'In Progress' })}\n## Blocker\n\nwaiting for a decision\n`,
                '.memory-bank/activeContext.0001-T-002.md': noteText('DONE'),
                '.memory-bank/activeContext.md': '# Active Context\n\n## Blockers / Questions\n\n- everything is BLOCKED\n',
            }),
        );
        expect(only(model).state).toBe('Active');
    });

    it('AC-020: a backlog spec with a Blocked plan is Blocked and fails R-5; a done/ spec is Done, not Blocked', async () => {
        const backlog = deriveLifecycle(
            await readMemory({ '.specs/backlog/0001-a.md': specText({ plan: LINKED }), '.specs/backlog/0001-a.plan.md': planText({ status: 'Blocked' }) }),
        );
        expect(only(backlog).state).toBe('Blocked');
        expect(only(backlog).readiness.failing).toContain('R-5');
        const done = deriveLifecycle(
            await readMemory({ '.specs/done/0001-a.md': specText({ status: 'Implemented', plan: ARCHIVE }), '.specs/done/0001-a.plan.md': planText({ status: 'Blocked' }) }),
        );
        expect(only(done).state).toBe('Done');
    });

    it('AC-020: Blocked also applies to a contradictory spec and to an unreadable one', async () => {
        const contradictory = deriveLifecycle(
            await readMemory({ '.specs/active/0001-a.md': specText({ status: 'Draft', plan: LINKED }), '.specs/active/0001-a.plan.md': planText({ status: 'Blocked' }) }),
        );
        expect(only(contradictory).state).toBe('Blocked');
        expect(kinds(only(contradictory))).toContain('folder-status');
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/active/0001-a.md', new Uint8Array([0xff, 0xfe, 0x00, 0xc3, 0x28]));
        source.setFile(ROOT, '.specs/active/0001-a.plan.md', planText({ status: 'Blocked' }));
        expect(only(deriveLifecycle(await readProject(source, ROOT, VERSION))).state).toBe('Blocked');
    });
});

describe('lifecycle contradictions (closed list)', () => {
    it('AC-012: a folder that does not match the status keeps its folder state, carries the diagnostic and is neither Ready nor Review', async () => {
        const backlog = only(deriveLifecycle(await readMemory({ '.specs/backlog/0001-a.md': specText({ status: 'In Progress', plan: LINKED }), '.specs/backlog/0001-a.plan.md': planText() })));
        expect([backlog.state, backlog.rule]).toEqual(['Backlog', 'S-FOLDER']);
        expect(kinds(backlog)).toEqual(['folder-status']);
        expect(backlog.readiness.failing).toContain('R-6');
        const active = only(deriveLifecycle(await readMemory({ '.specs/active/0001-a.md': specText({ status: 'Draft', plan: LINKED }), '.specs/active/0001-a.plan.md': planText({ status: 'Done' }) })));
        expect([active.state, active.rule]).toEqual(['Active', 'S-FOLDER']);
        const done = only(deriveLifecycle(await readMemory({ '.specs/done/0001-a.md': specText({ status: 'Draft', plan: ARCHIVE }) })));
        expect([done.state, done.rule]).toEqual(['Done', 'S-DONE']);
        expect(kinds(done)).toEqual(['folder-status']);
    });

    it('AC-012: the diagnostic names the contradiction with the X-7 text', async () => {
        const entry = only(deriveLifecycle(await readMemory({ '.specs/backlog/0001-a.md': specText({ status: 'In Progress' }) })));
        expect(entry.diagnostics).toContainEqual({
            kind: 'lifecycle-contradiction',
            contradiction: 'folder-status',
            scope: { file: '.specs/backlog/0001-a.md' },
            reason: 'Folder backlog/ does not match status "In Progress".',
        });
    });

    it('AC-012: a missing or unknown status counts as other', async () => {
        const missing = only(deriveLifecycle(await readMemory({ '.specs/backlog/0001-a.md': specText({ status: undefined }) })));
        expect(kinds(missing)).toEqual(['folder-status']);
        const unknown = only(deriveLifecycle(await readMemory({ '.specs/active/0001-a.md': specText({ status: 'Wip', plan: LINKED }), '.specs/active/0001-a.plan.md': planText() })));
        expect(kinds(unknown)).toContain('folder-status');
        expect(unknown.diagnostics.some((diagnostic) => diagnostic.kind === 'unknown-content')).toBe(true);
    });

    it('AC-012: active/ without a sibling plan and done/ Implemented without an archive link are contradictions', async () => {
        const active = only(deriveLifecycle(await readMemory({ '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: '_none yet_' }) })));
        expect([active.state, kinds(active)]).toEqual(['Active', ['active-without-plan']]);
        const done = only(deriveLifecycle(await readMemory({ '.specs/done/0001-a.md': specText({ status: 'Implemented', plan: '_none yet_' }) })));
        expect([done.state, kinds(done)]).toEqual(['Done', ['done-without-archive-link']]);
    });

    it('AC-012: the brownfield fixture reports the invariant breach and keeps the other specs', async () => {
        const model = deriveLifecycle(await readFixture('fs170-brownfield-mixed'));
        const byStem = Object.fromEntries(model.entries.map((entry) => [entry.stem, [entry.state, kinds(entry).filter((kind) => kind !== 'unknown-content')]]));
        expect(byStem['0002-payment-retry']).toEqual(['Done', ['done-without-archive-link']]);
        expect(byStem['0006-outbox-batch-size']).toEqual(['Review', []]);
        expect(byStem['0001-baseline-orders']).toEqual(['Done', []]);
        expect(byStem['0003-direct-broker-publication'][0]).toBe('Backlog');
    });

    it('AC-025: no diagnostic for active/ without a plan that links a plan-archive/ path', async () => {
        const entry = only(deriveLifecycle(await readMemory({ '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: ARCHIVE }) })));
        expect(kinds(entry)).toEqual([]);
        expect(entry.state).toBe('Active');
    });

    it('AC-025: no diagnostic for a done/ spec with a legacy sibling plan beside it', async () => {
        const entry = only(deriveLifecycle(await readMemory({ '.specs/done/0001-a.md': specText({ status: 'Implemented', plan: LINKED }), '.specs/done/0001-a.plan.md': planText({ status: 'Done' }) })));
        expect(kinds(entry)).toEqual([]);
    });

    it('AC-025: no diagnostic for a reactivated Baseline (Origin line, Plan _none_, no plan)', async () => {
        const entry = only(deriveLifecycle(await readMemory({ '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: '_none_', origin: 'Reverse — Brownfield' }) })));
        expect(kinds(entry)).toEqual([]);
    });

    it('AC-025: without the Origin line, or with another Plan value, the diagnostic stays (negative controls)', async () => {
        const noOrigin = only(deriveLifecycle(await readMemory({ '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: '_none_' }) })));
        expect(kinds(noOrigin)).toEqual(['active-without-plan']);
        const yet = only(deriveLifecycle(await readMemory({ '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: '_none yet_', origin: 'Reverse — Brownfield' }) })));
        expect(kinds(yet)).toEqual(['active-without-plan']);
    });
});

describe('unreadable files and duplicates', () => {
    it('AC-019: an unreadable spec keeps the other states, derives by folder, carries the diagnostic and is never Ready or Review', async () => {
        const model = deriveLifecycle(await readFixture('fs-broken'));
        const byStem = Object.fromEntries(model.entries.map((entry) => [entry.stem, entry]));
        const broken = byStem['0002-invalid-utf8'];
        expect([broken.state, broken.rule]).toEqual(['Active', 'S-FOLDER']);
        expect(kinds(broken)).toContain('unreadable-file');
        expect(byStem['0001-valid-spec'].state).toBe('Backlog');
        expect(byStem['0003-also-valid'].state).toBe('Done');
    });

    it('AC-019: an unreadable backlog spec is Backlog and an unreadable done/ spec is Done', async () => {
        const source = createMemorySpecSource();
        source.setUnreadable(ROOT, '.specs/backlog/0001-a.md', 'EACCES');
        source.setUnreadable(ROOT, '.specs/done/0002-b.md', 'EACCES');
        const model = deriveLifecycle(await readProject(source, ROOT, VERSION));
        expect(model.entries.map((entry) => [entry.stem, entry.state])).toEqual([
            ['0001-a', 'Backlog'],
            ['0002-b', 'Done'],
        ]);
        expect(model.entries[0].readiness.ready).toBe(false);
    });

    it('AC-019: an unreadable sibling plan makes its spec neither Ready nor Review', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/backlog/0001-a.md', specText({ plan: LINKED }));
        source.setUnreadable(ROOT, '.specs/backlog/0001-a.plan.md', 'EACCES');
        source.setFile(ROOT, '.specs/active/0002-b.md', specText({ status: 'In Progress', plan: '[0002-b.plan.md](0002-b.plan.md)' }));
        source.setUnreadable(ROOT, '.specs/active/0002-b.plan.md', 'EACCES');
        const model = deriveLifecycle(await readProject(source, ROOT, VERSION));
        expect(model.entries.map((entry) => [entry.stem, entry.state])).toEqual([
            ['0002-b', 'Active'],
            ['0001-a', 'Backlog'],
        ]);
        expect(model.entries[1].readiness.failing).toContain('R-6');
    });

    it('AC-022: the same stem in two folders gives two entries, each with its state and the duplicate diagnostic, none Ready', async () => {
        const model = deriveLifecycle(
            await readMemory({
                '.specs/backlog/0001-a.md': specText({ plan: LINKED }),
                '.specs/backlog/0001-a.plan.md': planText(),
                '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: '_none yet_' }),
            }),
        );
        expect(model.entries.map((entry) => [entry.key, entry.state])).toEqual([
            ['.specs/active/0001-a.md', 'Active'],
            ['.specs/backlog/0001-a.md', 'Backlog'],
        ]);
        for (const entry of model.entries) {
            expect(kinds(entry)).toContain('duplicate');
            expect(entry.readiness.ready).toBe(false);
        }
        expect(model.entries[1].readiness.failing).toEqual(['R-6']);
    });

    it('AC-022: one number with two slugs: each entry keeps its own state and none is Ready', async () => {
        const model = deriveLifecycle(
            await readMemory({
                '.specs/backlog/0001-a.md': specText({ plan: LINKED }),
                '.specs/backlog/0001-a.plan.md': planText(),
                '.specs/backlog/0001-b.md': specText({ plan: '_none yet_' }),
            }),
        );
        expect(model.entries.map((entry) => [entry.stem, entry.state])).toEqual([
            ['0001-a', 'Backlog'],
            ['0001-b', 'Backlog'],
        ]);
        expect(kinds(model.entries[0])).toContain('duplicate');
    });
});
