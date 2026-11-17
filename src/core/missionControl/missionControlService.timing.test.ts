import { describe, expect, it } from 'vitest';
import { BUDGET_MS, bestOfThree } from '../../shared/testing/timing';
import { generateModel } from './testing/bigModel';
import { createServiceWorld } from './testing/serviceWorld';

function current(world: ReturnType<typeof createServiceWorld>) {
    const view = world.service.view();
    if (view === undefined) {
        throw new Error('no view');
    }
    return view;
}

describe('dashboard service', () => {
    it('AC-024: a project of 200 specs, 5 runs per spec and 1,000 history entries is projected within 1000 ms (PD-035)', async () => {
        const big = await generateModel(200, 5, 1000);
        let world = createServiceWorld(big.model);
        const best = await bestOfThree(
            async () => {
                world.listen();
                await world.service.whenIdle();
            },
            () => {
                world.service.dispose();
                world = createServiceWorld(big.model);
                world.store.setRuns(big.runs);
                world.history.view = big.history;
            },
        );
        expect(world.service.view()?.specs).toMatchObject({ total: 200 });
        expect(world.service.view()?.runs).toMatchObject({ available: true });
        expect(best).toBeLessThan(BUDGET_MS.modelUpdate);
    });
});
