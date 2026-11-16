import { describe, expect, it } from 'vitest';
import { createRerunScheduler } from './rerunScheduler';
import { createFakeHost } from './testing/fakeHost';

function setup() {
    const host = createFakeHost([]);
    let runs = 0;
    let release: (() => void) | undefined;
    let blocking = false;
    const scheduler = createRerunScheduler({
        clock: host.clock,
        debounceMs: 200,
        run: async () => {
            runs += 1;
            if (blocking) {
                await new Promise<void>((resolve) => {
                    release = resolve;
                });
            }
        },
    });
    return {
        host,
        scheduler,
        runs: () => runs,
        block: () => {
            blocking = true;
        },
        unblock: () => {
            blocking = false;
            release?.();
        },
    };
}

describe('rerunScheduler', () => {
    it('AC-013: a burst of triggers inside the debounce window runs once', async () => {
        const { host, scheduler, runs } = setup();
        scheduler.trigger();
        host.clock.advance(100);
        scheduler.trigger();
        host.clock.advance(150);
        scheduler.trigger();
        host.clock.advance(199);
        expect(runs()).toBe(0);
        host.clock.advance(1);
        await scheduler.whenIdle();
        expect(runs()).toBe(1);
    });

    it('AC-013: triggers further apart than the window run separately', async () => {
        const { host, scheduler, runs } = setup();
        scheduler.trigger();
        host.clock.advance(200);
        await scheduler.whenIdle();
        scheduler.trigger();
        host.clock.advance(200);
        await scheduler.whenIdle();
        expect(runs()).toBe(2);
    });

    it('AC-013: negative control, without a trigger nothing runs', async () => {
        const { host, scheduler, runs } = setup();
        host.clock.advance(5000);
        await scheduler.whenIdle();
        expect(runs()).toBe(0);
    });

    it('AC-013: a trigger during a running run never overlaps and causes exactly one more run', async () => {
        const { host, scheduler, runs, block, unblock } = setup();
        block();
        scheduler.trigger();
        host.clock.advance(200);
        expect(runs()).toBe(1);
        scheduler.trigger();
        host.clock.advance(200);
        scheduler.trigger();
        host.clock.advance(200);
        expect(runs()).toBe(1);
        unblock();
        await new Promise((resolve) => setImmediate(resolve));
        expect(runs()).toBe(2);
        unblock();
        await scheduler.whenIdle();
        expect(runs()).toBe(2);
    });

    it('AC-013: dispose cancels a pending run', async () => {
        const { host, scheduler, runs } = setup();
        scheduler.trigger();
        scheduler.dispose();
        host.clock.advance(1000);
        await scheduler.whenIdle();
        expect(runs()).toBe(0);
        expect(host.clock.pendingTimers()).toBe(0);
    });
});
