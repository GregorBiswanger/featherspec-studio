import { describe, expect, it } from 'vitest';
import { percentOf } from './percent';

describe('0025 AC-012 percentOf', () => {
    it.each([
        [4, 6, 67],
        [5, 6, 83],
        [199, 200, 99],
        [6, 6, 100],
        [0, 3, 0],
        [1, 8, 13],
        [1, 200, 1],
        [1, 1000, 0],
        [999, 1000, 99],
    ])('0025 AC-012: %i of %i gives %i', (done, total, expected) => {
        expect(percentOf(done, total)).toBe(expected);
    });

    it('0025 AC-012: a total of 0 gives no value', () => {
        expect(percentOf(0, 0)).toBeUndefined();
    });
});
