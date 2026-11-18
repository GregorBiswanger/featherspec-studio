import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { createOpenFile } from '../board/openFile';
import { createModelSource } from './modelSource';
import { createFakeSource, modelOf } from '../board/testing/boardWorld';
import { fixturePath } from '../discovery/testing/fixtures';
import { snapshotTree } from '../discovery/testing/snapshotTree';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import type { EditorPort, OpenPlace } from '../ports/board';
import type { NavigationTarget } from '../../shared/protocol/messages';
import type { StudioPanelPort } from '../ports/shell';
import { readProject } from '../specs/readProject';
import { createTreeActions, type TreeActions } from './treeActions';
import { addProject, createShellWorld, SPEC_HEADER, type ShellWorld } from './testing/world';
import { buildSpecTree, type GroupModel, type SpecRowModel } from './specTree';

let world: ShellWorld | undefined;
let temp: string | undefined;

afterEach(async () => {
    world?.dispose();
    world = undefined;
    if (temp !== undefined) {
        await fs.rm(temp, { recursive: true, force: true });
        temp = undefined;
    }
});

interface Fakes {
    shown: Array<{ preserveFocus?: boolean } | undefined>;
    open: boolean;
    copied: string[];
    warned: string[];
    opened: Array<{ key: string; line: number | undefined; place: OpenPlace | undefined }>;
    outcome: 'opened' | 'not-found';
}

async function ready(files: Record<string, string>, memory?: unknown): Promise<{ actions: TreeActions; fakes: Fakes; world: ShellWorld }> {
    world = createShellWorld(memory === undefined ? {} : { memory });
    addProject(world, 'proj', files);
    await world.controller.start();
    await world.settle();
    const fakes: Fakes = { shown: [], open: false, copied: [], warned: [], opened: [], outcome: 'opened' };
    const panel: StudioPanelPort = {
        isOpen: () => fakes.open,
        show(options) {
            fakes.shown.push(options);
            fakes.open = true;
        },
    };
    const editor: EditorPort = {
        async open(_root, key, line, place) {
            fakes.opened.push({ key, line, place });
            return fakes.outcome;
        },
    };
    const actions = createTreeActions({
        shell: world.service,
        panel,
        copy: async (line) => void fakes.copied.push(line),
        openFile: createOpenFile({ source: createModelSource(world.repository), editor }),
        warn: (text) => void fakes.warned.push(text),
    });
    return { actions, fakes, world };
}

describe('0020 AC-009: select from a row (core part)', () => {
    it('with the panel open on Board: the spec is selected, the area is kept, the panel is shown without taking the focus', async () => {
        const current = await ready({ '.specs/active/0001-a.md': SPEC_HEADER('In Progress') });
        current.fakes.open = true;
        await current.world.service.handlers.navigate({ area: 'board' });
        current.actions.select({ stem: '0001-a' });
        expect(current.world.service.view().selection?.stem).toBe('0001-a');
        expect(current.world.service.view().area).toBe('board');
        expect(current.fakes.shown).toEqual([{ preserveFocus: true }]);
    });

    it('with the panel closed: it opens on the remembered start area, else Overview, with that spec selected', async () => {
        const remembered = await ready({ '.specs/active/0001-a.md': SPEC_HEADER('In Progress') }, { v: 1, area: 'board' });
        remembered.actions.select({ stem: '0001-a' });
        expect(remembered.world.service.view().area).toBe('board');
        expect(remembered.world.service.view().selection?.stem).toBe('0001-a');
        expect(remembered.fakes.shown).toEqual([{ preserveFocus: true }]);
        remembered.world.dispose();

        const fresh = await ready({ '.specs/active/0001-a.md': SPEC_HEADER('In Progress') });
        fresh.actions.select({ stem: '0001-a' });
        expect(fresh.world.service.view().area).toBe('overview');
        expect(fresh.fakes.shown).toEqual([{ preserveFocus: true }]);
    });

    it('a row reopens a closed panel through the start path: a navigation target set before it closed is gone, while an open panel keeps it', async () => {
        const target: NavigationTarget = { kind: 'boardFilter', filter: { states: ['Active'] } };
        const current = await ready({ '.specs/active/0001-a.md': SPEC_HEADER('In Progress') });
        current.fakes.open = true;
        await current.world.service.handlers.navigate({ area: 'board', target });
        current.actions.select({ stem: '0001-a' });
        expect(current.world.service.view().target).toEqual(target);
        current.fakes.open = false;
        current.actions.select({ stem: '0001-a' });
        expect(current.world.service.view().target).toBeUndefined();
        expect(current.world.service.view().area).toBe('board');
        expect(current.world.service.view().selection?.stem).toBe('0001-a');
    });

    it('a stem that is gone gives the notice of 0005 BR-03 and no selection', async () => {
        const current = await ready({ '.specs/active/0001-a.md': SPEC_HEADER('In Progress') });
        current.actions.select({ stem: '0009-gone' });
        expect(current.world.service.view().notice).toEqual({ number: '0009' });
        expect(current.world.service.view().selection).toBeUndefined();
    });

    it('a duplicated stem is selected by its path', async () => {
        const current = await ready({ '.specs/backlog/0008-twin.md': SPEC_HEADER('Draft'), '.specs/active/0008-twin.md': SPEC_HEADER('In Progress') });
        current.actions.select({ stem: '0008-twin', path: '.specs/active/0008-twin.md' });
        expect(current.world.service.view().selection).toMatchObject({ stem: '0008-twin', path: '.specs/active/0008-twin.md' });
    });
});

