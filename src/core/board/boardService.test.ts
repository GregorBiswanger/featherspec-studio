import { afterEach, describe, expect, it } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import { planText, specText } from '../lifecycle/testing/projects';
import { modelWithUnreadable } from '../planMap/testing/plans';
import { parseStepTipSettings } from '../settings/stepTipSettings';
import type { BoardService } from './boardService';
import { createBoardWorld, createFakeBoardMemory, modelOf, type BoardWorld } from './testing/boardWorld';

const NINE: Record<string, string> = {};
for (let number = 1; number <= 9; number += 1) {
    NINE[`.specs/backlog/000${number}-s${number}.md`] = specText();
}
NINE['.specs/active/0010-act.md'] = specText({ status: 'In Progress' });

const disposables: BoardService[] = [];
afterEach(() => disposables.splice(0).forEach((service) => service.dispose()));

async function world(files = NINE): Promise<BoardWorld> {
    const created = createBoardWorld(await modelOf(files));
    disposables.push(created.service);
    await created.service.whenIdle();
    return created;
}

function shown(w: BoardWorld): string[] {
    return w.service.view()!.columns.flatMap((column) => column.cards.map((card) => card.number));
}

describe('board service: view', () => {
    it('AC-001, AC-002: six columns with the cards of the model; no model gives no view', async () => {
        const w = await world();
        const view = w.service.view()!;
        expect(view.columns.map((column) => column.state)).toEqual(['Backlog', 'Ready', 'Active', 'Review', 'Done', 'Blocked']);
        expect(shown(w)).toHaveLength(10);
        expect(view.noSpecs).toBe(false);
        w.source.set(undefined);
        expect(w.service.view()).toBeUndefined();
    });

    it('AC-021: a project with no specs reports noSpecs', async () => {
        const w = await world({});
        expect(w.service.view()?.noSpecs).toBe(true);
    });

    it('0015 AC-011: no card and no board view carries a run line or a provider list', async () => {
        const w = await world();
        const view = w.service.view()!;
        expect(JSON.stringify(view)).not.toMatch(/"run"|"providers"/);
        expect(Object.keys(view).sort()).toEqual(['banner', 'columns', 'filter', 'noSpecs', 'planSpecs', 'sort', 'sortKeys']);
    });
});

describe('board service: filters and sort', () => {
    it('AC-022: a navigation filter replaces the filters set before and is shown as set', async () => {
        const w = await world();
        w.service.setFilter({ states: ['Backlog'] });
        w.service.applyNavigationFilter({ set: { label: 'Needs attention', stems: ['0001-s1', '0002-s2', '0003-s3'] } });
        const view = w.service.view()!;
        expect(view.filter).toEqual({ set: { label: 'Needs attention', stems: ['0001-s1', '0002-s2', '0003-s3'] } });
        expect(shown(w)).toEqual(['0001', '0002', '0003']);
    });

    it('AC-012: clear filters removes every filter and keeps the sort', async () => {
        const w = await world();
        w.service.setSort('title');
        w.service.setFilter({ states: ['Active'], set: { label: 'x', stems: ['0010-act'] } });
        w.service.clearFilters();
        expect(w.service.view()!.filter).toEqual({});
        expect(w.service.view()!.sort).toBe('title');
    });

    it('AC-023: filters and sort survive a rebuild of the model and a hidden panel', async () => {
        const w = await world();
        w.service.setSort('title');
        w.service.setFilter({ states: ['Active'] });
        w.source.set(await modelOf(NINE));
        await w.service.whenIdle();
        expect(w.service.view()!.filter).toEqual({ states: ['Active'] });
        expect(w.service.view()!.sort).toBe('title');
    });

    it('AC-023: a closed panel resets filters and sort', async () => {
        const w = await world();
        w.service.setSort('title');
        w.service.setFilter({ states: ['Active'] });
        w.service.panelClosed();
        expect(w.service.view()!.filter).toEqual({});
        expect(w.service.view()!.sort).toBe('number');
    });

    it('AC-023: a change of the project clears the filters and keeps the sort', async () => {
        const w = await world();
        w.service.setSort('title');
        w.service.setFilter({ states: ['Active'] });
        const other = await modelOf({ '.specs/backlog/0001-a.md': specText() });
        w.source.set({ ...other, project: { ...other.project, root: 'memory://other' } });
        await w.service.whenIdle();
        expect(w.service.view()!.filter).toEqual({});
        expect(w.service.view()!.sort).toBe('title');
    });

    it('AC-011: the lifecycle model is unchanged by every filter and sort call', async () => {
        const model = await modelOf(NINE);
        const w = createBoardWorld(model);
        disposables.push(w.service);
        const before = JSON.stringify(model.lifecycle);
        w.service.setFilter({ states: ['Active'] });
        w.service.setSort('title');
        w.service.applyNavigationFilter({ set: { label: 'x', stems: [] } });
        w.service.clearFilters();
        w.service.panelClosed();
        expect(JSON.stringify(model.lifecycle)).toBe(before);
        expect(w.source.current()).toBe(model);
    });

    it('a change notifies the listeners once; setting the same view again notifies nobody', async () => {
        const w = await world();
        const before = w.views.length;
        w.service.setSort('title');
        expect(w.views.length).toBe(before + 1);
        w.service.setSort('title');
        expect(w.views.length).toBe(before + 1);
    });
});

