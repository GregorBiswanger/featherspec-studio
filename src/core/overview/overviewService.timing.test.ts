import { describe, expect, it } from 'vitest';
import { BUDGET_MS, bestOfThree } from '../../shared/testing/timing';
import { parseStepTipSettings } from '../settings/stepTipSettings';
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
    it('AC-024: a project of 200 specs and 1,000 history entries is projected within 1000 ms (PD-035)', async () => {
        const big = await generateModel(200, 1000);
        let world = createServiceWorld(big.model);
        const best = await bestOfThree(
            async () => {
                world.listen();
                await world.service.whenIdle();
            },
            () => {
                world.service.dispose();
                world = createServiceWorld(big.model);
                world.history.view = big.history;
            },
        );
        expect(world.service.view()?.figures).toMatchObject({ total: 200 });
        expect(world.service.view()?.activity).toMatchObject({ available: true });
        expect(best).toBeLessThan(BUDGET_MS.modelUpdate);
    });
});

describe('0021 AC-011: a settings change reaches the Overview within 500 ms (PD-047)', () => {
    it('from the fake port event to the emitted view on 200 specs', async () => {
        const big = await generateModel(200, 1000);
        const world = createServiceWorld(big.model);
        world.history.view = big.history;
        world.listen();
        await world.service.whenIdle();
        let on = false;
        const best = await bestOfThree(async () => {
            on = !on;
            world.tips.set(parseStepTipSettings(on, { strong: 'X' }));
            await world.service.whenIdle();
        });
        expect(current(world).now.rows.some((row) => 'tips' in row)).toBe(on && current(world).now.rows.length > 0);
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
        world.service.dispose();
    });
});

describe('0024 AC-010: a setting change and an extensions change reach the Overview within 500 ms (PD-047)', () => {
    it('from the fake port events to the emitted view on 200 specs', async () => {
        const big = await generateModel(200, 1000);
        const world = createServiceWorld(big.model);
        world.history.view = big.history;
        world.listen();
        await world.service.whenIdle();
        world.assistant.choose('copilot');
        let installed = false;
        const best = await bestOfThree(async () => {
            installed = !installed;
            if (installed) {
                world.assistant.install('copilot');
            } else {
                world.assistant.uninstall('copilot');
            }
            await world.service.whenIdle();
        });
        expect(current(world).now.rows.some((row) => 'send' in row)).toBe(installed && current(world).now.rows.length > 0);
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
        world.assistant.install('copilot');
        let chosen = true;
        const settingBest = await bestOfThree(async () => {
            chosen = !chosen;
            world.assistant.choose(chosen ? 'copilot' : 'none');
            await world.service.whenIdle();
        });
        expect(current(world).now.rows.some((row) => 'send' in row)).toBe(chosen && current(world).now.rows.length > 0);
        expect(settingBest).toBeLessThan(BUDGET_MS.uiFreshness);
        world.service.dispose();
    });
});

