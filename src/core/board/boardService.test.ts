import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { specText } from '../lifecycle/testing/projects';
import { readProject } from '../specs/readProject';
import { generateProject } from '../specs/testing/generateProject';
import type { BoardService } from './boardService';
import { createBoardWorld, createFakeStore, modelOf, run, type BoardWorld } from './testing/boardWorld';

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

    it('AC-007: a run notification updates the card; the store being unavailable shows "not available"', async () => {
        const w = await world();
        w.store.setRuns([run('r1', '0010-act')]);
        w.store.notify();
        await w.service.whenIdle();
        const card = w.service.view()!.columns.flatMap((column) => column.cards).find((entry) => entry.stem === '0010-act')!;
        expect(card.run).toEqual({ kind: 'run', provider: 'copilot', status: 'Running' });
        expect(w.service.view()!.providers).toEqual(['copilot']);
        w.store.setRuns(undefined);
        w.store.notify();
        await w.service.whenIdle();
        expect(w.service.view()!.columns.flatMap((column) => column.cards)[0]?.run).toEqual({ kind: 'unavailable' });
    });

    it('AC-007: without a store every card reads "Runs: not available"', async () => {
        const w = await world();
        w.setStore(undefined);
        w.source.set(await modelOf(NINE));
        await w.service.whenIdle();
        expect(w.service.view()!.columns.flatMap((column) => column.cards).every((card) => card.run.kind === 'unavailable')).toBe(true);
    });

    it('AC-019: the service follows the store that the session holds now (re-subscribed when it changes)', async () => {
        const w = await world();
        expect(w.store.subscribers()).toBe(1);
        const other = createFakeStore();
        w.setStore(other);
        w.source.set(await modelOf(NINE));
        await w.service.whenIdle();
        expect(w.store.subscribers()).toBe(0);
        expect(other.subscribers()).toBe(1);
        other.setRuns([run('r9', '0010-act', { status: 'Failed' })]);
        other.notify();
        await w.service.whenIdle();
        expect(JSON.stringify(w.service.view())).toContain('Failed');
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

describe('board service: freshness on 200 specs (AC-019, core part)', () => {
    let temp: string | undefined;
    afterEach(async () => {
        if (temp !== undefined) {
            await fs.rm(temp, { recursive: true, force: true });
        }
    });

    it('a model notification and a run notification reach the view in under 200 ms each', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'board-perf-'));
        await generateProject(temp, 200);
        const project = await readProject(createNodeSpecSource(), temp, '1.10.0');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const w = createBoardWorld(model);
        disposables.push(w.service);
        await w.service.whenIdle();
        expect(w.service.view()!.columns.flatMap((column) => column.cards)).toHaveLength(200);

        const next = { project: { ...project }, lifecycle: deriveLifecycle(project) };
        let start = performance.now();
        w.source.set(next);
        await w.service.whenIdle();
        expect(performance.now() - start).toBeLessThan(200);

        w.store.setRuns(Array.from({ length: 200 }, (_, index) => run(`r${index}`, `${String(index + 1).padStart(4, '0')}-generated-spec`)));
        start = performance.now();
        w.store.notify();
        await w.service.whenIdle();
        const elapsed = performance.now() - start;
        expect(w.service.view()!.providers).toEqual(['copilot']);
        expect(elapsed).toBeLessThan(200);
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

    it('AC-027: a run notification updates the detail history; an unavailable store shows not available', async () => {
        const w = await world();
        w.selection.set({ stem: '0010-act' });
        w.store.setRuns([run('r1', '0010-act')]);
        w.store.notify();
        await w.service.whenIdle();
        let view = w.service.detail();
        expect(view.kind === 'spec' && view.sections.history.runs?.map((item) => item.runId)).toEqual(['r1']);
        w.store.setRuns(undefined);
        w.store.notify();
        await w.service.whenIdle();
        view = w.service.detail();
        expect(view.kind === 'spec' && view.sections.history.runs).toBeUndefined();
    });
});
