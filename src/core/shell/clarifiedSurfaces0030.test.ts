import { afterEach, describe, expect, it } from 'vitest';
import { createHandOverWorld, projectOf, type HandOverWorld } from '../assistant/testing/handOverWorld';
import { buildCards } from '../board/cards';
import { buildDetail } from '../board/detail';
import { arrangeBoard } from '../board/filters';
import { createCopyNextStep } from '../copyNextStep/copyNextStep';
import { createEntryWorld, type EntryWorld } from '../copyNextStep/testing/entryWorld';
import { specText } from '../lifecycle/testing/projects';
import { buildOverviewView } from '../overview/overviewView';
import type { ShellModel } from '../ports/shell';
import { buildSpecTree, type SpecRowModel } from './specTree';

const KEY = '.specs/backlog/0007-x.md';
const STEM = '0007-x';
const START = { modifiedMs: 1_000, size: 100 };
const HISTORY = { available: true as const, label: 'Observed', entries: [] };

let entryWorld: EntryWorld | undefined;

afterEach(() => entryWorld?.dispose());

async function clarified(): Promise<{ world: HandOverWorld; model: ShellModel }> {
    const world = createHandOverWorld(await projectOf({ [KEY]: specText() }, START));
    await world.handOvers.begin(`/sdd-clarify ${KEY}`)?.commit();
    world.repository.set(await projectOf({ [KEY]: specText() }, { modifiedMs: 5_000, size: 180 }));
    return { world, model: world.source.current()! };
}

function surfaces(model: ShellModel): { detail: string; card: string; row: SpecRowModel; all: string } {
    const detail = buildDetail({ selection: { stem: STEM, path: KEY }, model, history: HISTORY });
    const overview = buildOverviewView({ model, history: HISTORY });
    const cards = buildCards(model.project, model.lifecycle, model.handOvers);
    const columns = arrangeBoard(cards, {}, 'number');
    const tree = buildSpecTree({ projectActive: true, projectName: 'demo', projectCount: 1, state: undefined, model });
    const row = tree.items.flatMap((item) => (item.kind === 'group' ? item.children : [])).find((candidate) => candidate.specKey === KEY)!;
    return {
        detail: JSON.stringify(detail),
        card: JSON.stringify(cards.find((card) => card.key === KEY)),
        row,
        all: JSON.stringify({ detail, overview, columns, tree }),
    };
}

describe('0030 AC-002: a clarified spec shows the plan step and no /sdd-clarify on every surface', () => {
    it('0030 AC-002 detail, first Now row, Board card, tree row and Copy next step', async () => {
        const { model } = await clarified();
        const shown = surfaces(model);
        expect(shown.detail).toContain('Write the plan');
        expect(shown.detail).toContain(`/sdd-plan ${KEY}`);
        expect(shown.card).toContain('/sdd-plan');
        expect(shown.row.description).toBe('/sdd-plan');
        expect(shown.row.tooltip).toContain('/sdd-plan');
        expect(shown.all).not.toContain('/sdd-clarify');
        entryWorld = createEntryWorld();
        entryWorld.setModel(model);
        entryWorld.setProjects([{ name: 'proj', root: model.project.root }], 'proj');
        const written: string[] = [];
        const copy = createCopyNextStep({
            entry: entryWorld.entry,
            clipboard: { writeText: async (text) => void written.push(text) },
            ui: { pick: async () => undefined, inform: async () => undefined, warn: () => undefined },
            actions: { selectProject: async () => undefined, openStudio: async () => undefined },
        });
        entryWorld.select({ stem: STEM, path: KEY });
        await copy.run();
        expect(written).toEqual([`/sdd-plan ${KEY}`]);
    });

    it('0030 AC-002 before the challenge changes the file the surfaces still offer /sdd-clarify', async () => {
        const world = createHandOverWorld(await projectOf({ [KEY]: specText() }, START));
        await world.handOvers.begin(`/sdd-clarify ${KEY}`)?.commit();
        expect(surfaces(world.source.current()!).all).toContain('/sdd-clarify');
    });
});

describe('0030 AC-004: the memory never shows a message', () => {
    it('0030 AC-004 a spec moved to a new key has no entry and keeps the challenge line', async () => {
        const { world } = await clarified();
        const moved = '.specs/backlog/0008-x.md';
        world.repository.set(await projectOf({ [moved]: specText() }, { modifiedMs: 7_000, size: 190 }));
        const model = world.source.current()!;
        const detail = JSON.stringify(buildDetail({ selection: { stem: '0008-x', path: moved }, model, history: HISTORY }));
        expect(detail).toContain(`/sdd-clarify ${moved}`);
        expect(model.project.diagnostics).toEqual([]);
    });
});
