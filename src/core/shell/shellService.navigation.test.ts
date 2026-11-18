import { afterEach, describe, expect, it } from 'vitest';
import { addProject, createShellWorld, SPEC_HEADER, type ShellWorld } from './testing/world';

let world: ShellWorld | undefined;

afterEach(() => {
    world?.dispose();
    world = undefined;
});

const FILES = {
    '.specs/backlog/0003-x.md': SPEC_HEADER('Draft', 'Spec three'),
    '.specs/active/0002-b.md': SPEC_HEADER('In Progress', 'Spec two'),
};

async function ready(options: Parameters<typeof createShellWorld>[0] = {}, files: Record<string, string> = FILES): Promise<ShellWorld> {
    world = createShellWorld(options);
    addProject(world, 'proj', files);
    await world.controller.start();
    await world.settle();
    return world;
}

describe('BR-02, AC-009: start area and memory', () => {
    it('0018 AC-002: the first open in a workspace shows the Overview', async () => {
        const current = await ready();
        current.service.open({ via: 'start' });
        expect(current.service.view().area).toBe('overview');
    });

    it('every change of area is remembered; a restart with that memory starts on the remembered area', async () => {
        const current = await ready();
        await current.service.handlers.navigate({ area: 'board' });
        expect(current.memory.value).toEqual({ v: 1, area: 'board' });
        const second = current.restart();
        second.open({ via: 'start' });
        expect(second.view().area).toBe('board');
    });

    it('Open and Open Studio (start) show the remembered area, a per-area open shows the named area and remembers it', async () => {
        const current = await ready({ memory: { v: 1, area: 'board' } });
        current.service.open({ via: 'start' });
        expect(current.service.view().area).toBe('board');
        current.service.open({ via: 'area', area: 'overview' });
        expect(current.service.view().area).toBe('overview');
        expect((current.memory.value as { area: string }).area).toBe('overview');
    });

    it.each([
        ['an unknown area', { v: 1, area: 'settings' }],
        ['the removed area agentCenter', { v: 1, area: 'agentCenter' }],
        ['another version', { v: 9, area: 'board' }],
        ['garbage', 'board'],
        ['a damaged selection', { v: 1, area: 'board', selection: { stem: 4 } }],
    ])('a damaged remembered value (%s) gives the Overview and no selection', async (_name, memory) => {
        const current = await ready({ memory });
        current.service.open({ via: 'start' });
        expect(current.service.view().area).toBe('overview');
        expect(current.service.view().selection).toBeUndefined();
    });
});

describe('0018 AC-002: remembered state of earlier versions', () => {
    const SELECTION = { projectRoot: 'proj', stem: '0003-x' };

    it.each([
        ['missionControl'],
        ['specBoard'],
    ])('the remembered area %s with a selection shows the Overview with no selection', async (area) => {
        const current = await ready({ memory: { v: 1, area, selection: SELECTION } });
        current.service.open({ via: 'start' });
        expect(current.service.view().area).toBe('overview');
        expect(current.service.view().selection).toBeUndefined();
        expect(current.service.view().selection).toBeUndefined();
    });

    it('control: the remembered area board keeps its selection', async () => {
        const current = await ready({ memory: { v: 1, area: 'board', selection: SELECTION } });
        current.service.open({ via: 'start' });
        expect(current.service.view().area).toBe('board');
        expect(current.service.view().selection?.stem).toBe('0003-x');
    });
});

