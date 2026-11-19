import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryMedium, createMemoryBacking } from '../runtime/testing/memoryMedium';
import { createFakeNotices, createFakeRuntimeClock, createSequentialIds } from '../runtime/testing/fakes';
import { openRuntimeStore, type RuntimeStore } from '../runtime/runtimeStore';
import { createLifecycleService } from '../lifecycle/lifecycleService';
import { readMemory } from '../lifecycle/testing/projects';
import type { ProjectRead } from '../specs/readProject';
import type { SpecChange, SpecRepository } from '../specs/specRepository';
import type { ClockPort, Disposable } from '../ports/host';
import type { RuntimeSession } from '../runtime/runtimeSession';
import type { StoreState } from '../runtime/model';
import type { DetailView } from '../../shared/protocol/detail';
import { BUDGET_MS, bestOfThree } from '../../shared/testing/timing';
import { buildOverviewView } from '../overview/overviewView';
import type { ShellModel } from '../ports/shell';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { createBoardWorld, type BoardWorld } from './testing/boardWorld';
import { splitterFiles, SPLITTER_SPEC, type TipSplitterOptions } from './testing/caseFixtures';
import type { BoardService } from './boardService';

const ALL = ['T-001', 'T-002', 'T-003', 'T-004', 'T-005', 'T-006'];
const FIVE = ALL.slice(0, 5);
const STEM = '0001-tip-splitter';
const history = { available: true as const, label: 'Observed', entries: [] };

const disposables: BoardService[] = [];
afterEach(() => disposables.splice(0).forEach((service) => service.dispose()));

async function modelWith(options: TipSplitterOptions, version = '1.10.0'): Promise<ShellModel> {
    const project = await readMemory(splitterFiles(options), version);
    return { project, lifecycle: deriveLifecycle(project) };
}

function nextOf(view: DetailView): { rule: string; lines: Array<{ text: string }> } {
    if (view.kind !== 'spec' || !('lines' in view.nextStep)) {
        throw new Error('no next step');
    }
    return view.nextStep as { rule: string; lines: Array<{ text: string }> };
}

async function measure(before: ShellModel, after: ShellModel): Promise<{ world: BoardWorld; best: number }> {
    const world = createBoardWorld(before);
    disposables.push(world.service);
    world.selection.set({ stem: STEM, path: SPLITTER_SPEC });
    await world.service.whenIdle();
    const best = await bestOfThree(
        async () => {
            world.source.set(after);
            await world.service.whenIdle();
            world.service.detail();
            buildOverviewView({ model: after, history });
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

describe('0028 AC-008: a plan file change that switches the state or the case shows within 500 ms', () => {
    it('the last open step ticked: Active to Review in the detail, the Overview and the Board', async () => {
        const open = await modelWith({ ticked: FIVE });
        const done = await modelWith({ ticked: ALL });
        const { world, best } = await measure(open, done);
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(nextOf(world.service.detail())).toMatchObject({ rule: 'NS-5', lines: [{ text: `/sdd-compile ${SPLITTER_SPEC}` }, expect.anything()] });
        expect(world.service.view()!.columns.find((column) => column.state === 'Review')!.cards.map((card) => card.number)).toEqual(['0001']);
        expect(buildOverviewView({ model: done, history }).now[0]).toMatchObject({ state: 'Review' });
        expect(world.selection.source.selection()).toMatchObject({ stem: STEM });
    });

    it('a tick removed: Review back to Active with the step to continue with', async () => {
        const done = await modelWith({ ticked: ALL });
        const open = await modelWith({ ticked: FIVE });
        const { world, best } = await measure(done, open);
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(nextOf(world.service.detail())).toMatchObject({ rule: 'NS-6', lines: [{ text: expect.stringContaining('Implement T-006 of') }, expect.anything()] });
        expect(world.service.view()!.columns.find((column) => column.state === 'Active')!.cards.map((card) => card.number)).toEqual(['0001']);
    });

    it('Current step edited from T-004 to T-003 below 1.11.0: Report first becomes variant A', async () => {
        const sign = await modelWith({ ticked: ['T-001', 'T-002'], currentStep: 'T-004' });
        const plain = await modelWith({ ticked: ['T-001', 'T-002'], currentStep: 'T-003' });
        const { world, best } = await measure(sign, plain);
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(nextOf(world.service.detail()).lines[0]!.text).toContain('Implement T-003 of');
        const back = await measure(plain, sign);
        expect(back.best).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(nextOf(back.world.service.detail()).lines[0]!.text).toBe(`/sdd-plan ${SPLITTER_SPEC}`);
    });
});

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) {
        await cleanup();
    }
});

function fakeClock(): ClockPort {
    let tick = 0;
    return { now: () => `2026-11-19T10:00:${String(++tick).padStart(2, '0')}Z`, setTimeout: () => ({ dispose: () => undefined }) };
}

describe('0028 AC-008: the status history', () => {
    async function observed(...steps: TipSplitterOptions[]): Promise<Array<[string | null, string | null, string]>> {
        const store: RuntimeStore = await openRuntimeStore({
            medium: createMemoryMedium(createMemoryBacking()),
            ids: createSequentialIds(),
            clock: createFakeRuntimeClock(),
            notices: createFakeNotices(),
            projectRoot: 'project-A',
        });
        cleanups.push(() => store.dispose());
        const listeners = new Set<(change: SpecChange) => void>();
        let current: ProjectRead | undefined = (await modelWith(steps[0]!)).project;
        const repository: Pick<SpecRepository, 'snapshot' | 'onDidChange'> = {
            snapshot: () => current,
            onDidChange(listener): Disposable {
                listeners.add(listener);
                return { dispose: () => void listeners.delete(listener) };
            },
        };
        const session: Pick<RuntimeSession, 'current' | 'state' | 'onDidChangeState'> = {
            current: () => store,
            state: (): StoreState => store.state(),
            onDidChangeState: (): Disposable => ({ dispose: () => undefined }),
        };
        const service = createLifecycleService({ repository, session, clock: fakeClock() });
        await service.whenIdle();
        for (const step of steps.slice(1)) {
            current = (await modelWith(step)).project;
            [...listeners].forEach((listener) => listener({ references: ['0001-tip-splitter'], untied: false, cause: 'files' }));
            await service.whenIdle();
        }
        const view = await service.history();
        service.dispose();
        return view.available ? view.entries.map((entry) => [entry.old, entry.new, entry.flow]) : [];
    }

    it('Active to Review and back adds one history entry each, in flow', async () => {
        expect(await observed({ ticked: FIVE }, { ticked: ALL }, { ticked: FIVE })).toEqual([
            [null, 'Active', 'not checked'],
            ['Active', 'Review', 'in flow'],
            ['Review', 'Active', 'in flow'],
        ]);
    });

    it('negative control: a change that switches nothing adds no entry', async () => {
        expect(await observed({ ticked: FIVE }, { ticked: ['T-001', 'T-002', 'T-003', 'T-004'] }, { ticked: FIVE, currentStep: 'T-006' })).toEqual([[null, 'Active', 'not checked']]);
    });
});
