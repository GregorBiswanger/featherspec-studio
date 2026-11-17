import { promises as fs } from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { createNodeFileSystem } from '../../adapters/node/nodeFileSystem';
import { BUDGET_MS, bestOfThree } from '../../shared/testing/timing';
import { discoverWorkspace } from './discoverWorkspace';
import { createMemoryFileSystem } from './testing/memoryFileSystem';
import { fixturePath } from './testing/fixtures';
import { snapshotTree } from './testing/snapshotTree';

const nodeFileSystem = createNodeFileSystem();
const caseSensitive = { sameRoot: (first: string, second: string) => first === second };
const caseInsensitive = { sameRoot: (first: string, second: string) => first.toLowerCase() === second.toLowerCase() };

function folder(name: string) {
    return { root: fixturePath(name), name };
}

describe('discoverWorkspace', () => {
    it('AC-001, AC-021: reports a stamped project with its version and no diagnostics', async () => {
        const result = await discoverWorkspace(nodeFileSystem, [folder('fs110-de-active-review')], caseSensitive);
        expect(result.folders).toHaveLength(1);
        expect(result.folders[0]).toMatchObject({
            name: 'fs110-de-active-review',
            verdict: 'project',
            legacy: false,
            version: '1.10.0',
            missingMarkers: [],
            diagnostics: [],
            readError: undefined,
        });
    });

    it('AC-004: a legacy project has version "unknown" and a diagnostic recommending /sdd-featherspec-update', async () => {
        const result = await discoverWorkspace(nodeFileSystem, [folder('fs-legacy-unstamped')], caseSensitive);
        expect(result.folders[0]).toMatchObject({ verdict: 'project', legacy: true, version: 'unknown' });
        expect(result.folders[0]?.diagnostics.join('\n')).toContain('/sdd-featherspec-update');
    });

    it('AC-021: version diagnostics of a project end up on its folder entry', async () => {
        const fileSystem = createMemoryFileSystem();
        fileSystem.setFile('r', 'AGENTS.md', 'FeatherSpecVersion: nightly\n');
        fileSystem.setDirectory('r', '.specs');
        const result = await discoverWorkspace(fileSystem, [{ root: 'r', name: 'r' }], caseSensitive);
        expect(result.folders[0]).toMatchObject({ verdict: 'project', version: 'nightly' });
        expect(result.folders[0]?.diagnostics.join('\n')).toContain('"nightly"');
    });

    it('AC-021: an incomplete folder with a stamped AGENTS.md also reports its version and diagnostics', async () => {
        const fileSystem = createMemoryFileSystem();
        fileSystem.setFile('r', 'AGENTS.md', 'FeatherSpecVersion:\n');
        const result = await discoverWorkspace(fileSystem, [{ root: 'r', name: 'r' }], caseSensitive);
        expect(result.folders[0]).toMatchObject({ verdict: 'incomplete', version: 'unknown' });
        expect(result.folders[0]?.diagnostics).toHaveLength(1);
    });

    it('AC-002, AC-003: not-a-project and incomplete folders keep their verdicts and missing markers', async () => {
        const result = await discoverWorkspace(
            nodeFileSystem,
            [folder('not-fs-speckit'), folder('incomplete-specs-only')],
            caseSensitive,
        );
        expect(result.folders.map((entry) => entry.verdict)).toEqual(['not-a-project', 'incomplete']);
        expect(result.folders[0]?.missingMarkers).toEqual([]);
        expect(result.folders[1]?.missingMarkers).toHaveLength(1);
    });

    it('AC-012: one entry per root folder, the case rule is injected', async () => {
        const fileSystem = createMemoryFileSystem();
        const folders = [
            { root: 'C:/Work/App', name: 'App' },
            { root: 'c:/work/app', name: 'app' },
        ];
        const insensitive = await discoverWorkspace(fileSystem, folders, caseInsensitive);
        expect(insensitive.folders).toHaveLength(1);
        expect(insensitive.folders[0]?.name).toBe('App');
        const sensitive = await discoverWorkspace(fileSystem, folders, caseSensitive);
        expect(sensitive.folders).toHaveLength(2);
    });

    it('AC-012: the same folder listed twice stays one entry and the result keeps the folder order', async () => {
        const result = await discoverWorkspace(
            nodeFileSystem,
            [folder('not-fs-agents-only'), folder('fs110-de-active-review'), folder('not-fs-agents-only')],
            caseSensitive,
        );
        expect(result.folders.map((entry) => entry.name)).toEqual(['not-fs-agents-only', 'fs110-de-active-review']);
    });

    it('AC-017: an unreadable AGENTS.md is not a project, names the reason, and the other folders finish', async () => {
        const fileSystem = createMemoryFileSystem();
        fileSystem.setUnreadable('bad', 'AGENTS.md', 'EACCES: permission denied');
        fileSystem.setDirectory('bad', '.specs');
        fileSystem.setFile('good', 'AGENTS.md', 'FeatherSpecVersion: 1.10.0\n');
        fileSystem.setDirectory('good', '.specs');
        const result = await discoverWorkspace(
            fileSystem,
            [
                { root: 'bad', name: 'bad' },
                { root: 'good', name: 'good' },
            ],
            caseSensitive,
        );
        expect(result.folders[0]).toMatchObject({ verdict: 'not-a-project', readError: 'EACCES: permission denied' });
        expect(result.folders[0]?.diagnostics.join('\n')).toContain('EACCES: permission denied');
        expect(result.folders[1]).toMatchObject({ verdict: 'project', version: '1.10.0' });
    });

    it('AC-017: the read-error diagnostic names AGENTS.md when AGENTS.md failed, even beside .specs/', async () => {
        const fileSystem = createMemoryFileSystem();
        fileSystem.setUnreadable('bad', 'AGENTS.md', 'EACCES: permission denied');
        fileSystem.setDirectory('bad', '.specs');
        const result = await discoverWorkspace(fileSystem, [{ root: 'bad', name: 'bad' }], caseSensitive);
        expect(result.folders[0]).toMatchObject({
            verdict: 'not-a-project',
            diagnostics: ['Cannot read AGENTS.md: EACCES: permission denied'],
        });
    });

    it('AC-017: a failure on another marker path names that path, not AGENTS.md', async () => {
        const fileSystem = createMemoryFileSystem();
        fileSystem.setFile('bad', 'AGENTS.md', '# no version line\n');
        fileSystem.setDirectory('bad', '.specs');
        fileSystem.setUnlistable('bad', '.claude/commands', 'EIO: i/o error');
        const result = await discoverWorkspace(fileSystem, [{ root: 'bad', name: 'bad' }], caseSensitive);
        expect(result.folders[0]).toMatchObject({
            verdict: 'not-a-project',
            readError: 'EIO: i/o error',
            diagnostics: ['Cannot read .claude/commands: EIO: i/o error'],
        });
    });

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

    it('AC-011: the fixture tree is unchanged after discovery', async () => {
        const names = ['fs110-de-active-review', 'fs-legacy-unstamped', 'incomplete-agents-only'];
        const before = await Promise.all(names.map((name) => snapshotTree(fixturePath(name))));
        expect(before.every((lines) => lines.length > 0)).toBe(true);
        await discoverWorkspace(nodeFileSystem, names.map(folder), caseSensitive);
        const after = await Promise.all(names.map((name) => snapshotTree(fixturePath(name))));
        expect(after).toEqual(before);
    });

    it('AC-011: negative control, the snapshot notices a change', async () => {
        const root = fixturePath('incomplete-specs-only');
        const before = await snapshotTree(root);
        const probe = path.join(root, 'probe.tmp');
        await fs.writeFile(probe, 'x');
        try {
            expect(await snapshotTree(root)).not.toEqual(before);
        } finally {
            await fs.rm(probe);
        }
    });
});
