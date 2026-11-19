import { afterEach, describe, expect, it } from 'vitest';
import { createFakeOffer } from '../assistant/testing/fakeOffer';
import { createBoardService } from '../board/boardService';
import { createFakeBoardMemory, createFakeHistory, createFakeSelection } from '../board/testing/boardWorld';
import { buildOverviewView } from '../overview/overviewView';
import { createFakeTips } from '../settings/testing/fakeTips';
import { BUDGET_MS } from '../../shared/testing/timing';
import { createModelSource } from './modelSource';
import { createSpecTreeService, type SpecTreeService } from './specTreeService';
import { addProject, createShellWorld, type ShellWorld } from './testing/world';

const BRIEF = '# Project Brief\n\n## Mission\nTBD\n\n## Primary users\nTBD\n\n## Success criteria\nTBD\n';
const FILLED = BRIEF.replace('## Mission\nTBD', '## Mission\nA tip splitter');
const NEVER = 'FeatherSpecVersion: 1.11.0\n# last reconciled: never · last deep scan: never\n';
const DONE = 'FeatherSpecVersion: 1.11.0\n# last reconciled: 2026-11-19 · last deep scan: never\n';
const WELCOME = 'Welcome to FeatherSpec. Set up this project first: run /sdd-setup with the AI assistant of your choice.';
const NO_SPECS = 'No specs yet. Start with /sdd-specify';

let world: ShellWorld | undefined;
let tree: SpecTreeService | undefined;
let board: ReturnType<typeof createBoardService> | undefined;

afterEach(() => {
    board?.dispose();
    tree?.dispose();
    world?.dispose();
    board = undefined;
    tree = undefined;
    world = undefined;
});

async function started(agents: string, brief: string | undefined) {
    world = createShellWorld();
    addProject(world, 'proj');
    write(world, agents, brief);
    const source = createModelSource(world.repository);
    tree = createSpecTreeService({ shell: world.service, source, discovery: world.controller, sameRoot: (first, second) => first === second });
    board = createBoardService({ source, selection: createFakeSelection().source, history: createFakeHistory().port, memory: createFakeBoardMemory(), tips: createFakeTips(), assistant: createFakeOffer({ assistant: 'claudeCode' }) });
    await world.controller.start();
    await world.settle();
    await board.whenIdle();
    const current = world;
    return {
        world: current,
        surfaces: () => {
            const model = source.current()!;
            const overview = buildOverviewView({ model, history: { available: true, label: 'Observed', entries: [] }, offer: { assistant: 'claudeCode' } });
            return { overview: overview.welcome !== undefined, board: board!.view()?.welcome !== undefined, tree: tree!.model().message };
        },
    };
}

function write(target: ShellWorld, agents: string, brief: string | undefined): void {
    target.discoveryFs.setFile('proj', 'AGENTS.md', agents);
    target.specs.setFile('proj', 'AGENTS.md', agents);
    if (brief === undefined) {
        target.discoveryFs.remove('proj', '.memory-bank/projectbrief.md');
    } else {
        target.discoveryFs.setFile('proj', '.memory-bank/projectbrief.md', brief);
    }
}

async function change(current: Awaited<ReturnType<typeof started>>, agents: string, brief: string | undefined): Promise<number> {
    const begun = performance.now();
    write(current.world, agents, brief);
    current.world.host.watch.fire('proj');
    current.world.host.clock.advance(200);
    await current.world.controller.whenIdle();
    await current.world.settle();
    await board!.whenIdle();
    return performance.now() - begun;
}

const WELCOMING = { overview: true, board: true, tree: WELCOME };
const PLAIN = { overview: false, board: false, tree: NO_SPECS };

describe('0029 AC-009: a change of the sign switches Overview, Board and tree within 500 ms', () => {
    it('brief filled, then restored: welcome, no welcome, welcome', async () => {
        const current = await started(NEVER, BRIEF);
        expect(current.surfaces()).toEqual(WELCOMING);
        expect(await change(current, NEVER, FILLED)).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(current.surfaces()).toEqual(PLAIN);
        expect(await change(current, NEVER, BRIEF)).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(current.surfaces()).toEqual(WELCOMING);
    });

    it('brief deleted, then created again', async () => {
        const current = await started(NEVER, BRIEF);
        expect(await change(current, NEVER, undefined)).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(current.surfaces()).toEqual(PLAIN);
        expect(await change(current, NEVER, BRIEF)).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(current.surfaces()).toEqual(WELCOMING);
    });

    it('never to a date and back, selection and area stay', async () => {
        const current = await started(NEVER, BRIEF);
        const area = current.world.service.view().area;
        expect(await change(current, DONE, BRIEF)).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(current.surfaces()).toEqual(PLAIN);
        expect(await change(current, NEVER, BRIEF)).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(current.surfaces()).toEqual(WELCOMING);
        expect(current.world.service.view().area).toBe(area);
        expect(current.world.service.view().selection).toBeUndefined();
    });

    it('negative control: a change of an unrelated file in the brief folder switches nothing', async () => {
        const current = await started(NEVER, BRIEF);
        current.world.discoveryFs.setFile('proj', '.memory-bank/activeContext.md', 'changed');
        current.world.host.watch.fire('proj');
        current.world.host.clock.advance(200);
        await current.world.controller.whenIdle();
        await current.world.settle();
        expect(current.surfaces()).toEqual(WELCOMING);
    });
});