describe('AC-008, AC-009: selection', () => {
    it('selecting a spec marks it, and changing areas by hand never changes it', async () => {
        const current = await ready();
        await current.service.handlers.select({ stem: '0003-x' });
        expect(current.service.view().selection).toEqual({ stem: '0003-x', number: '0003' });
        expect(current.service.view().selection?.stem).toBe('0003-x');
        await current.service.handlers.navigate({ area: 'board' });
        await current.service.handlers.navigate({ area: 'overview' });
        expect(current.service.view().selection?.stem).toBe('0003-x');
        expect(current.service.view().selection?.stem).toBe('0003-x');
    });

    it('0019 AC-003: clearSelection removes the selection, the marked row and the remembered value, and keeps the area', async () => {
        const current = await ready();
        await current.service.handlers.select({ stem: '0003-x' });
        await current.service.handlers.navigate({ area: 'board' });
        await current.service.handlers.clearSelection({});
        expect(current.service.view().selection).toBeUndefined();
        expect(current.service.view().selection).toBeUndefined();
        expect(current.service.view().area).toBe('board');
        expect((current.memory.value as { selection?: unknown }).selection).toBeUndefined();
    });

    it('the selection is remembered with the project root and survives a restart with the same project', async () => {
        const current = await ready();
        await current.service.handlers.select({ stem: '0003-x' });
        expect(current.memory.value).toMatchObject({ v: 1, selection: { projectRoot: 'proj', stem: '0003-x' } });
        const second = current.restart();
        expect(second.view().selection?.stem).toBe('0003-x');
    });


    it('selecting a stem that is not in the project keeps the selection and shows the notice (control: a known stem has none)', async () => {
        const current = await ready();
        await current.service.handlers.select({ stem: '0002-b' });
        await current.service.handlers.select({ stem: '0009-nope' });
        expect(current.service.view().selection?.stem).toBe('0002-b');
        expect(current.service.view().notice).toEqual({ number: '0009' });
        await current.service.handlers.select({ stem: '0003-x' });
        expect(current.service.view().notice).toBeUndefined();
    });
});

describe('AC-010: clearing', () => {
    it('Given spec 0003 is selected When its file is deleted outside VS Code Then no spec is selected and the notice names 0003', async () => {
        const current = await ready();
        await current.service.handlers.select({ stem: '0003-x' });
        current.specs.remove('proj', '.specs/backlog/0003-x.md');
        await current.repository.rescan();
        expect(current.service.view().selection).toBeUndefined();
        expect(current.service.view().notice).toEqual({ number: '0003' });
        expect(current.memory.value).toEqual({ v: 1, area: 'overview' });
    });

    it('Given spec 0003 in backlog is selected When its file moves to active Then 0003 is still selected', async () => {
        const current = await ready();
        await current.service.handlers.select({ stem: '0003-x' });
        current.specs.move('proj', '.specs/backlog/0003-x.md', '.specs/active/0003-x.md');
        await current.repository.rescan();
        expect(current.service.view().selection?.stem).toBe('0003-x');
        expect(current.service.view().notice).toBeUndefined();
        expect(current.service.view().selection).toEqual({ stem: '0003-x', number: '0003' });
    });

    it('the notice stays until dismissed, and Dismiss clears it', async () => {
        const current = await ready();
        await current.service.handlers.select({ stem: '0003-x' });
        current.specs.remove('proj', '.specs/backlog/0003-x.md');
        await current.repository.rescan();
        await current.controller.refresh();
        await current.settle();
        expect(current.service.view().notice).toEqual({ number: '0003' });
        await current.service.handlers.dismissNotice({});
        expect(current.service.view().notice).toBeUndefined();
    });

    it('a stale selection found at the next load is cleared with the notice (the file went away while closed)', async () => {
        const current = await ready();
        await current.service.handlers.select({ stem: '0003-x' });
        current.dispose();
        const files = { '.specs/active/0002-b.md': SPEC_HEADER('In Progress', 'Spec two') };
        const next = createShellWorld({ memory: current.memory.value });
        world = next;
        addProject(next, 'proj', files);
        await next.controller.start();
        await next.settle();
        expect(next.service.view().selection).toBeUndefined();
        expect(next.service.view().notice).toEqual({ number: '0003' });
    });

    it('another project becoming active clears the selection without a notice, and the area stays', async () => {
        world = createShellWorld({ roots: ['a', 'b'] });
        addProject(world, 'a', { '.specs/active/0002-b.md': SPEC_HEADER('In Progress') });
        addProject(world, 'b', { '.specs/active/0002-b.md': SPEC_HEADER('In Progress') });
        world.host.ui.pickAnswer = () => 'a';
        await world.controller.start();
        await world.service.runAction('selectProject');
        await world.settle();
        await world.service.handlers.navigate({ area: 'board' });
        await world.service.handlers.select({ stem: '0002-b' });
        expect(world.service.view().selection?.stem).toBe('0002-b');
        world.host.ui.pickAnswer = () => 'b';
        await world.service.runAction('selectProject');
        await world.settle();
        expect(world.service.view().selection).toBeUndefined();
        expect(world.service.view().notice).toBeUndefined();
        expect(world.service.view().area).toBe('board');
    });

    it('a project that is lost and returns keeps its selection (no model is loaded in between)', async () => {
        const current = await ready();
        await current.service.handlers.select({ stem: '0003-x' });
        current.discoveryFs.remove('proj', 'AGENTS.md');
        await current.controller.refresh();
        await current.settle();
        expect(current.controller.snapshot().active).toBeUndefined();
        expect(current.service.view().notice).toBeUndefined();
        current.discoveryFs.setFile('proj', 'AGENTS.md', 'FeatherSpecVersion: 1.10.0\n');
        await current.controller.refresh();
        await current.settle();
        expect(current.service.view().selection?.stem).toBe('0003-x');
        expect(current.service.view().notice).toBeUndefined();
    });
});

