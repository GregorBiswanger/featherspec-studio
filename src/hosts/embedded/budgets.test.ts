import { describe, expect, it } from 'vitest';
import { createMemorySpecSource } from '../../core/specs/testing/memorySpecSource';
import type { ClockPort } from '../../core/ports/host';
import { createMemoryFileSystem } from '../../core/discovery/testing/memoryFileSystem';
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

function counting() {
    const counts = { calls: 0, frames: 0 };
    return { counts, stats: () => ({ ...counts }) };
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
        const probe = createBudgetProbe({ source, fileSystem: createMemoryFileSystem(), sameRoot: (a, b) => a === b, clock: realClock(), now: () => performance.now(), stats: counting().stats });
        const { ms } = await probe.read(ROOT, '1.10.0');
        expect(ms).toBeGreaterThanOrEqual(0);
        expect(ms).toBeLessThan(2000);
        expect(source.reads().length).toBeGreaterThan(0);
        probe.dispose();
    });

    it('measures the update from the fired file event to the change notification', async () => {
        const source = project();
        const probe = createBudgetProbe({ source, fileSystem: createMemoryFileSystem(), sameRoot: (a, b) => a === b, clock: realClock(), now: () => performance.now(), stats: counting().stats });
        await probe.read(ROOT, '1.10.0');
        source.setFile(ROOT, SPEC, '# A spec\n\n**Status:** In Progress\n**Plan:** _none yet_\n\nedited\n');
        const { ms } = await probe.update(SPEC);
        expect(ms).toBeGreaterThanOrEqual(150);
        expect(ms).toBeLessThan(1000);
        probe.dispose();
    });

    it('refuses an update before a read', async () => {
        const probe = createBudgetProbe({ source: project(), fileSystem: createMemoryFileSystem(), sameRoot: (a, b) => a === b, clock: realClock(), now: () => performance.now(), stats: counting().stats });
        await expect(probe.update(SPEC)).rejects.toThrow(/budget\.read/);
    });

    it('uses the injected clock for its measurements', async () => {
        const ticks = [0, 10, 10, 30, 30, 35, 35, 50];
        let index = 0;
        const probe = createBudgetProbe({ source: project(), fileSystem: createMemoryFileSystem(), sameRoot: (a, b) => a === b, clock: realClock(), now: () => ticks[Math.min(index++, ticks.length - 1)], stats: counting().stats });
        const { ms } = await probe.read(ROOT, '1.10.0');
        expect(ms).toBe(5);
        probe.dispose();
    });

    it('reports the calls and frames the best read attempt used, from the injected counters', async () => {
        const source = project();
        const { counts, stats } = counting();
        const wrapped = {
            ...source,
            stat: async (...args: Parameters<typeof source.stat>) => {
                counts.calls += 1;
                counts.frames += 1;
                return source.stat(...args);
            },
        };
        const probe = createBudgetProbe({ source: wrapped, fileSystem: createMemoryFileSystem(), sameRoot: (a, b) => a === b, clock: realClock(), now: () => performance.now(), stats });
        const read = await probe.read(ROOT, '1.10.0');
        expect(read.calls).toBeGreaterThan(0);
        expect(read.frames).toBe(read.calls);
        expect(read.calls).toBeLessThan(counts.calls);
        probe.dispose();
    });

    it('reports the calls and frames an update used, from the injected counters', async () => {
        const source = project();
        const { counts, stats } = counting();
        const probe = createBudgetProbe({ source, fileSystem: createMemoryFileSystem(), sameRoot: (a, b) => a === b, clock: realClock(), now: () => performance.now(), stats });
        await probe.read(ROOT, '1.10.0');
        const baseline = { ...counts };
        const wrapped = source.stat.bind(source);
        source.stat = async (...args: Parameters<typeof source.stat>) => {
            counts.calls += 1;
            counts.frames += 1;
            return wrapped(...args);
        };
        source.setFile(ROOT, SPEC, '# A spec\n\n**Status:** In Progress\n**Plan:** _none yet_\n\nedited\n');
        const update = await probe.update(SPEC);
        expect(update.calls).toBe(counts.calls - baseline.calls);
        expect(update.frames).toBe(counts.frames - baseline.frames);
        expect(update.calls).toBeGreaterThan(0);
        probe.dispose();
    });

    it('discover measures the best of three discovery runs over the given roots through the injected file system', async () => {
        const fileSystem = createMemoryFileSystem();
        const roots = ['file:///work/a', 'file:///work/b', 'file:///work/c'];
        for (const root of roots) {
            fileSystem.setFile(root, 'AGENTS.md', 'FeatherSpecVersion: 1.10.0\n');
            fileSystem.setDirectory(root, '.specs');
        }
        const { counts, stats } = counting();
        const stat = fileSystem.stat.bind(fileSystem);
        fileSystem.stat = async (...args: Parameters<typeof fileSystem.stat>) => {
            counts.calls += 1;
            counts.frames += 1;
            return stat(...args);
        };
        const probe = createBudgetProbe({ source: project(), fileSystem, sameRoot: (a, b) => a === b, clock: realClock(), now: () => performance.now(), stats });
        const measure = await probe.discover(roots);
        expect(measure.ms).toBeGreaterThanOrEqual(0);
        expect(measure.ms).toBeLessThan(2000);
        expect(measure.calls).toBeGreaterThan(0);
        expect(measure.calls).toBeLessThan(counts.calls);
        expect(measure.frames).toBe(measure.calls);
        probe.dispose();
    });
});
