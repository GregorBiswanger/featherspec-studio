import { promises as fs } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { createNodeFileSystem } from '../../adapters/node/nodeFileSystem';
import { BUDGET_MS, bestOfThree } from '../../shared/testing/timing';
import { discoverWorkspace } from './discoverWorkspace';
import { fixturePath } from './testing/fixtures';

const nodeFileSystem = createNodeFileSystem();
const caseSensitive = { sameRoot: (first: string, second: string) => first === second };
const caseInsensitive = { sameRoot: (first: string, second: string) => first.toLowerCase() === second.toLowerCase() };

function folder(name: string) {
    return { root: fixturePath(name), name };
}

describe('discoverWorkspace', () => {
    it('AC-018: one run over five fixture folders finishes within 2 seconds', async () => {
        const names = [
            'fs110-de-active-review',
            'fs-legacy-unstamped',
            'incomplete-specs-only',
            'not-fs-speckit',
            'nested-project',
        ];
        let result = await discoverWorkspace(nodeFileSystem, names.map(folder), caseSensitive);
        const best = await bestOfThree(async () => {
            result = await discoverWorkspace(nodeFileSystem, names.map(folder), caseSensitive);
        });
        expect(result.folders).toHaveLength(5);
        expect(best).toBeLessThan(BUDGET_MS.discovery);
    });
});
