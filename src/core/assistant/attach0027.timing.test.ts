import { afterEach, describe, expect, it } from 'vitest';
import { BUDGET_MS, bestOfThree } from '../../shared/testing/timing';
import { createBoardWorld, type BoardWorld } from '../board/testing/boardWorld';
import { splitterFiles, SPLITTER_SPEC } from '../board/testing/caseFixtures';
import { buildDetail } from '../board/detail';
import type { BoardService } from '../board/boardService';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { readMemory } from '../lifecycle/testing/projects';
import { buildOverviewView } from '../overview/overviewView';
import type { ShellModel } from '../ports/shell';
import { createModelSource } from '../shell/modelSource';
import { addProject, createShellWorld, type ShellWorld } from '../shell/testing/world';
import { createFakeOffer } from './testing/fakeOffer';

const STEM = '0001-tip-splitter';
const BACKLOG_SPEC = '.specs/backlog/0001-tip-splitter.md';
const history = { available: true as const, label: 'Observed', entries: [] };
const TWO = ['T-001', 'T-002'];

const disposables: BoardService[] = [];
let shell: ShellWorld | undefined;

afterEach(() => {
    disposables.splice(0).forEach((service) => service.dispose());
    shell?.dispose();
    shell = undefined;
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
    it('FeatherSpecVersion 1.10.0 to 1.11.0: the detail (the Plan map header takes it) and the Overview gain the attachment; selection stays', async () => {
        const old = await modelWith('1.10.0');
        const next = await modelWith('1.11.0');
        const before = createBoardWorld(old, undefined, undefined, createFakeOffer({ assistant: 'claudeCode' }));
        disposables.push(before.service);
        before.selection.set({ stem: STEM, path: SPLITTER_SPEC });
        await before.service.whenIdle();
        expect(attachesOf(before, old)).toEqual({ detail: undefined, overview: undefined });
        const { world, best } = await measure(old, next);
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(attachesOf(world, next)).toEqual({ detail: SPLITTER_SPEC, overview: SPLITTER_SPEC });
        expect(world.selection.source.selection()).toMatchObject({ stem: STEM });
    });

    it('and back: 1.11.0 to 1.10.0 removes it within the budget', async () => {
        const { world, best } = await measure(await modelWith('1.11.0'), await modelWith('1.10.0'));
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(attachesOf(world, await modelWith('1.10.0'))).toEqual({ detail: undefined, overview: undefined });
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

    it('negative control: a version change that crosses nothing (1.10.0 to 1.10.1) switches nothing', async () => {
        const { world } = await measure(await modelWith('1.10.0'), await modelWith('1.10.1'));
        expect(attachesOf(world, await modelWith('1.10.1'))).toEqual({ detail: undefined, overview: undefined });
        const crossing = await measure(await modelWith('1.10.1'), await modelWith('1.11.0'));
        expect(attachesOf(crossing.world, await modelWith('1.11.0')).detail).toBe(SPLITTER_SPEC);
    });
});

describe('0027 AC-012: the shell world, a version line edited in AGENTS.md', () => {
    async function started(version: string): Promise<{ world: ShellWorld; source: ReturnType<typeof createModelSource> }> {
        shell = createShellWorld();
        addProject(shell, 'proj', splitterFiles({ ticked: TWO, currentStep: 'T-003' }));
        write(shell, version);
        const source = createModelSource(shell.repository);
        await shell.controller.start();
        await shell.settle();
        return { world: shell, source };
    }

    function write(target: ShellWorld, version: string): void {
        const text = `FeatherSpecVersion: ${version}\n`;
        target.discoveryFs.setFile('proj', 'AGENTS.md', text);
        target.specs.setFile('proj', 'AGENTS.md', text);
        target.discoveryFs.setFile('proj', '.claude/commands/sdd-plan.md', 'x');
    }

    function states(source: ReturnType<typeof createModelSource>): { detail: string | undefined; overview: string | undefined } {
        const model = source.current()!;
        const offer = createFakeOffer({ assistant: 'claudeCode' }).read();
        const detail = buildDetail({ selection: { stem: STEM, path: SPLITTER_SPEC }, model, history, offer: offer! });
        const row = buildOverviewView({ model, history, offer: offer! }).now.rows[0];
        return { detail: detail.kind === 'spec' && 'lines' in detail.nextStep ? detail.nextStep.send?.attach?.path : undefined, overview: row?.send?.attach?.path };
    }

    async function change(current: { world: ShellWorld }, version: string): Promise<number> {
        const started = performance.now();
        write(current.world, version);
        current.world.host.watch.fire('proj');
        current.world.host.clock.advance(200);
        await current.world.controller.whenIdle();
        await current.world.settle();
        return performance.now() - started;
    }

    it('1.10.0 to 1.11.0 and back, and the line removed: the state follows, selection and area stay', async () => {
        const current = await started('1.10.0');
        expect(states(current.source)).toEqual({ detail: undefined, overview: undefined });
        current.world.service.select({ stem: STEM });
        const area = current.world.service.view().area;
        expect(await change(current, '1.11.0')).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(states(current.source)).toEqual({ detail: SPLITTER_SPEC, overview: SPLITTER_SPEC });
        expect(await change(current, '1.10.0')).toBeLessThan(BUDGET_MS.uiFreshness);
        expect(states(current.source)).toEqual({ detail: undefined, overview: undefined });
        expect(current.world.service.view().selection).toMatchObject({ stem: STEM });
        expect(current.world.service.view().area).toBe(area);
    });
});