const WITH_DONE: Record<string, string> = {
    '.specs/backlog/0001-a.md': specText(),
    '.specs/done/0002-b.md': specText({ status: 'Baseline' }),
    '.specs/done/0003-c.md': specText({ status: 'Baseline' }),
};

function doneColumn(w: BoardWorld) {
    return w.service.view()!.columns.find((column) => column.state === 'Done')!;
}

describe('board service: Done collapsed and remembered', () => {
    it('AC-016: Done starts collapsed with its count and a Show toggle; no card of it is in the view', async () => {
        const w = await world(WITH_DONE);
        expect(doneColumn(w)).toMatchObject({ narrow: 'collapsed', count: 2, cards: [], hidden: 0 });
        expect(w.service.view()!.doneToggle).toBe('show');
        expect(shown(w)).toEqual(['0001']);
    });

    it('AC-016: a toggle expands Done and writes the choice to the memory; a second toggle collapses it', async () => {
        const w = await world(WITH_DONE);
        w.service.setDone(true);
        expect(doneColumn(w).narrow).toBeUndefined();
        expect(doneColumn(w).cards.map((entry) => entry.number)).toEqual(['0002', '0003']);
        expect(w.service.view()!.doneToggle).toBe('hide');
        expect(w.memory.writes).toEqual([{ v: 1, done: 'expanded' }]);
        w.service.setDone(false);
        expect(w.service.view()!.doneToggle).toBe('show');
        expect(w.memory.writes).toEqual([{ v: 1, done: 'expanded' }, { v: 1, done: 'collapsed' }]);
    });

    it('AC-016: nothing is written without a toggle', async () => {
        const w = await world(WITH_DONE);
        w.service.setSort('title');
        w.service.setFilter({ states: ['Done'] });
        w.service.clearFilters();
        w.service.panelClosed();
        expect(w.memory.writes).toEqual([]);
    });

    it('AC-016: a new service over the same memory (a restart) keeps the choice; a damaged memory reads collapsed', async () => {
        const memory = createFakeBoardMemory();
        const first = createBoardWorld(await modelOf(WITH_DONE), memory);
        disposables.push(first.service);
        first.service.setDone(true);
        const second = createBoardWorld(await modelOf(WITH_DONE), memory);
        disposables.push(second.service);
        await second.service.whenIdle();
        expect(doneColumn(second).cards).toHaveLength(2);
        const damaged = createBoardWorld(await modelOf(WITH_DONE), createFakeBoardMemory({ v: 9 }));
        disposables.push(damaged.service);
        expect(doneColumn(damaged).narrow).toBe('collapsed');
    });

    it('AC-016: a closed panel keeps the choice', async () => {
        const w = await world(WITH_DONE);
        w.service.setDone(true);
        w.service.panelClosed();
        expect(doneColumn(w).cards).toHaveLength(2);
        expect(w.service.view()!.doneToggle).toBe('hide');
    });

    it('AC-016: while a filter is set Done follows the filter rules and there is no toggle; Clear filters brings the choice back', async () => {
        const w = await world(WITH_DONE);
        w.service.setFilter({ states: ['Backlog'] });
        expect(doneColumn(w)).toMatchObject({ narrow: 'filtered', count: 0, hidden: 2 });
        expect(w.service.view()!.doneToggle).toBeUndefined();
        w.service.setFilter({ states: ['Done'] });
        expect(doneColumn(w).cards).toHaveLength(2);
        expect(w.service.view()!.doneToggle).toBeUndefined();
        w.service.clearFilters();
        expect(doneColumn(w).narrow).toBe('collapsed');
        expect(w.service.view()!.doneToggle).toBe('show');
    });

    it('AC-016: a project with no Done spec has no toggle, and Done is an empty strip', async () => {
        const w = await world();
        expect(w.service.view()!.doneToggle).toBeUndefined();
        expect(doneColumn(w).narrow).toBe('empty');
    });

    it('AC-016: when every spec is Done and Done is collapsed, the toggle is the only way in', async () => {
        const w = await world({ '.specs/done/0001-a.md': specText({ status: 'Baseline' }) });
        expect(w.service.view()!.doneToggle).toBe('show');
        expect(shown(w)).toEqual([]);
        expect(w.service.view()!.noSpecs).toBe(false);
    });
});