describe('AC-028: the navigation request (BR-07)', () => {
    it('Given Overview is shown and spec 0003-x exists When the request "Board, spec 0003-x" arrives Then Board is shown and 0003 is selected', async () => {
        const current = await ready();
        expect(current.service.view().area).toBe('overview');
        await current.service.handlers.navigate({ area: 'board', target: { kind: 'spec', stem: '0003-x' } });
        expect(current.service.view().area).toBe('board');
        expect(current.service.view().selection?.stem).toBe('0003-x');
        expect(current.service.view().target).toEqual({ kind: 'spec', stem: '0003-x' });
    });

    it('a spec target whose stem is not in the project keeps area and selection and shows the notice', async () => {
        const current = await ready();
        await current.service.handlers.select({ stem: '0002-b' });
        await current.service.handlers.navigate({ area: 'board', target: { kind: 'spec', stem: '0099-ghost' } });
        expect(current.service.view().area).toBe('overview');
        expect(current.service.view().selection?.stem).toBe('0002-b');
        expect(current.service.view().notice).toEqual({ number: '0099' });
    });

    it('a board-filter target shows the area with the target in the view and changes no selection', async () => {
        const current = await ready();
        await current.service.handlers.select({ stem: '0002-b' });
        await current.service.handlers.navigate({ area: 'board', target: { kind: 'boardFilter', filter: { states: ['Active'] } } });
        expect(current.service.view().target).toEqual({ kind: 'boardFilter', filter: { states: ['Active'] } });
        expect(current.service.view().selection?.stem).toBe('0002-b');
    });

    it('a request without a target clears an earlier target', async () => {
        const current = await ready();
        await current.service.handlers.navigate({ area: 'board', target: { kind: 'boardFilter', filter: { states: ['Active'] } } });
        await current.service.handlers.navigate({ area: 'overview' });
        expect(current.service.view().target).toBeUndefined();
    });
});

describe('0007 AC-012: onDidNavigate tells a consumer about every accepted navigation', () => {
    it('is called with the request after the view has changed', async () => {
        const current = await ready();
        const seen: unknown[] = [];
        current.service.onDidNavigate((request) => seen.push([request, current.service.view().area]));
        await current.service.handlers.navigate({ area: 'board', target: { kind: 'boardFilter', filter: { states: ['Active'] } } });
        expect(seen).toEqual([[{ area: 'board', target: { kind: 'boardFilter', filter: { states: ['Active'] } } }, 'board']]);
    });

    it('is not called for a spec target that does not exist, and not after dispose of the listener', async () => {
        const current = await ready();
        const seen: unknown[] = [];
        const subscription = current.service.onDidNavigate((request) => seen.push(request));
        await current.service.handlers.navigate({ area: 'board', target: { kind: 'spec', stem: '0099-none' } });
        expect(seen).toEqual([]);
        subscription.dispose();
        await current.service.handlers.navigate({ area: 'board' });
        expect(seen).toEqual([]);
    });

    it('a throwing listener does not break the navigation', async () => {
        const current = await ready();
        current.service.onDidNavigate(() => {
            throw new Error('boom');
        });
        await current.service.handlers.navigate({ area: 'board' });
        expect(current.service.view().area).toBe('board');
    });
});

