import { afterEach, describe, expect, it } from 'vitest';
import type { DetailView } from '../../shared/protocol/detail';
import { BUDGET_MS, bestOfThree } from '../../shared/testing/timing';
import { createHandOverWorld, projectOf } from '../assistant/testing/handOverWorld';
import { createBoardWorld, type BoardWorld } from '../board/testing/boardWorld';
import { specText } from '../lifecycle/testing/projects';
import { buildOverviewView } from '../overview/overviewView';
import { buildSpecTree } from './specTree';

const KEY = '.specs/backlog/0007-x.md';
const STEM = '0007-x';
const START = { modifiedMs: 1_000, size: 100 };
const HISTORY = { available: true as const, label: 'Observed', entries: [] };

const worlds: BoardWorld[] = [];
afterEach(() => worlds.splice(0).forEach((world) => world.service.dispose()));

function linesOf(view: DetailView): string[] {
    return view.kind === 'spec' && 'lines' in view.nextStep ? (view.nextStep as { lines: Array<{ text: string }> }).lines.map((line) => line.text) : [];
}

describe('0030 AC-005: the clarified step shows within the freshness budget after the file change', () => {
    it('0030 AC-005 detail, Overview, Board and tree switch within 500 ms, the selection unchanged', async () => {
        const handOver = createHandOverWorld(await projectOf({ [KEY]: specText() }, START));
        await handOver.handOvers.begin(`/sdd-clarify ${KEY}`)?.commit();
        const before = handOver.source.current()!;
        const after = await (async () => {
            handOver.repository.set(await projectOf({ [KEY]: specText() }, { modifiedMs: 5_000, size: 180 }));
            const model = handOver.source.current()!;
            handOver.repository.set(await projectOf({ [KEY]: specText() }, START));
            return model;
        })();
        expect(handOver.source.current()!.handOvers).toBeDefined();
        const world = createBoardWorld(before);
        worlds.push(world);
        world.selection.set({ stem: STEM, path: KEY });
        await world.service.whenIdle();
        expect(linesOf(world.service.detail() as DetailView)).toEqual([`/sdd-clarify ${KEY}`, `/sdd-plan ${KEY}`]);
        const best = await bestOfThree(
            async () => {
                world.source.set(after);
                await world.service.whenIdle();
                world.service.detail();
                buildOverviewView({ model: after, history: HISTORY });
                buildSpecTree({ projectActive: true, projectName: 'demo', projectCount: 1, state: undefined, model: after });
            },
            async () => {
                world.source.set(before);
                await world.service.whenIdle();
            },
        );
        world.source.set(after);
        await world.service.whenIdle();
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(linesOf(world.service.detail() as DetailView)).toEqual([`/sdd-plan ${KEY}`]);
        expect(world.selection.source.selection()).toEqual({ stem: STEM, path: KEY });
    });
});
