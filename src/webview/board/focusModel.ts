export type Direction = 'up' | 'down' | 'left' | 'right';

export type Grid = readonly (readonly string[])[];

interface Position {
    readonly column: number;
    readonly index: number;
}

function locate(grid: Grid, key: string): Position | undefined {
    for (let column = 0; column < grid.length; column += 1) {
        const index = grid[column].indexOf(key);
        if (index >= 0) {
            return { column, index };
        }
    }
    return undefined;
}

function pick(cards: readonly string[], index: number): string | undefined {
    if (cards.length === 0) {
        return undefined;
    }
    return cards[Math.min(index, cards.length - 1)];
}

export function moveFocus(grid: Grid, key: string, direction: Direction): string | undefined {
    const position = locate(grid, key);
    if (position === undefined) {
        return undefined;
    }
    if (direction === 'up' || direction === 'down') {
        const step = direction === 'up' ? -1 : 1;
        return grid[position.column][position.index + step];
    }
    const step = direction === 'left' ? -1 : 1;
    for (let column = position.column + step; column >= 0 && column < grid.length; column += step) {
        const target = pick(grid[column], position.index);
        if (target !== undefined) {
            return target;
        }
    }
    return undefined;
}

export function fallbackFocus(previous: Grid, key: string, next: Grid): string | undefined {
    if (locate(next, key) !== undefined) {
        return key;
    }
    const position = locate(previous, key);
    if (position === undefined) {
        return undefined;
    }
    const sameColumn = next[position.column];
    if (sameColumn !== undefined) {
        const target = pick(sameColumn, position.index);
        if (target !== undefined) {
            return target;
        }
    }
    for (let distance = 1; distance < Math.max(next.length, position.column + 1); distance += 1) {
        for (const column of [position.column - distance, position.column + distance]) {
            const cards = next[column];
            if (cards !== undefined && cards.length > 0) {
                return cards[0];
            }
        }
    }
    return undefined;
}
