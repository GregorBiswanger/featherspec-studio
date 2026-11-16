import { describe, expect, it } from 'vitest';
import { fallbackFocus, moveFocus, type Direction, type Grid } from './focusModel';

const GRID: Grid = [['b1', 'b2'], [], ['a1', 'a2', 'a3'], ['r1'], [], ['x1', 'x2']];

describe('AC-017: arrow keys on the board', () => {
    it.each<[string, Direction, string | undefined]>([
        ['a1', 'down', 'a2'],
        ['a2', 'down', 'a3'],
        ['a3', 'down', undefined],
        ['a2', 'up', 'a1'],
        ['a1', 'up', undefined],
        ['b2', 'right', 'a2'],
        ['a3', 'right', 'r1'],
        ['r1', 'right', 'x1'],
        ['a2', 'left', 'b2'],
        ['a1', 'left', 'b1'],
        ['x2', 'left', 'r1'],
        ['b1', 'left', undefined],
        ['x2', 'right', undefined],
    ])('%s %s goes to %s: the nearest column with a card, the same index or else its last card', (key, direction, expected) => {
        expect(moveFocus(GRID, key, direction)).toBe(expected);
    });

    it('a key that is not on the board goes nowhere', () => {
        expect(moveFocus(GRID, 'zz', 'down')).toBeUndefined();
    });
});

describe('AC-019: focus after a live update when the card is gone', () => {
    it('stays with the card where it still exists, wherever it is now', () => {
        expect(fallbackFocus(GRID, 'a2', [['a2'], [], [], [], [], []])).toBe('a2');
    });

    it('goes to the card at the same index in the same column', () => {
        expect(fallbackFocus(GRID, 'a2', [[], [], ['a1', 'n2', 'a3'], [], [], []])).toBe('n2');
    });

    it('goes to the last card of the column when the index is gone', () => {
        expect(fallbackFocus(GRID, 'a3', [[], [], ['a1'], [], [], []])).toBe('a1');
    });

    it('goes to the first card of the nearest column with cards when the column is empty', () => {
        expect(fallbackFocus(GRID, 'a1', [['b1'], [], [], ['r1', 'r2'], [], ['x1']])).toBe('r1');
        expect(fallbackFocus(GRID, 'r1', [['b1'], [], [], [], [], []])).toBe('b1');
    });

    it('ties between two nearest columns go to the left one', () => {
        expect(fallbackFocus(GRID, 'a1', [['b1'], [], [], [], ['d1'], []])).toBe('b1');
    });

    it('goes nowhere (the board container) when no card is left, or the key was never on the board', () => {
        expect(fallbackFocus(GRID, 'a1', [[], [], [], [], [], []])).toBeUndefined();
        expect(fallbackFocus(GRID, 'zz', GRID)).toBeUndefined();
    });
});
