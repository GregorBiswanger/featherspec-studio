import { profileCapabilities } from '../../../adapters/providers/fake/fakeProvider';
import type { WorldOptions } from '../../orchestrator/testing/world';
import { createStartFlow, type StartFlow } from '../startFlow';
import { createFakeStartOrchestrator, createFakeStartUi, type FakeStartOrchestrator, type FakeStartUi } from './fakeOrchestrator';
import { START_STEM, createStartWorld, type StartWorld } from './startWorld';

export const REQUEST = { stem: START_STEM, key: `.specs/backlog/${START_STEM}.md` };

export interface FlowWorld extends StartWorld {
    flow: StartFlow;
    orchestrator2: FakeStartOrchestrator;
    startUi: FakeStartUi;
    changes: number;
    handOff(): Promise<void>;
}

export async function createFlowWorld(options: WorldOptions & { root?: string; minimal?: boolean } = {}): Promise<FlowWorld> {
    const base = await createStartWorld({
        ...options,
        ...(options.minimal === true ? { fakeCapabilities: profileCapabilities('minimal') } : {}),
    });
    const orchestrator2 = createFakeStartOrchestrator();
    const startUi = createFakeStartUi();
    const flow = createStartFlow({ preconditions: base.deps, orchestrator: orchestrator2, ui: startUi, runs: base.runSource });
    const world: FlowWorld = Object.assign(base, {
        flow,
        orchestrator2,
        startUi,
        changes: 0,
        async handOff() {
            flow.handOff(REQUEST);
            await flow.whenIdle();
        },
    });
    flow.onDidChangeView(() => {
        world.changes += 1;
    });
    return world;
}