const LINKED_PLAN = (number: string, slug: string): string => `[${number}-${slug}.plan.md](${number}-${slug}.plan.md)`;

function dated(days: [string, string]): Record<string, string> {
    return {
        '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: LINKED_PLAN('0001', 'a') }),
        '.specs/active/0001-a.plan.md': planText({ status: 'In Progress', lastUpdated: days[0] }),
        '.specs/active/0002-b.md': specText({ status: 'In Progress', plan: LINKED_PLAN('0002', 'b') }),
        '.specs/active/0002-b.plan.md': planText({ status: 'In Progress', lastUpdated: days[1] }),
    };
}

describe('board service: the date of a card (L-3)', () => {
    it('AC-022: files with equal times (an in-memory project) give no date, only Number and Title, and a last-change sort becomes Number', async () => {
        const w = await world();
        const view = w.service.view()!;
        expect(view.columns.flatMap((column) => column.cards).every((entry) => entry.lastChange === undefined)).toBe(true);
        expect(view.sortKeys).toEqual(['number', 'title']);
        w.service.setSort('lastChange');
        expect(w.service.view()!.sort).toBe('number');
        w.service.setSort('title');
        expect(w.service.view()!.sort).toBe('title');
    });

    it('AC-022: one spec alone gives no date', async () => {
        const w = await world({ '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: LINKED_PLAN('0001', 'a') }), '.specs/active/0001-a.plan.md': planText({ status: 'In Progress', lastUpdated: '2026-11-10' }) });
        expect(w.service.view()!.columns.flatMap((column) => column.cards).map((entry) => entry.lastChange)).toEqual([undefined]);
        expect(w.service.view()!.sortKeys).toEqual(['number', 'title']);
    });

    it('AC-022: two plan dates that are the same day give no date either', async () => {
        const w = await world(dated(['2026-11-10', '2026-11-10 (stage 2)']));
        expect(w.service.view()!.sortKeys).toEqual(['number', 'title']);
    });

    it('AC-021, AC-023: two different days show the days, offer the third sort and order by the newest first', async () => {
        const w = await world(dated(['2026-11-10', '2026-11-12']));
        const view = w.service.view()!;
        expect(view.sortKeys).toEqual(['number', 'title', 'lastChange']);
        expect(view.columns.flatMap((column) => column.cards).map((entry) => [entry.number, entry.lastChange])).toEqual([
            ['0001', { day: '2026-11-10', source: 'plan' }],
            ['0002', { day: '2026-11-12', source: 'plan' }],
        ]);
        w.service.setSort('lastChange');
        expect(w.service.view()!.sort).toBe('lastChange');
        expect(shown(w)).toEqual(['0002', '0001']);
    });

    it('AC-022: when the dates become equal the sort falls back to Number and stays there', async () => {
        const w = await world(dated(['2026-11-10', '2026-11-12']));
        w.service.setSort('lastChange');
        w.source.set(await modelOf(dated(['2026-11-12', '2026-11-12'])));
        await w.service.whenIdle();
        expect(w.service.view()!.sort).toBe('number');
        w.source.set(await modelOf(dated(['2026-11-10', '2026-11-12'])));
        await w.service.whenIdle();
        expect(w.service.view()!.sort).toBe('number');
    });
});

describe('board service: spec detail', () => {
    it('AC-008, AC-028: the detail follows the selection, and no selection gives no content', async () => {
        const w = await world();
        expect(w.service.detail()).toEqual({ kind: 'none' });
        const seen: string[] = [];
        w.service.onDidChangeDetail((view) => seen.push(view.kind === 'spec' ? view.stem : view.kind));
        w.selection.set({ stem: '0010-act' });
        await w.service.whenIdle();
        expect(w.service.detail().kind).toBe('spec');
        expect(seen).toEqual(['0010-act']);
        w.selection.set(undefined);
        await w.service.whenIdle();
        expect(seen).toEqual(['0010-act', 'none']);
    });

    it('AC-028: a folder move keeps the detail of the selected stem', async () => {
        const w = await world({ '.specs/backlog/0001-a.md': specText() });
        w.selection.set({ stem: '0001-a' });
        await w.service.whenIdle();
        w.source.set(await modelOf({ '.specs/active/0001-a.md': specText({ status: 'In Progress' }) }));
        await w.service.whenIdle();
        const view = w.service.detail();
        expect(view.kind === 'spec' && view.state).toBe('Active');
    });

    it('0015 AC-012: a status history notification updates the detail; an unavailable history shows not available with its reason', async () => {
        const w = await world();
        w.selection.set({ stem: '0010-act' });
        await w.service.whenIdle();
        w.history.view = {
            available: true,
            label: 'Observed by Studio while it was running — not a reconstruction',
            entries: [{ observedAt: '2026-11-16T09:00:00Z', stem: '0010-act', old: 'Ready', new: 'Active', rule: 'S-ACTIVE', cause: { kind: 'first-observed' }, flow: 'not checked' }],
        };
        w.history.notify();
        await w.service.whenIdle();
        let view = w.service.detail();
        expect(view.kind === 'spec' && view.history.statusHistory?.map((item) => item.new)).toEqual(['Active']);
        w.history.view = { available: false, text: 'Status history not available: Another VS Code window holds the write lock for this project\'s status history.' };
        w.history.notify();
        await w.service.whenIdle();
        view = w.service.detail();
        expect(view.kind === 'spec' && view.history.statusHistory).toBeUndefined();
        expect(view.kind === 'spec' && view.history.notAvailable).toBe('Status history not available: Another VS Code window holds the write lock for this project\'s status history.');
    });
});

describe('0021 AC-011, AC-010: a settings change reaches the detail', () => {
    function tipsOf(w: BoardWorld): { coach: string; about: string[] } | undefined {
        const view = w.service.detail();
        return view.kind === 'spec' && 'tips' in view.nextStep ? view.nextStep.tips : undefined;
    }

    it('turning the tips on adds the coach line to the open detail, turning them off removes it; the selection stays', async () => {
        const w = await world();
        w.selection.set({ stem: '0010-act' });
        await w.service.whenIdle();
        expect(tipsOf(w)).toBeUndefined();
        const seen: string[] = [];
        w.service.onDidChangeDetail((view) => seen.push(view.kind === 'spec' ? `${view.stem}:${tipsOf(w)?.coach ?? 'none'}` : view.kind));
        w.tips.set(parseStepTipSettings(true, {}));
        await w.service.whenIdle();
        expect(tipsOf(w)?.coach).toBe('any chat · fast model');
        w.tips.set(parseStepTipSettings(false, {}));
        await w.service.whenIdle();
        expect(tipsOf(w)).toBeUndefined();
        expect(w.service.detail().kind === 'spec' && w.service.detail().kind).toBe('spec');
        expect(seen).toHaveLength(2);
    });

    it('a hint change re-emits the detail with the hint in the coach line; an unchanged setting emits nothing', async () => {
        const w = await world();
        w.selection.set({ stem: '0010-act' });
        w.tips.set(parseStepTipSettings(true, {}));
        await w.service.whenIdle();
        let emitted = 0;
        w.service.onDidChangeDetail(() => (emitted += 1));
        w.tips.set(parseStepTipSettings(true, { fast: 'Y' }));
        await w.service.whenIdle();
        expect(tipsOf(w)?.coach).toBe('any chat · fast model (Y)');
        expect(emitted).toBe(1);
        w.tips.set(parseStepTipSettings(true, { fast: 'Y' }));
        await w.service.whenIdle();
        expect(emitted).toBe(1);
    });

    it('the Board view is not rebuilt by a settings change', async () => {
        const w = await world();
        const before = JSON.stringify(w.service.view());
        w.tips.set(parseStepTipSettings(true, { fast: 'Y' }));
        await w.service.whenIdle();
        expect(JSON.stringify(w.service.view())).toBe(before);
    });
});

describe('0024 AC-010: an offer change reaches the detail', () => {
    function sendOf(w: BoardWorld): unknown {
        const view = w.service.detail();
        return view.kind === 'spec' && 'send' in view.nextStep ? view.nextStep.send : undefined;
    }

    it('choosing an assistant adds the send view to the open detail, a change of assistant replaces it, removing it takes it away; the selection stays', async () => {
        const w = await world();
        w.selection.set({ stem: '0010-act' });
        await w.service.whenIdle();
        expect(sendOf(w)).toBeUndefined();
        const seen: string[] = [];
        w.service.onDidChangeDetail((view) => seen.push(view.kind === 'spec' ? view.stem : view.kind));
        w.assistant.set({ assistant: 'copilot' });
        await w.service.whenIdle();
        expect(sendOf(w)).toEqual({ assistant: 'copilot', target: 'current', targets: ['new', 'current'] });
        w.assistant.set({ assistant: 'claudeCode' });
        await w.service.whenIdle();
        expect(sendOf(w)).toEqual({ assistant: 'claudeCode', target: 'new', targets: ['new'] });
        w.assistant.set(undefined);
        await w.service.whenIdle();
        expect(sendOf(w)).toBeUndefined();
        expect(seen).toEqual(['0010-act', '0010-act', '0010-act']);
        expect(w.service.detail().kind).toBe('spec');
    });

    it('an extension that arrives or goes changes the offer; an unchanged offer emits nothing; the Board view is not rebuilt', async () => {
        const w = await world();
        w.selection.set({ stem: '0010-act' });
        w.assistant.choose('copilot');
        await w.service.whenIdle();
        expect(sendOf(w)).toBeUndefined();
        let emitted = 0;
        w.service.onDidChangeDetail(() => (emitted += 1));
        const board = JSON.stringify(w.service.view());
        w.assistant.install('copilot');
        await w.service.whenIdle();
        expect(sendOf(w)).toMatchObject({ assistant: 'copilot' });
        expect(emitted).toBe(1);
        w.assistant.choose('copilot');
        await w.service.whenIdle();
        expect(emitted).toBe(1);
        w.assistant.uninstall('copilot');
        await w.service.whenIdle();
        expect(sendOf(w)).toBeUndefined();
        expect(emitted).toBe(2);
        expect(JSON.stringify(w.service.view())).toBe(board);
    });
});

describe('0023 AC-003: the board view lists the specs that have a plan for the Plan map', () => {
    const link = (stem: string) => `[${stem}.plan.md](${stem}.plan.md)`;
    const files = (): Record<string, string> => ({
        '.specs/active/0005-blocked.md': specText({ status: 'In Progress', plan: link('0005-blocked') }),
        '.specs/active/0005-blocked.plan.md': planText({ status: 'Blocked' }),
        '.specs/active/0003-active.md': specText({ status: 'In Progress', plan: link('0003-active') }),
        '.specs/active/0003-active.plan.md': planText({ status: 'In Progress' }),
        '.specs/active/0002-review.md': specText({ status: 'In Progress', plan: link('0002-review') }),
        '.specs/active/0002-review.plan.md': planText({ status: 'Done' }),
        '.specs/backlog/0004-ready.md': specText({ plan: link('0004-ready') }),
        '.specs/backlog/0004-ready.plan.md': planText({ status: 'Not started' }),
        '.specs/backlog/0001-backlog.md': specText({ plan: link('0001-backlog') }),
        '.specs/backlog/0001-backlog.plan.md': planText({ status: 'In Progress' }),
        '.specs/backlog/0009-no-plan.md': specText(),
        '.specs/done/0006-done.md': specText({ status: 'Implemented', plan: '[0006-done.2026-11-01.plan.md](../plan-archive/0006-done.2026-11-01.plan.md)' }),
        '.specs/plan-archive/0006-done.2026-11-01.plan.md': planText({ status: 'Done' }),
    });

    it('In progress (Blocked, Review, Active), then Ready, then Backlog, by number inside; Done and a spec without a plan are left out', async () => {
        const w = await world(files());
        expect(w.service.view()!.planSpecs.map((item) => item.number)).toEqual(['0005', '0002', '0003', '0004', '0001']);
        expect(w.service.view()!.planSpecs[0]).toEqual({ stem: '0005-blocked', number: '0005', title: 'Spec', problems: [] });
    });

    it('a spec with an unreadable plan is left out', async () => {
        const all = files();
        const model = await modelWithUnreadable(all, ['.specs/active/0003-active.plan.md']);
        const created = createBoardWorld(model);
        disposables.push(created.service);
        await created.service.whenIdle();
        expect(created.service.view()!.planSpecs.map((item) => item.number)).toEqual(['0005', '0002', '0004', '0001']);
    });

    it('a Problem of the spec shows as its sentence and reason, the same as the detail gives', async () => {
        const all = { ...files(), '.specs/active/0003-active.md': specText({ status: 'Draft', plan: link('0003-active') }) };
        const w = await world(all);
        const item = w.service.view()!.planSpecs.find((candidate) => candidate.number === '0003')!;
        expect(item.problems.length).toBeGreaterThan(0);
        w.selection.set({ stem: '0003-active' });
        await w.service.whenIdle();
        const detail = w.service.detail();
        expect(detail.kind === 'spec' ? detail.problems.map((problem) => ({ sentence: problem.sentence, reason: problem.reason })) : []).toEqual(item.problems);
    });

    it('the plan of the detail follows the selection', async () => {
        const w = await world(files());
        expect('plan' in (w.service.detail() as object)).toBe(false);
        w.selection.set({ stem: '0003-active' });
        await w.service.whenIdle();
        const first = w.service.detail();
        expect(first.kind === 'spec' ? first.plan?.kind : undefined).toBe('plan');
        w.selection.set({ stem: '0009-no-plan' });
        await w.service.whenIdle();
        const second = w.service.detail();
        expect(second.kind === 'spec' && 'plan' in second).toBe(false);
    });
});
