import { describe, expect, it } from 'vitest';
import { createRandomIds } from './randomIds';

describe('random IDs', () => {
    it('AC-002: 10,000 IDs from one source never repeat, and two sources never share one', () => {
        const first = createRandomIds();
        const second = createRandomIds();
        const seen = new Set<string>();
        for (let index = 0; index < 5000; index += 1) {
            seen.add(first.newId());
            seen.add(second.newId());
        }
        expect(seen.size).toBe(10_000);
    });

    it('AC-002: negative control, a counter-based source repeats IDs across sources', () => {
        const first = { next: 0 };
        const second = { next: 0 };
        expect(`run-${++first.next}`).toBe(`run-${++second.next}`);
        expect(createRandomIds().newId()).not.toBe(createRandomIds().newId());
    });
});
