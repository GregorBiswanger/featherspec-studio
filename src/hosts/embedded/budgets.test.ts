import { describe, expect, it } from 'vitest';
import { createMemorySpecSource } from '../../core/specs/testing/memorySpecSource';
import type { ClockPort } from '../../core/ports/host';
import { createBudgetProbe } from './budgets';

const ROOT = 'file:///work/p';
const SPEC = '.specs/active/0001-a-spec.md';

function realClock(): ClockPort {
    return {
        now: () => new Date().toISOString(),
        setTimeout(callback, milliseconds) {
            const handle = setTimeout(callback, milliseconds);
            return { dispose: () => clearTimeout(handle) };
        },
    };
}

function project() {
    const source = createMemorySpecSource();
    source.setFile(ROOT, 'AGENTS.md', 'FeatherSpecVersion: 1.10.0\n');
    for (const folder of ['backlog', 'active', 'done']) {
        source.setDirectory(ROOT, `.specs/${folder}`);
    }
    source.setFile(ROOT, SPEC, '# A spec\n\n**Status:** Draft\n**Plan:** _none yet_\n');
    return source;
}

describe('budget probe (0034 R-2, 0002 AC-018 through the embedded ports)', () => {
    it('measures the full read as the best of three opens through the given source', async () => {
        const source = project();
        const probe = createBudgetProbe({ source, clock: realClock(), now: () => performance.now() });
        const ms = await probe.read(ROOT, '1.10.0');
        expect(ms).toBeGreaterThanOrEqual(0);
        expect(ms).toBeLessThan(2000);
        expect(source.reads().length).toBeGreaterThan(0);
        probe.dispose();
    });

    it('measures the update from the fired file event to the change notification', async () => {
        const source = project();
        const probe = createBudgetProbe({ source, clock: realClock(), now: () => performance.now() });
        await probe.read(ROOT, '1.10.0');
        source.setFile(ROOT, SPEC, '# A spec\n\n**Status:** In Progress\n**Plan:** _none yet_\n\nedited\n');
        const ms = await probe.update(SPEC);
        expect(ms).toBeGreaterThanOrEqual(150);
        expect(ms).toBeLessThan(1000);
        probe.dispose();
    });

    it('refuses an update before a read', async () => {
        const probe = createBudgetProbe({ source: project(), clock: realClock(), now: () => performance.now() });
        await expect(probe.update(SPEC)).rejects.toThrow(/budget\.read/);
    });

    it('uses the injected clock for its measurements', async () => {
        const ticks = [0, 10, 10, 30, 30, 35, 35, 50];
        let index = 0;
        const probe = createBudgetProbe({ source: project(), clock: realClock(), now: () => ticks[Math.min(index++, ticks.length - 1)] });
        const ms = await probe.read(ROOT, '1.10.0');
        expect(ms).toBe(5);
        probe.dispose();
    });
});
