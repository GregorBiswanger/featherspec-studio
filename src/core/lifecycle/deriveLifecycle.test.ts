import { describe, expect, it } from 'vitest';
import { deriveLifecycle } from './deriveLifecycle';
import { findEntry } from './model';
import { planText, readFixture, readMemory, specText } from './testing/projects';

const LINKED = '[0001-a.plan.md](0001-a.plan.md)';

function states(model: ReturnType<typeof deriveLifecycle>): Record<string, string> {
    return Object.fromEntries(model.entries.map((entry) => [entry.stem, entry.state]));
}

describe('deriveLifecycle: states and rules', () => {
    it('AC-001: backlog with a not-started linked plan, active In Progress, active with a Done plan and done Implemented give Ready, Active, Review, Done', async () => {
        const project = await readMemory({
            '.specs/backlog/0001-a.md': specText({ status: 'Draft', plan: LINKED }),
            '.specs/backlog/0001-a.plan.md': planText({ status: 'Not started' }),
            '.specs/active/0002-b.md': specText({ status: 'In Progress', plan: '[0002-b.plan.md](0002-b.plan.md)' }),
            '.specs/active/0002-b.plan.md': planText({ status: 'In Progress' }),
            '.specs/active/0003-c.md': specText({ status: 'In Progress', plan: '[0003-c.plan.md](0003-c.plan.md)' }),
            '.specs/active/0003-c.plan.md': planText({ status: 'Done' }),
            '.specs/done/0004-d.md': specText({ status: 'Implemented', plan: '[0004-d.2026-11-01.plan.md](../plan-archive/0004-d.2026-11-01.plan.md)' }),
            '.specs/plan-archive/0004-d.2026-11-01.plan.md': planText({ status: 'Done' }),
        });
        expect(states(deriveLifecycle(project))).toEqual({ '0001-a': 'Ready', '0002-b': 'Active', '0003-c': 'Review', '0004-d': 'Done' });
    });

    it('AC-001: the spec-less plan-only snapshot yields no entries; every spec entry gets exactly one state', async () => {
        const project = await readMemory({ '.specs/backlog/0001-a.plan.md': planText() });
        expect(deriveLifecycle(project).entries).toEqual([]);
    });

    it('AC-001: the fixtures give the documented states', async () => {
        const ready = deriveLifecycle(await readFixture('fs110-ready-synthetic'));
        expect(states(ready)).toEqual({ '0001-ready-feature': 'Ready', '0002-old-feature': 'Done' });
        expect(states(deriveLifecycle(await readFixture('fs110-de-active-review')))).toEqual({ '0001-tip-splitter': 'Review' });
        expect(states(deriveLifecycle(await readFixture('fs180-en-done-archived')))).toEqual({ '0001-split-bill-with-tip': 'Done' });
    });

    it('AC-001: S-DONE comes first, whatever the status', async () => {
        const project = await readMemory({ '.specs/done/0001-a.md': specText({ status: 'Draft' }) });
        const entry = deriveLifecycle(project).entries[0];
        expect([entry.state, entry.rule]).toEqual(['Done', 'S-DONE']);
    });

    it('AC-002: Backlog, Active and Done are persisted; Ready and Review are derived; every entry names its rule', async () => {
        const project = await readMemory({
            '.specs/backlog/0001-a.md': specText({ status: 'Draft', plan: LINKED }),
            '.specs/backlog/0001-a.plan.md': planText(),
            '.specs/backlog/0005-e.md': specText({ status: 'Draft', plan: '_none yet_' }),
            '.specs/active/0002-b.md': specText({ status: 'In Progress', plan: '[0002-b.plan.md](0002-b.plan.md)' }),
            '.specs/active/0002-b.plan.md': planText({ status: 'In Progress' }),
            '.specs/active/0003-c.md': specText({ status: 'In Progress', plan: '[0003-c.plan.md](0003-c.plan.md)' }),
            '.specs/active/0003-c.plan.md': planText({ status: 'Done' }),
            '.specs/done/0004-d.md': specText({ status: 'Baseline', plan: '_none_' }),
        });
        const model = deriveLifecycle(project);
        const summary = Object.fromEntries(model.entries.map((entry) => [entry.stem, [entry.state, entry.rule, entry.persistence]]));
        expect(summary).toEqual({
            '0001-a': ['Ready', 'S-READY', 'derived'],
            '0005-e': ['Backlog', 'S-BACKLOG', 'persisted'],
            '0002-b': ['Active', 'S-ACTIVE', 'persisted'],
            '0003-c': ['Review', 'S-REVIEW', 'derived'],
            '0004-d': ['Done', 'S-DONE', 'persisted'],
        });
        expect(findEntry(model, '.specs/backlog/0001-a.md')?.derivedLabel).toBe('Derived (rule S-READY)');
        expect(findEntry(model, '.specs/active/0002-b.md')?.derivedLabel).toBeUndefined();
    });

    it('AC-021: a done/ Baseline is Done without a plan and without a Clarified line', async () => {
        const project = await readMemory({ '.specs/done/0001-a.md': specText({ status: 'Baseline', plan: '_none_', origin: 'Reverse — Brownfield' }) });
        const entry = deriveLifecycle(project).entries[0];
        expect([entry.state, entry.rule]).toEqual(['Done', 'S-DONE']);
        expect(entry.diagnostics).toEqual([]);
    });

    it('AC-021: the fixture Baselines are all Done', async () => {
        const model = deriveLifecycle(await readFixture('fs180-de-baselines'));
        expect(model.entries.map((entry) => entry.state)).toEqual(['Done', 'Done', 'Done', 'Done']);
    });

    it('AC-001: the active/ entry with a status other than In Progress is not Review even with a Done plan (negative control)', async () => {
        const project = await readMemory({
            '.specs/active/0001-a.md': specText({ status: 'Draft', plan: LINKED }),
            '.specs/active/0001-a.plan.md': planText({ status: 'Done' }),
        });
        expect(deriveLifecycle(project).entries[0].state).toBe('Active');
    });
});

describe('deriveLifecycle: determinism', () => {
    const FILES = {
        '.specs/backlog/0001-a.md': specText({ plan: LINKED }),
        '.specs/backlog/0001-a.plan.md': planText(),
        '.specs/active/0002-b.md': specText({ status: 'Draft', plan: '_none yet_' }),
        '.specs/done/0003-c.md': specText({ status: 'Deprecated', plan: '_none yet_', extraHeader: '**Successor:** soon' }),
    };

    it('AC-010: deriving the same project twice gives deep-equal models', async () => {
        const project = await readMemory(FILES);
        expect(deriveLifecycle(project)).toEqual(deriveLifecycle(project));
    });

    it('AC-010: a fresh read of the same files with different timestamps gives a deep-equal model', async () => {
        const first = deriveLifecycle(await readMemory(FILES));
        const second = deriveLifecycle(await readMemory(FILES));
        expect(second).toEqual(first);
        expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    });

    it('AC-010: the model changes when a file content changes (negative control)', async () => {
        const first = deriveLifecycle(await readMemory(FILES));
        const second = deriveLifecycle(await readMemory({ ...FILES, '.specs/backlog/0001-a.plan.md': planText({ status: 'In Progress' }) }));
        expect(second).not.toEqual(first);
    });
});