describe('0020 AC-007: copy from a row', () => {
    it('copies the first line through the copy dependency and selects nothing', async () => {
        const current = await ready({ '.specs/active/0001-a.md': SPEC_HEADER('In Progress') });
        await current.actions.copy({ line: '/sdd-plan .specs/active/0001-a.md' });
        expect(current.fakes.copied).toEqual(['/sdd-plan .specs/active/0001-a.md']);
        expect(current.world.service.view().selection).toBeUndefined();
        expect(current.fakes.shown).toEqual([]);
    });

    it('a row without a line copies nothing', async () => {
        const current = await ready({ '.specs/active/0001-a.md': SPEC_HEADER('In Progress') });
        await current.actions.copy({});
        expect(current.fakes.copied).toEqual([]);
    });
});

describe('0020 AC-008: Open Spec and Open Plan', () => {
    it('open the file at line 1 in the active group and leave the panel and the selection alone', async () => {
        const current = await ready({ '.specs/active/0001-a.md': SPEC_HEADER('In Progress') });
        await current.actions.open({ specKey: '.specs/active/0001-a.md', planKey: undefined }, 'spec');
        expect(current.fakes.opened).toEqual([{ key: '.specs/active/0001-a.md', line: 1, place: 'activeGroup' }]);
        expect(current.fakes.shown).toEqual([]);
        expect(current.world.service.view().selection).toBeUndefined();
    });

    it('Open Plan opens the plan in use; a row without a plan opens nothing', async () => {
        const current = await ready({ '.specs/active/0001-a.md': SPEC_HEADER('In Progress'), '.specs/active/0001-a.plan.md': '# Plan\n\n**Status:** In Progress\n' });
        await current.actions.open({ specKey: '.specs/active/0001-a.md', planKey: '.specs/active/0001-a.plan.md' }, 'plan');
        await current.actions.open({ specKey: '.specs/active/0001-a.md', planKey: undefined }, 'plan');
        expect(current.fakes.opened).toEqual([{ key: '.specs/active/0001-a.plan.md', line: 1, place: 'activeGroup' }]);
    });

    it('a gone file and a refused key show File not found: <path> and open nothing more', async () => {
        const current = await ready({ '.specs/active/0001-a.md': SPEC_HEADER('In Progress') });
        current.fakes.outcome = 'not-found';
        await current.actions.open({ specKey: '.specs/active/0001-a.md', planKey: undefined }, 'spec');
        await current.actions.open({ specKey: '.specs/active/9999-none.md', planKey: undefined }, 'spec');
        expect(current.fakes.warned).toEqual(['File not found: .specs/active/0001-a.md', 'File not found: .specs/active/9999-none.md']);
    });
});

describe('0020 AC-014: the tree and its actions write no file', () => {
    it('on a temp copy of studio-0015 with untrusted fakes, every action leaves the snapshot unchanged', async () => {
        temp = await fs.mkdtemp(path.join(os.tmpdir(), 'tree-nowrite-'));
        await fs.cp(fixturePath('studio-0015'), temp, { recursive: true });
        const project = await readProject(createNodeSpecSource(), temp, '1.10.0');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const before = await snapshotTree(temp);
        const tree = buildSpecTree({ projectActive: true, projectName: 'x', projectCount: 1, state: undefined, model });
        const row = (tree.items[0] as GroupModel).children[0] as SpecRowModel;
        const opened: string[] = [];
        const source = createFakeSource(model);
        const openFile = createOpenFile({ source, editor: { open: async (_root, key) => (opened.push(key), 'opened') } });
        const selected: string[] = [];
        const actions = createTreeActions({
            shell: { open: () => undefined, select: (reference) => void selected.push(reference?.stem ?? '') },
            panel: { isOpen: () => false, show: () => undefined },
            copy: async () => undefined,
            openFile,
            warn: () => undefined,
        });
        actions.select({ stem: row.stem });
        await actions.copy(row);
        await actions.open(row, 'spec');
        await actions.open(row, 'plan');
        expect(selected).toEqual([row.stem]);
        expect(opened).toEqual([row.specKey, row.planKey]);
        expect(await snapshotTree(temp)).toEqual(before);
    });
});
