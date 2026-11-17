import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildMergePrompt, gatherParkedFiles } from './mergePrompt';
import { createMemoryTarget } from './testing/memoryTarget';

const ROOT = 'file:///w';

describe('0014 AC-016: the merge prompt', () => {
    it('matches the golden file', () => {
        const golden = readFileSync(path.resolve(__dirname, 'mergePrompt.golden.txt'), 'utf8');
        expect(buildMergePrompt('/work/tip-splitter', ['.vscode/settings.json', 'AGENTS.md', 'CLAUDE.md'])).toBe(golden);
    });

    it('names the target folder by its path, and for every file the user\'s file and the parked copy at the same relative path', () => {
        const prompt = buildMergePrompt('C:\\work\\my app', ['docs/guide.md', 'AGENTS.md']);
        expect(prompt).toContain('the folder C:\\work\\my app.');
        expect(prompt).toContain('- docs/guide.md (existing file) and .featherspec-setup/docs/guide.md (FeatherSpec copy)');
        expect(prompt).toContain('- AGENTS.md (existing file) and .featherspec-setup/AGENTS.md (FeatherSpec copy)');
    });

    it('tells the assistant to keep all content, add the missing sections, give AGENTS.md the release version line, delete the folder and hand /sdd-setup to the user', () => {
        const prompt = buildMergePrompt('/w', ['AGENTS.md']);
        expect(prompt).toContain('Keep all of the existing content. Add the sections');
        expect(prompt).toContain('use the FeatherSpecVersion: line of the FeatherSpec copy');
        expect(prompt).toContain('delete the folder .featherspec-setup/');
        expect(prompt).toContain('run /sdd-setup themselves. You cannot start it.');
    });

    it('negative control: without AGENTS.md among the files there is no instruction about the version line', () => {
        expect(buildMergePrompt('/w', ['CLAUDE.md'])).not.toContain('FeatherSpecVersion');
    });

    it('uses LF line endings only', () => {
        expect(buildMergePrompt('/w', ['a.md'])).not.toContain('\r');
    });
});

describe('0014 AC-016: the files below .featherspec-setup/', () => {
    it('lists every file, nested ones with their relative path, sorted, without the .gitignore of the folder itself', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.featherspec-setup/.gitignore', '*\n');
        target.setFile(ROOT, '.featherspec-setup/CLAUDE.md', 'x');
        target.setFile(ROOT, '.featherspec-setup/AGENTS.md', 'x');
        target.setFile(ROOT, '.featherspec-setup/.vscode/settings.json', 'x');
        target.setFile(ROOT, '.featherspec-setup/docs/deep/a.md', 'x');
        expect(await gatherParkedFiles(target, ROOT)).toEqual(['.vscode/settings.json', 'AGENTS.md', 'CLAUDE.md', 'docs/deep/a.md']);
    });

    it('a .gitignore deeper down is a file to merge (only the root one is the folder\'s own)', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.featherspec-setup/.gitignore', '*\n');
        target.setFile(ROOT, '.featherspec-setup/sub/.gitignore', 'x');
        expect(await gatherParkedFiles(target, ROOT)).toEqual(['sub/.gitignore']);
    });

    it('no folder, or only its .gitignore, gives no file', async () => {
        const target = createMemoryTarget();
        expect(await gatherParkedFiles(target, ROOT)).toEqual([]);
        target.setFile(ROOT, '.featherspec-setup/.gitignore', '*\n');
        expect(await gatherParkedFiles(target, ROOT)).toEqual([]);
    });
});
