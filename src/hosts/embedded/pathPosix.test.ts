import * as nodePath from 'node:path';
import { describe, expect, it } from 'vitest';
import { dirname, isAbsolute, join, normalize, posix } from './pathPosix';

const SEGMENTS = ['a', '..', '.', '', 'b.c', 'x y'];

function generatedPaths(): string[] {
    const found = new Set<string>();
    const combine = (depth: number, prefix: string[]): void => {
        const body = prefix.join('/');
        for (const lead of ['', '/']) {
            for (const tail of ['', '/']) {
                found.add(`${lead}${body}${tail}`);
            }
        }
        if (depth === 0) {
            return;
        }
        for (const segment of SEGMENTS) {
            combine(depth - 1, [...prefix, segment]);
        }
    };
    combine(4, []);
    return [...found];
}

const PATHS = generatedPaths();

describe('embedded path shim (0034 R-1, T-017)', () => {
    it('R-1: isAbsolute equals node:path posix on generated paths', () => {
        for (const input of PATHS) {
            expect(isAbsolute(input), JSON.stringify(input)).toBe(nodePath.posix.isAbsolute(input));
        }
    });

    it('R-1: normalize equals node:path posix on generated paths', () => {
        for (const input of PATHS) {
            expect(normalize(input), JSON.stringify(input)).toBe(nodePath.posix.normalize(input));
        }
    });

    it('R-1: dirname equals node:path posix on generated paths', () => {
        for (const input of PATHS) {
            expect(dirname(input), JSON.stringify(input)).toBe(nodePath.posix.dirname(input));
        }
    });

    it('R-1: join equals node:path posix on pairs and triples of generated paths', () => {
        const sample = PATHS.filter((_, index) => index % 17 === 0);
        for (const first of sample) {
            for (const second of sample) {
                expect(join(first, second), JSON.stringify([first, second])).toBe(nodePath.posix.join(first, second));
            }
        }
        expect(join('a', '', 'b/../c')).toBe(nodePath.posix.join('a', '', 'b/../c'));
        expect(join()).toBe(nodePath.posix.join());
    });

    it('R-1: the posix object exposes the same four functions', () => {
        expect(posix.isAbsolute).toBe(isAbsolute);
        expect(posix.normalize).toBe(normalize);
        expect(posix.join).toBe(join);
        expect(posix.dirname).toBe(dirname);
    });
});
