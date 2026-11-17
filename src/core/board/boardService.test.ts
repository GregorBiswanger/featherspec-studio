import { afterEach, describe, expect, it } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import { specText } from '../lifecycle/testing/projects';
import type { BoardService } from './boardService';
import { createBoardWorld, modelOf, type BoardWorld } from './testing/boardWorld';

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
        expect(Object.keys(view).sort()).toEqual(['banner', 'columns', 'filter', 'noSpecs', 'sort']);
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
        w.service.setSort('lastChange');
        w.service.setFilter({ states: ['Active'] });
        w.source.set(await modelOf(NINE));
        await w.service.whenIdle();
        expect(w.service.view()!.filter).toEqual({ states: ['Active'] });
        expect(w.service.view()!.sort).toBe('lastChange');
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

    it('the focused key is remembered and cleared with the panel', async () => {
        const w = await world();
        w.service.setFocus('.specs/active/0010-act.md');
        expect(w.service.focused()).toBe('.specs/active/0010-act.md');
        w.service.panelClosed();
        expect(w.service.focused()).toBeNull();
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
        expect(view.kind === 'spec' && view.sections.overview.state).toBe('Active');
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
        expect(view.kind === 'spec' && view.sections.history.statusHistory?.map((item) => item.new)).toEqual(['Active']);
        w.history.view = { available: false, text: 'Status history not available: Another VS Code window holds the write lock for this project\'s status history.' };
        w.history.notify();
        await w.service.whenIdle();
        view = w.service.detail();
        expect(view.kind === 'spec' && view.sections.history.statusHistory).toBeUndefined();
        expect(view.kind === 'spec' && view.sections.history.notAvailable).toBe('Status history not available: Another VS Code window holds the write lock for this project\'s status history.');
    });
});
