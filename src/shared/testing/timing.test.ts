import { describe, expect, it } from 'vitest';
import { BUDGET_MS, bestOfThree } from './timing';

function spin(ms: number): void {
    const end = performance.now() + ms;
    while (performance.now() < end) {
        continue;
    }
}

describe('bestOfThree', () => {
    it('runs one warm-up and three measured runs, preparing before each', async () => {
        const order: string[] = [];
        await bestOfThree(
            () => void order.push('run'),
            () => void order.push('prepare'),
        );
        expect(order).toEqual(['prepare', 'run', 'prepare', 'run', 'prepare', 'run', 'prepare', 'run']);
    });

    it('reports the best run, so one slow run on a busy machine does not fail a budget', async () => {
        let calls = 0;
        const best = await bestOfThree(() => {
            calls += 1;
            spin(calls === 2 ? 150 : 1);
        });
        expect(best).toBeLessThan(100);
    });

    it('negative control: an action that is slower in every run exceeds the budget', async () => {
        const best = await bestOfThree(() => spin(BUDGET_MS.uiFreshness + 20));
        expect(best).toBeGreaterThan(BUDGET_MS.uiFreshness);
    });
});
