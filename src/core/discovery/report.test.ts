import { describe, expect, it } from 'vitest';
import { discoverWorkspace, type DiscoveredFolder } from './discoverWorkspace';
import { createMemoryFileSystem } from './testing/memoryFileSystem';
import { buildNoProjectNotification, buildSelectItems, formatOutputBlock, SETUP_GUIDE_URL } from './report';

function entry(name: string, overrides: Partial<DiscoveredFolder> = {}): DiscoveredFolder {
    return {
        root: `/work/${name}`,
        name,
        verdict: 'project',
        legacy: false,
        version: '1.10.0',
        missingMarkers: [],
        diagnostics: [],
        readError: undefined,
        ...overrides,
    };
}

function block(folders: DiscoveredFolder[]): string {
    return formatOutputBlock({ folders }, 'run 1').join('\n');
}

describe('formatOutputBlock', () => {
    it('AC-016: lists path, verdict and version of a project', () => {
        const text = block([entry('app')]);
        expect(text).toContain('/work/app');
        expect(text).toContain('verdict: project');
        expect(text).toContain('version: 1.10.0');
    });

    it('AC-016: marks a legacy project and lists its diagnostics', () => {
        const text = block([entry('old', { legacy: true, version: 'unknown', diagnostics: ['run /sdd-featherspec-update'] })]);
        expect(text).toContain('verdict: project (legacy)');
        expect(text).toContain('diagnostic: run /sdd-featherspec-update');
    });

    it('AC-003: names every missing marker of an incomplete folder', () => {
        const text = block([entry('half', { verdict: 'incomplete', missingMarkers: ['.specs/ directory', 'second marker'] })]);
        expect(text).toContain('verdict: incomplete');
        expect(text).toContain('missing: .specs/ directory');
        expect(text).toContain('missing: second marker');
    });

    it('AC-016: a not-a-project folder gets the hint and no missing-prerequisite line', () => {
        const text = block([entry('plain', { verdict: 'not-a-project', version: 'unknown' })]);
        expect(text).toContain('verdict: not a project');
        expect(text).toContain('open the project folder itself');
        expect(text).not.toContain('missing:');
    });

    it('AC-016: negative control, a project folder carries no hint', () => {
        expect(block([entry('app')])).not.toContain('open the project folder itself');
    });

    it('AC-017: a read error shows the path and the reason, without the location hint', () => {
        const text = block([
            entry('bad', {
                verdict: 'not-a-project',
                version: 'unknown',
                readError: 'EACCES: permission denied',
                diagnostics: ['Cannot read AGENTS.md: EACCES: permission denied'],
            }),
        ]);
        expect(text).toContain('/work/bad');
        expect(text).toContain('EACCES: permission denied');
        expect(text).not.toContain('open the project folder itself');
    });

    it('AC-016, AC-017: an unreadable AGENTS.md beside .specs/ shows path, failed path and reason and no hint; a folder without marker keeps the hint', async () => {
        const fileSystem = createMemoryFileSystem();
        fileSystem.setUnreadable('bad', 'AGENTS.md', 'EACCES: permission denied');
        fileSystem.setDirectory('bad', '.specs');
        fileSystem.setFile('plain', 'README.md', 'x');
        const result = await discoverWorkspace(
            fileSystem,
            [
                { root: 'bad', name: 'bad' },
                { root: 'plain', name: 'plain' },
            ],
            { sameRoot: (first, second) => first === second },
        );
        const lines = formatOutputBlock(result, 'run 1');
        const badEntry = lines.slice(lines.indexOf('bad'), lines.indexOf('plain'));
        const plainEntry = lines.slice(lines.indexOf('plain'));
        expect(badEntry).toContain('  verdict: not a project');
        expect(badEntry).toContain('  diagnostic: Cannot read AGENTS.md: EACCES: permission denied');
        expect(badEntry).not.toContain('  hint: open the project folder itself');
        expect(plainEntry).toContain('  hint: open the project folder itself');
    });

    it('AC-016: shows the display path instead of the root identity when the host supplies one', () => {
        const lines = formatOutputBlock({ folders: [entry('app', { root: 'file:///c%3A/app', displayPath: 'c:\\app' })] }, 'run 1');
        expect(lines).toContain('c:\\app');
        expect(lines).not.toContain('file:///c%3A/app');
    });

    it('AC-016: one entry per folder with the run label as header', () => {
        const lines = formatOutputBlock({ folders: [entry('a'), entry('b')] }, 'run 7');
        expect(lines[0]).toContain('run 7');
        expect(lines.filter((line) => line.startsWith('/work/'))).toEqual(['/work/a', '/work/b']);
    });

    it('AC-016: an empty workspace says so', () => {
        expect(block([])).toContain('No workspace folder is open');
    });
});

describe('buildSelectItems', () => {
    it('AC-008: lists every project with folder path beside the name', () => {
        const items = buildSelectItems({ folders: [entry('a'), entry('b', { version: '1.2.0' })] });
        expect(items).toEqual([
            { label: 'a', description: '1.10.0', detail: '/work/a', root: '/work/a' },
            { label: 'b', description: '1.2.0', detail: '/work/b', root: '/work/b' },
        ]);
    });

    it('AC-003: never lists incomplete or not-a-project folders', () => {
        const items = buildSelectItems({
            folders: [entry('a'), entry('half', { verdict: 'incomplete' }), entry('plain', { verdict: 'not-a-project' })],
        });
        expect(items.map((item) => item.label)).toEqual(['a']);
    });

    it('AC-008: the select list shows the display path as detail and keeps the root identity', () => {
        const items = buildSelectItems({ folders: [entry('app', { root: 'file:///c%3A/app', displayPath: 'c:\\app' })] });
        expect(items[0]).toMatchObject({ detail: 'c:\\app', root: 'file:///c%3A/app' });
    });

    it('AC-012: a legacy project is listed once with version unknown', () => {
        const items = buildSelectItems({ folders: [entry('old', { legacy: true, version: 'unknown' })] });
        expect(items).toHaveLength(1);
        expect(items[0]?.description).toBe('unknown');
    });
});

describe('buildNoProjectNotification', () => {
    it('AC-015: offers the setup guide and refresh when folders are open', () => {
        expect(buildNoProjectNotification(2)).toEqual({
            message: 'No FeatherSpec project found in this workspace',
            actions: ['Open setup guide', 'Refresh'],
        });
    });

    it('AC-015: with no folder open it asks to open one, without actions', () => {
        expect(buildNoProjectNotification(0)).toEqual({
            message: 'Open a folder to use FeatherSpec Studio',
            actions: [],
        });
    });

    it('AC-015: the setup guide is the FeatherSpec wiki home (A-005)', () => {
        expect(SETUP_GUIDE_URL).toBe('https://github.com/GregorBiswanger/featherspec/wiki');
    });
});