describe('0015 AC-002: the removed Agent Center area', () => {
    it('a remembered area agentCenter shows Overview with no notice and no selection', async () => {
        const current = await ready({ memory: { v: 1, area: 'agentCenter', selection: { projectRoot: 'proj', stem: '0003-x' } } });
        current.service.open({ via: 'start' });
        expect(current.service.view().area).toBe('overview');
        expect(current.service.view().state).toBeUndefined();
        expect(current.service.view().notice).toBeUndefined();
        expect(current.service.view().selection).toBeUndefined();
    });

    it('the next remembered area replaces the removed one', async () => {
        const current = await ready({ memory: { v: 1, area: 'agentCenter' } });
        current.service.open({ via: 'start' });
        await current.service.handlers.navigate({ area: 'board' });
        expect(current.memory.value).toEqual({ v: 1, area: 'board' });
    });
});

describe('0019 P-6: select from outside the panel', () => {
    it('selects and remembers a spec, keeps the area and calls no navigation listener', async () => {
        const current = await ready({ memory: { v: 1, area: 'board' } });
        current.service.open({ via: 'start' });
        const navigations: unknown[] = [];
        current.service.onDidNavigate((request) => navigations.push(request));
        current.service.select({ stem: '0003-x' });
        expect(current.service.view().selection).toEqual({ stem: '0003-x', number: '0003' });
        expect(current.service.view().area).toBe('board');
        expect(current.service.view().target).toBeUndefined();
        expect(current.memory.value).toMatchObject({ v: 1, area: 'board', selection: { projectRoot: 'proj', stem: '0003-x' } });
        expect(navigations).toEqual([]);
    });

    it('undefined clears and remembers the selection and leaves area, target and notice untouched', async () => {
        const current = await ready();
        await current.service.handlers.navigate({ area: 'board', target: { kind: 'spec', stem: '0003-x' } });
        current.service.select({ stem: '0009-nope' });
        expect(current.service.view().notice).toEqual({ number: '0009' });
        current.service.select(undefined);
        const view = current.service.view();
        expect(view.selection).toBeUndefined();
        expect(view.area).toBe('board');
        expect(view.target).toEqual({ kind: 'spec', stem: '0003-x' });
        expect(view.notice).toEqual({ number: '0009' });
        expect(current.memory.value).toEqual({ v: 1, area: 'board' });
    });

    it('an unknown stem shows the notice and keeps the selection (control: the known stem selects)', async () => {
        const current = await ready();
        current.service.select({ stem: '0002-b' });
        current.service.select({ stem: '0009-nope' });
        expect(current.service.view().selection?.stem).toBe('0002-b');
        expect(current.service.view().notice).toEqual({ number: '0009' });
    });

    it('the select request handler is the same function (stem and path)', async () => {
        const current = await ready();
        await current.service.handlers.select({ stem: '0003-x' });
        expect(current.service.view().selection?.stem).toBe('0003-x');
    });
});

describe('0020 AC-017: a remembered Spec Explorer shows Overview', () => {
    it('keeps the remembered selection with its side panel while the stem is in the project, and no message appears', async () => {
        const current = await ready({ memory: { v: 1, area: 'specExplorer', selection: { projectRoot: 'proj', stem: '0003-x' } } });
        current.service.open({ via: 'start' });
        const view = current.service.view();
        expect(view.area).toBe('overview');
        expect(view.selection).toEqual({ stem: '0003-x', number: '0003' });
        expect(view.notice).toBeUndefined();
        expect(view.state).toBeUndefined();
    });

    it('a stem that is not in the project is cleared with the notice of 0005 BR-03', async () => {
        const current = await ready({ memory: { v: 1, area: 'specExplorer', selection: { projectRoot: 'proj', stem: '0099-none' } } });
        current.service.open({ via: 'start' });
        const view = current.service.view();
        expect(view.area).toBe('overview');
        expect(view.selection).toBeUndefined();
        expect(view.notice).toEqual({ number: '0099' });
    });

    it('control: another unknown area still drops the memory, selection included', async () => {
        const current = await ready({ memory: { v: 1, area: 'explorer', selection: { projectRoot: 'proj', stem: '0003-x' } } });
        current.service.open({ via: 'start' });
        expect(current.service.view().area).toBe('overview');
        expect(current.service.view().selection).toBeUndefined();
        expect(current.service.view().notice).toBeUndefined();
    });
});
