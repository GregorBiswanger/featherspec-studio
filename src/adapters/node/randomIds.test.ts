import { describe, expect, it } from 'vitest';
import { createFakeCredentials, createFakeNotices, createFakeRuntimeClock } from '../../core/runtime/testing/fakes';
import { createMemoryBacking, createMemoryMedium } from '../../core/runtime/testing/memoryMedium';
import { openRuntimeStore } from '../../core/runtime/runtimeStore';
import { createRandomIds } from './randomIds';

describe('random run IDs', () => {
    it('AC-002: 10,000 runs across two projects, one cleared in between, never share an ID', async () => {
        const ids = createRandomIds();
        const clock = createFakeRuntimeClock();
        const open = (backing: ReturnType<typeof createMemoryBacking>) =>
            openRuntimeStore({
                medium: createMemoryMedium(backing),
                ids,
                clock,
                notices: createFakeNotices(),
                credentials: createFakeCredentials(),
                projectRoot: 'p',
                maxAgeDays: () => undefined,
            });
        const backingA = createMemoryBacking();
        const a = await open(backingA);
        const b = await open(createMemoryBacking());
        const seen = new Set<string>();
        const spec = { stem: '0007-board', path: '.specs/active/0007-board.md' };
        for (let index = 0; index < 5000; index += 1) {
            seen.add((await a.createRun({ providerId: 'fake', spec })).runId);
            if (index === 2499) {
                backingA.files.clear();
            }
            seen.add((await b.createRun({ providerId: 'fake', spec })).runId);
        }
        expect(seen.size).toBe(10_000);
    });

    it('AC-002: negative control, a counter-based source repeats IDs across projects', () => {
        const first = { next: 0 };
        const second = { next: 0 };
        expect(`run-${++first.next}`).toBe(`run-${++second.next}`);
        expect(createRandomIds().newId()).not.toBe(createRandomIds().newId());
    });
});
