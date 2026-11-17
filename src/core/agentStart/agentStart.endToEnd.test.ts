import { describe, expect, it } from 'vitest';
import { createMoves } from '../board/moves';
import type { MoveResult } from '../../shared/protocol/board';
import { createStartFlow, type StartFlow } from './startFlow';
import { bindOrchestrator } from './orchestratorBinding';
import { createFakeStartUi } from './testing/fakeOrchestrator';
import { START_STEM, createStartWorld, type StartWorld } from './testing/startWorld';

const KEY = `.specs/backlog/${START_STEM}.md`;

interface Board {
    world: StartWorld;
    flow: StartFlow;
    results: MoveResult[];
    drop(): Promise<MoveResult>;
    settled(): Promise<void>;
}

async function board(rootToPath: (root: string) => string = (root) => root, setting = 'fake'): Promise<Board> {
    const world = await createStartWorld();
    world.setting.set(setting);
    const flow = createStartFlow({
        preconditions: world.deps,
        orchestrator: bindOrchestrator(world.orchestrator, rootToPath),
        ui: createFakeStartUi(),
        runs: world.runSource,
    });
    const results: MoveResult[] = [];
    const moves = createMoves({
        source: world.deps.model,
        start: flow,
        picks: { pickSpec: async () => undefined, pickTarget: async () => undefined },
        sink: { show: (result) => results.push(result) },
        selection: { selection: () => undefined, onDidChange: () => ({ dispose: () => undefined }) },
        focused: () => null,
    });
    return {
        world,
        flow,
        results,
        async drop() {
            const result = await moves.requestMove(KEY, 'Active');
            results.push(result);
            return result;
        },
        async settled() {
            await flow.whenIdle();
            await world.orchestrator.whenIdle();
            await flow.whenIdle();
        },
    };
}

describe('Ready to Active on the board starts the workflow end to end (0007 hand-off, 0008, 0011, 0009 fake provider, 0004 store)', () => {
    it('readiness check, confirmation, run created, events stored', async () => {
        const { world, flow, drop, settled } = await board();
        expect(world.model.current?.lifecycle.entries.find((entry) => entry.stem === START_STEM)?.state).toBe('Ready');

        expect(await drop()).toEqual({ kind: 'handedOff', number: '0001' });
        await flow.whenIdle();
        expect(world.fakeCalls()).toEqual(['checkAvailability']);
        expect(await world.runs()).toEqual([]);
        const confirmation = flow.view().confirmation;
        expect(confirmation?.spec.stem).toBe(START_STEM);
        expect(confirmation?.prompt).toContain(`implement the whole plan of spec \`${START_STEM}\``);

        flow.confirm(confirmation?.token ?? '');
        await settled();
        await world.advance(5_000);
        await settled();

        const runs = await world.runs();
        expect(runs).toHaveLength(1);
        const run = runs[0];
        expect(run).toMatchObject({ providerId: 'fake', model: 'fake-model', spec: { stem: START_STEM, path: KEY } });
        expect(await world.statusesOf(run?.runId ?? '')).toEqual(['Starting', 'Running', 'Completed']);
        const kinds = await world.eventKinds(run?.runId ?? '');
        expect(kinds).toContain('session.started');
        expect(kinds).toContain('message.completed');
        expect(kinds.at(-1)).toBe('run.completed');
        expect(world.fakeCalls().filter((call) => call === 'start')).toHaveLength(1);
        expect(flow.view()).toEqual({});
    });

    it('hands the provider the confirmed prompt, the model and the working directory turned into a path', async () => {
        const { world, flow, drop, settled } = await board((root) => `path-of:${root}`, 'controlled');
        await drop();
        await flow.whenIdle();
        const confirmation = flow.view().confirmation;
        flow.confirm(confirmation?.token ?? '');
        await settled();
        expect(world.controlled.started).toHaveLength(1);
        expect(world.controlled.started[0]).toMatchObject({ prompt: confirmation?.prompt, workingDirectory: `path-of:${world.root}` });
        expect(world.controlled.started[0]).not.toHaveProperty('model');
    });

    it('a second drop while a run is open is refused with P-5 and starts nothing', async () => {
        const { world, flow, drop, settled } = await board();
        world.scenario.current = 'long-run';
        await drop();
        await flow.whenIdle();
        flow.confirm(flow.view().confirmation?.token ?? '');
        await settled();
        await world.advance(10);
        await drop();
        await flow.whenIdle();
        expect(flow.view().refusal?.items).toEqual([expect.objectContaining({ id: 'P-5', stem: START_STEM })]);
        expect(world.fakeCalls().filter((call) => call === 'start')).toHaveLength(1);
        expect((await world.runs()).length).toBe(1);
    });

    it('a start failure shows the notice with the run ID and the error class (runtime_missing)', async () => {
        const { world, flow, drop, settled } = await board((root) => root, 'controlled');
        await drop();
        await flow.whenIdle();
        flow.confirm(flow.view().confirmation?.token ?? '');
        await settled();
        const [run] = await world.runs();
        expect(run?.status).toBe('Starting');
        expect(flow.view().notice).toBeUndefined();
        world.controlled.sink(run?.runId ?? '').emit({ kind: 'run.failed', source: 'provider', payload: { category: 'runtime_missing' } });
        world.controlled.sink(run?.runId ?? '').close();
        await settled();
        await world.advance(100);
        await settled();
        expect((await world.runOf(run?.runId ?? '')).status).toBe('Failed');
        expect(flow.view().notice).toEqual({ runId: run?.runId, errorClass: 'runtime_missing' });
        expect(world.controlled.calls.filter((call) => call.startsWith('start:'))).toHaveLength(1);
    });

    it('a cancelled confirmation leaves no run and no event behind', async () => {
        const { world, flow, drop, settled } = await board();
        await drop();
        await flow.whenIdle();
        flow.cancel(flow.view().confirmation?.token ?? '');
        await settled();
        expect(await world.runs()).toEqual([]);
        expect(world.fakeCalls()).toEqual(['checkAvailability']);
    });

    it('a refused hand-off (spec not Ready) stores nothing and shows no confirmation', async () => {
        const { world, flow, settled } = await board();
        await world.setSpecs([{ folder: 'active', stem: START_STEM }]);
        flow.handOff({ stem: START_STEM, key: KEY });
        await settled();
        expect(flow.view().confirmation).toBeUndefined();
        expect(flow.view().refusal?.items[0]).toMatchObject({ id: 'P-1' });
        expect(await world.runs()).toEqual([]);
    });
});
