import { describe, expect, it } from 'vitest';
import { createNodeFileSystem } from '../../adapters/node/nodeFileSystem';
import { classifyFolder } from './classifyFolder';
import { createMemoryFileSystem } from './testing/memoryFileSystem';
import { fixturePath } from './testing/fixtures';

const nodeFileSystem = createNodeFileSystem();

async function classifyFixture(name: string) {
    return classifyFolder(nodeFileSystem, fixturePath(name));
}

describe('classifyFolder', () => {
    it('AC-001: a folder with a stamped AGENTS.md and .specs/ is a project', async () => {
        const result = await classifyFixture('fs110-de-active-review');
        expect(result.verdict).toBe('project');
        expect(result.legacy).toBe(false);
        expect(result.missingMarkers).toEqual([]);
        expect(result.agentsText).toContain('FeatherSpecVersion: 1.10.0');
    });

    it.each(['not-fs-agents-only', 'not-fs-speckit', 'not-fs-memory-bank-only', 'not-fs-claude-md-only'])(
        'AC-002: %s is not a project and carries no missing marker',
        async (name) => {
            const result = await classifyFixture(name);
            expect(result.verdict).toBe('not-a-project');
            expect(result.missingMarkers).toEqual([]);
            expect(result.legacy).toBe(false);
        },
    );

    it('AC-003: .specs/ without the stamped AGENTS.md is incomplete and names M1', async () => {
        const result = await classifyFixture('incomplete-specs-only');
        expect(result.verdict).toBe('incomplete');
        expect(result.missingMarkers).toEqual(['AGENTS.md with a FeatherSpecVersion: line']);
    });

    it('AC-003: a stamped AGENTS.md without .specs/ is incomplete and names M2', async () => {
        const result = await classifyFixture('incomplete-agents-only');
        expect(result.verdict).toBe('incomplete');
        expect(result.missingMarkers).toEqual(['.specs/ directory']);
    });

    it('AC-004: an unstamped AGENTS.md with .specs/ and an sdd command is a legacy project', async () => {
        const result = await classifyFixture('fs-legacy-unstamped');
        expect(result.verdict).toBe('project');
        expect(result.legacy).toBe(true);
        expect(result.missingMarkers).toEqual([]);
    });

    it('AC-004: negative control, the same layout without any sdd command is incomplete', async () => {
        const fileSystem = createMemoryFileSystem();
        fileSystem.setFile('r', 'AGENTS.md', '# Constitution\n');
        fileSystem.setDirectory('r', '.specs');
        fileSystem.setFile('r', '.claude/commands/other.md', 'x');
        const result = await classifyFolder(fileSystem, 'r');
        expect(result.verdict).toBe('incomplete');
        expect(result.legacy).toBe(false);
    });

    it('AC-004: negative control, a stamped project is never legacy even with sdd commands', async () => {
        const fileSystem = createMemoryFileSystem();
        fileSystem.setFile('r', 'AGENTS.md', 'FeatherSpecVersion: 1.2.0\n');
        fileSystem.setDirectory('r', '.specs');
        fileSystem.setFile('r', '.claude/commands/sdd-plan.md', 'x');
        const result = await classifyFolder(fileSystem, 'r');
        expect(result.verdict).toBe('project');
        expect(result.legacy).toBe(false);
    });

    it('AC-006: markers in a subfolder do not make the folder a project', async () => {
        const result = await classifyFixture('nested-project');
        expect(result.verdict).toBe('not-a-project');
        expect(result.missingMarkers).toEqual([]);
    });

    it('AC-006: negative control, the same markers at the root make a project', async () => {
        const result = await classifyFolder(nodeFileSystem, `${fixturePath('nested-project')}/sub`);
        expect(result.verdict).toBe('project');
    });

    it('AC-021, BR-07: M1 needs the version line to start the line; FeatherSpecVersion: mid-line leaves the folder incomplete', async () => {
        const fileSystem = createMemoryFileSystem();
        fileSystem.setFile('r', 'AGENTS.md', 'Set FeatherSpecVersion: 1.10.0 in the file\n');
        fileSystem.setDirectory('r', '.specs');
        expect((await classifyFolder(fileSystem, 'r')).verdict).toBe('incomplete');
    });

    it('AC-021, BR-07: negative control, an indented version line is M1', async () => {
        const fileSystem = createMemoryFileSystem();
        fileSystem.setFile('r', 'AGENTS.md', '  FeatherSpecVersion: 1.10.0\n');
        fileSystem.setDirectory('r', '.specs');
        expect((await classifyFolder(fileSystem, 'r')).verdict).toBe('project');
    });

    it('AC-001: a .specs file instead of a directory does not count as M2', async () => {
        const fileSystem = createMemoryFileSystem();
        fileSystem.setFile('r', 'AGENTS.md', 'FeatherSpecVersion: 1.10.0\n');
        fileSystem.setFile('r', '.specs', 'not a directory');
        const result = await classifyFolder(fileSystem, 'r');
        expect(result.verdict).toBe('incomplete');
    });

    it('AC-001: an AGENTS.md directory does not count as M1', async () => {
        const fileSystem = createMemoryFileSystem();
        fileSystem.setDirectory('r', 'AGENTS.md');
        fileSystem.setDirectory('r', '.specs');
        const result = await classifyFolder(fileSystem, 'r');
        expect(result.verdict).toBe('incomplete');
        expect(result.agentsText).toBeUndefined();
    });
});
