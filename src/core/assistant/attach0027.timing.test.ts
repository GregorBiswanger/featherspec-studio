import { afterEach, describe, expect, it } from 'vitest';
import { BUDGET_MS, bestOfThree } from '../../shared/testing/timing';
import { createBoardWorld, type BoardWorld } from '../board/testing/boardWorld';
import { splitterFiles, SPLITTER_SPEC } from '../board/testing/caseFixtures';
import type { BoardService } from '../board/boardService';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { readMemory } from '../lifecycle/testing/projects';
import { buildOverviewView } from '../overview/overviewView';
import type { ShellModel } from '../ports/shell';
import { createFakeOffer } from './testing/fakeOffer';

const STEM = '0001-tip-splitter';
const BACKLOG_SPEC = '.specs/backlog/0001-tip-splitter.md';
const history = { available: true as const, label: 'Observed', entries: [] };
const TWO = ['T-001', 'T-002'];

const disposables: BoardService[] = [];

afterEach(() => {
    disposables.splice(0).forEach((service) => service.dispose());
});

async function modelWith(version: string, folder: 'active' | 'backlog' = 'active'): Promise<ShellModel> {
    const project = await readMemory(splitterFiles({ ticked: TWO, currentStep: 'T-003', folder, ...(folder === 'backlog' ? { status: 'Not started' } : {}) }), version);
    return { project, lifecycle: deriveLifecycle(project) };
}

function attachesOf(world: BoardWorld, model: ShellModel): { detail: string | undefined; overview: string | undefined } {
    const detail = world.service.detail();
    const next = detail.kind === 'spec' && 'lines' in detail.nextStep ? detail.nextStep : undefined;
    const row = buildOverviewView({ model, history, offer: world.assistant.read() }).now.rows[0];
    return { detail: next?.send?.attach?.path, overview: row?.send?.attach?.path };
}

async function measure(before: ShellModel, after: ShellModel): Promise<{ world: BoardWorld; best: number }> {
    const world = createBoardWorld(before, undefined, undefined, createFakeOffer({ assistant: 'claudeCode' }));
    disposables.push(world.service);
    world.selection.set({ stem: STEM, path: before.lifecycle.entries[0]!.key });
    await world.service.whenIdle();
    const best = await bestOfThree(
        async () => {
            world.source.set(after);
            await world.service.whenIdle();
            world.service.detail();
            buildOverviewView({ model: after, history, offer: world.assistant.read() });
        },
        async () => {
            world.source.set(before);
            await world.service.whenIdle();
        },
    );
    world.source.set(after);
    await world.service.whenIdle();
    return { world, best };
}

describe('0027 AC-012: the attachment state follows the version and the spec path within 500 ms', () => {
    it('PD-091: a FeatherSpecVersion change switches nothing, the attachment is there in 1.10.0 and 1.11.0 alike', async () => {
        const { world, best } = await measure(await modelWith('1.10.0'), await modelWith('1.11.0'));
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(attachesOf(world, await modelWith('1.11.0'))).toEqual({ detail: SPLITTER_SPEC, overview: SPLITTER_SPEC });
        expect(attachesOf(world, await modelWith('1.10.0'))).toEqual({ detail: SPLITTER_SPEC, overview: SPLITTER_SPEC });
    });

    it('the spec moves from backlog/ to active/: the new path is the one attached', async () => {
        const { world, best } = await measure(await modelWith('1.11.0', 'backlog'), await modelWith('1.11.0'));
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(attachesOf(world, await modelWith('1.11.0'))).toEqual({ detail: SPLITTER_SPEC, overview: SPLITTER_SPEC });
        const backlog = createBoardWorld(await modelWith('1.11.0', 'backlog'), undefined, undefined, createFakeOffer({ assistant: 'claudeCode' }));
        disposables.push(backlog.service);
        backlog.selection.set({ stem: STEM, path: BACKLOG_SPEC });
        await backlog.service.whenIdle();
        expect(attachesOf(backlog, await modelWith('1.11.0', 'backlog')).detail).toBe(BACKLOG_SPEC);
    });
});
