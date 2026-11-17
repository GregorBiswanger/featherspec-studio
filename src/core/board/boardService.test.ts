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
