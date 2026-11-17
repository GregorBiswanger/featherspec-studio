import { describe, expect, it } from 'vitest';
import { releaseEntries, tarGz } from '../../adapters/node/testing/tarWriter';
import { archiveUrl } from './releaseDownload';
import { buildMergePrompt } from './mergePrompt';
import { reply } from './testing/scriptedHttp';
import { createSetupWorld, folderAt, LATEST, TAG_URL, type SetupWorld, type SetupWorldOptions } from './testing/setupWorld';

const ROOT = 'file:///w/plain';
const SMALL_ENTRIES = [
    { path: 'top/CLAUDE.md', content: '@AGENTS.md\n' },
    { path: 'top/.claude/rules/a.md', content: 'rule a\n' },
    { path: 'top/.gitignore', content: '# state\n.sdd-scan/\n' },
    { path: 'top/.vscode/settings.json', content: '{"x": true, "y": 1}' },
];
const SMALL = tarGz(releaseEntries('top', '2.0.0', SMALL_ENTRIES));

function small(options: SetupWorldOptions = {}): SetupWorld {
    return createSetupWorld({
        releaseBytes: SMALL,
        routes: { [LATEST]: reply(302, { location: TAG_URL }), [archiveUrl('v1.10.0')]: reply(200, {}, [SMALL]) },
        ...options,
    });
}

async function run(world: SetupWorld): Promise<SetupWorld> {
    await world.service.start();
    await world.service.whenIdle();
    return world;
}

function noticeTexts(world: SetupWorld): string[] {
    return world.ui.notices.map((notice) => notice.message);
}

describe('0014 AC-017: the final message', () => {
    it('without kept files: set up, next step /sdd-setup, "Copy /sdd-setup" copies the command, no chat is opened', async () => {
        const world = small();
        world.ui.noticeAnswer = () => 'Copy /sdd-setup';
        await run(world);
        expect(world.ui.notices).toEqual([{ message: 'FeatherSpec 2.0.0 is set up in plain. Open the AI assistant of your choice and run /sdd-setup.', actions: ['Copy /sdd-setup'] }]);
        expect(world.ui.copied).toEqual(['/sdd-setup']);
        expect(world.actions.calls).toEqual([]);
    });

    it('with kept files: "files were added", the count with the plural, "Copy merge prompt" copies the prompt of the parked files', async () => {
        const world = small();
        world.target.setFile(ROOT, 'CLAUDE.md', 'mine\n');
        world.target.setFile(ROOT, '.claude/rules/a.md', 'my rule\n');
        world.ui.noticeAnswer = () => 'Copy merge prompt';
        await run(world);
        expect(world.ui.notices).toEqual([
            { message: 'FeatherSpec 2.0.0 files were added to plain. 2 existing files were kept: merge them with your AI assistant, then run /sdd-setup.', actions: ['Copy merge prompt'] },
        ]);
        expect(world.ui.copied).toEqual([buildMergePrompt('file:///w/plain', ['.claude/rules/a.md', 'CLAUDE.md'])]);
    });

    it('with one kept file the text is singular', async () => {
        const world = small();
        world.target.setFile(ROOT, 'CLAUDE.md', 'mine\n');
        await run(world);
        expect(noticeTexts(world)).toEqual(['FeatherSpec 2.0.0 files were added to plain. 1 existing file was kept: merge them with your AI assistant, then run /sdd-setup.']);
    });

    it('declining the action copies nothing', async () => {
        const world = small();
        await run(world);
        expect(world.ui.copied).toEqual([]);
    });

    it('a setup that finds every file the same still ends as set up', async () => {
        const first = await run(small());
        const again = small();
        for (const name of first.target.files(ROOT)) {
            again.target.setFile(ROOT, name, first.target.text(ROOT, name) ?? '');
        }
        await run(again);
        expect(noticeTexts(again)).toEqual(['FeatherSpec 2.0.0 is set up in plain. Open the AI assistant of your choice and run /sdd-setup.']);
    });
});

describe('0014 AC-018: discovery reruns after the last write', () => {
    it('once, after the files are written, when at least one file was written', async () => {
        const world = small();
        let writesAtRefresh = -1;
        world.discovery.onRefresh = () => {
            writesAtRefresh = world.target.log.length;
        };
        await run(world);
        expect(world.discovery.refreshes).toBe(1);
        expect(writesAtRefresh).toBe(world.target.log.length);
        expect(world.target.log.length).toBeGreaterThan(0);
    });

    it('also when the setup stopped after writing some files', async () => {
        const world = small();
        world.target.failOn('.gitignore', 'EIO');
        await run(world);
        expect(world.discovery.refreshes).toBe(1);
    });

    it('not when nothing was written: declined, cancelled, a refused archive, or every file the same', async () => {
        const declined = small();
        declined.ui.confirmAnswer = false;
        await run(declined);
        const refused = small({ releaseBytes: SMALL, routes: { [LATEST]: reply(404) } });
        await run(refused);
        expect(declined.discovery.refreshes).toBe(0);
        expect(refused.discovery.refreshes).toBe(0);
        const first = await run(small());
        const again = small();
        for (const name of first.target.files(ROOT)) {
            again.target.setFile(ROOT, name, first.target.text(ROOT, name) ?? '');
        }
        await run(again);
        expect(again.discovery.refreshes).toBe(0);
    });

    it('a failing rerun does not turn a finished setup into an error', async () => {
        const world = small();
        world.discovery.refresh = async () => {
            throw new Error('discovery broke');
        };
        await run(world);
        expect(noticeTexts(world)[0]).toContain('is set up in plain');
    });
});

describe('0014 AC-020: a write that fails', () => {
    it('shows the path and the reason of the file system with "Retry" and "Show output", and AGENTS.md is not there', async () => {
        const world = small();
        world.target.failOn('.claude/rules/a.md', 'EACCES: permission denied');
        world.ui.noticeAnswer = () => 'Show output';
        await run(world);
        expect(world.ui.notices).toEqual([{ message: 'FeatherSpec setup stopped: .claude/rules/a.md could not be written (EACCES: permission denied).', actions: ['Retry', 'Show output'] }]);
        expect(world.actions.calls).toEqual(['showOutput']);
        expect(await world.target.kind(ROOT, 'AGENTS.md')).toBeUndefined();
    });

    it('"Retry" runs the setup again for the same target from the download on, confirmation included, and creates only what is missing', async () => {
        const world = createSetupWorld({
            folders: [folderAt('a', 'not-a-project'), folderAt('plain', 'not-a-project')],
            releaseBytes: SMALL,
            routes: { [LATEST]: reply(302, { location: TAG_URL }), [archiveUrl('v1.10.0')]: reply(200, {}, [SMALL]) },
        });
        world.ui.pickAnswer = () => 'file:///w/plain';
        world.target.failOn('.gitignore', 'EACCES: permission denied');
        world.ui.noticeAnswer = (message) => {
            if (message.startsWith('FeatherSpec setup stopped')) {
                world.target.failOn('.gitignore', '');
                world.target.clearFailures();
                return 'Retry';
            }
            return undefined;
        };
        await world.service.start();
        await world.service.whenIdle();
        expect(world.ui.picks).toHaveLength(1);
        expect(world.ui.confirmations).toHaveLength(2);
        expect(world.ui.confirmations[1]?.detail).toBe('file:///w/plain\n\n3 files will be created.');
        expect(world.ui.progressTitles).toHaveLength(2);
        expect(world.http.requests).toHaveLength(4);
        expect(noticeTexts(world)).toEqual(['FeatherSpec setup stopped: .gitignore could not be written (EACCES: permission denied).', 'FeatherSpec 2.0.0 is set up in plain. Open the AI assistant of your choice and run /sdd-setup.']);
        expect(world.target.files(ROOT)).toContain('AGENTS.md');
    });
});

describe('0014 AC-020: "Retry" when its target is no longer eligible', () => {
    function stoppingWorld(folders: Parameters<typeof folderAt>[]): SetupWorld {
        const world = createSetupWorld({
            folders: folders.map((args) => folderAt(...args)),
            releaseBytes: SMALL,
            routes: { [LATEST]: reply(302, { location: TAG_URL }), [archiveUrl('v1.10.0')]: reply(200, {}, [SMALL]) },
        });
        world.ui.pickAnswer = () => ROOT;
        world.target.failOn('.claude/rules/a.md', 'EACCES: permission denied');
        world.ui.noticeAnswer = (message) => {
            if (message.startsWith('FeatherSpec setup stopped')) {
                world.target.clearFailures();
                world.discovery.folders = world.discovery.folders.map((folder) => (folder.root === ROOT ? { ...folder, verdict: 'project' } : folder));
                return 'Retry';
            }
            return undefined;
        };
        return world;
    }

    it('never switches to another folder on its own: with exactly one other eligible folder it asks', async () => {
        const world = stoppingWorld([
            ['a', 'not-a-project'],
            ['plain', 'not-a-project'],
        ]);
        world.ui.pickAnswer = () => (world.ui.picks.length === 1 ? ROOT : undefined);
        await run(world);
        expect(world.ui.picks).toHaveLength(2);
        expect(world.ui.picks[1]?.items.map((item) => item.root)).toEqual(['file:///w/a']);
        expect(world.ui.confirmations.map((confirmation) => confirmation.message)).toEqual(['Set up FeatherSpec 2.0.0 in plain?']);
        expect(world.target.files('file:///w/a')).toEqual([]);
    });

    it('the folder picked in that ask is set up, confirmation included', async () => {
        const world = stoppingWorld([
            ['a', 'not-a-project'],
            ['plain', 'not-a-project'],
        ]);
        world.ui.pickAnswer = (items) => (world.ui.picks.length === 1 ? ROOT : items[0]?.root);
        await run(world);
        expect(world.ui.confirmations.map((confirmation) => confirmation.message)).toEqual(['Set up FeatherSpec 2.0.0 in plain?', 'Set up FeatherSpec 2.0.0 in a?']);
        expect(world.target.files('file:///w/a')).toContain('AGENTS.md');
    });

    it('with no eligible folder left, the "none" message of AC-003 applies and nothing more is requested', async () => {
        const world = stoppingWorld([['plain', 'not-a-project']]);
        await run(world);
        expect(world.ui.picks).toHaveLength(0);
        expect(noticeTexts(world)).toEqual([
            'FeatherSpec setup stopped: .claude/rules/a.md could not be written (EACCES: permission denied).',
            'Every folder of this workspace is already a FeatherSpec project.',
        ]);
        expect(world.http.requests).toHaveLength(2);
    });

    it('negative control: a target that is still eligible is used again without asking', async () => {
        const world = stoppingWorld([
            ['a', 'not-a-project'],
            ['plain', 'not-a-project'],
        ]);
        world.ui.noticeAnswer = (message) => {
            if (message.startsWith('FeatherSpec setup stopped')) {
                world.target.clearFailures();
                return 'Retry';
            }
            return undefined;
        };
        await run(world);
        expect(world.ui.picks).toHaveLength(1);
        expect(world.ui.confirmations.map((confirmation) => confirmation.message)).toEqual(['Set up FeatherSpec 2.0.0 in plain?', 'Set up FeatherSpec 2.0.0 in plain?']);
    });
});

describe('0014 AC-006, AC-019: failures before any write', () => {
    it('a refused archive: the text, "Retry", and nothing written', async () => {
        const hostile = tarGz(releaseEntries('top', '1.0.0', [{ path: 'top/../escape.txt', content: 'x' }]));
        const world = createSetupWorld({ routes: { [LATEST]: reply(302, { location: TAG_URL }), [archiveUrl('v1.10.0')]: reply(200, {}, [hostile]) } });
        await run(world);
        expect(world.ui.notices).toEqual([
            { message: 'The downloaded archive is not a FeatherSpec release: it holds an entry with an unsafe path: "top/../escape.txt".', actions: ['Retry'] },
        ]);
        expect(world.target.log).toEqual([]);
        expect(world.ui.confirmations).toEqual([]);
    });

    it('a download over 20 MB is reported as a refused archive', async () => {
        const big = Array.from({ length: 3 }, () => new Uint8Array(8 * 1024 * 1024));
        const world = createSetupWorld({ routes: { [LATEST]: reply(302, { location: TAG_URL }), [archiveUrl('v1.10.0')]: reply(200, {}, big) } });
        await run(world);
        expect(noticeTexts(world)).toEqual(['The downloaded archive is not a FeatherSpec release: it is larger than 20 MB.']);
    });

    it('a failed download: the text with the reason, "Retry" and "Open setup guide"', async () => {
        const world = createSetupWorld({ routes: { [LATEST]: reply(503) } });
        world.ui.noticeAnswer = () => 'Open setup guide';
        await run(world);
        expect(world.ui.notices).toEqual([{ message: 'FeatherSpec could not be downloaded: GitHub answered with status 503.', actions: ['Retry', 'Open setup guide'] }]);
        expect(world.actions.calls).toEqual(['openSetupGuide']);
        expect(world.target.log).toEqual([]);
    });

    it('"Retry" after a failed download starts again and then succeeds', async () => {
        let attempts = 0;
        const world = createSetupWorld({
            releaseBytes: SMALL,
            routes: (url) => {
                if (url === LATEST) {
                    attempts += 1;
                    return attempts === 1 ? reply(503) : reply(302, { location: TAG_URL });
                }
                return url === archiveUrl('v1.10.0') ? reply(200, {}, [SMALL]) : undefined;
            },
        });
        world.ui.noticeAnswer = (message) => (message.startsWith('FeatherSpec could not be downloaded') ? 'Retry' : undefined);
        await run(world);
        expect(noticeTexts(world)).toEqual(['FeatherSpec could not be downloaded: GitHub answered with status 503.', 'FeatherSpec 2.0.0 is set up in plain. Open the AI assistant of your choice and run /sdd-setup.']);
        expect(world.target.files(ROOT)).toContain('CLAUDE.md');
    });

    it('cancelling the download and declining the confirmation show no message', async () => {
        const declined = small();
        declined.ui.confirmAnswer = false;
        await run(declined);
        expect(declined.ui.notices).toEqual([]);
    });
});

describe('0014 AC-023: one block in the Output channel per setup that has a target', () => {
    it('a set-up block: folder, version, tag, outcome, created paths, and the next step last, without file content', async () => {
        const world = small();
        await run(world);
        expect(world.output.blocks).toHaveLength(1);
        const block = world.output.blocks[0] ?? [];
        expect(block[0]).toBe('FeatherSpec Studio setup - 2026-11-17T12:00:00.000Z');
        expect(block).toEqual(
            expect.arrayContaining([
                'folder: file:///w/plain',
                'version: 2.0.0',
                'tag: v1.10.0',
                'outcome: set up',
                'created: 6',
                '  .claude/rules/a.md',
                '  .gitignore',
                '  .vscode/settings.json',
                '  AGENTS.md',
                '  CLAUDE.md',
            ]),
        );
        expect(block[block.length - 1]).toBe('next step: Open the AI assistant of your choice and run /sdd-setup.');
        expect(block.join('\n')).not.toContain('rule a');
        expect(block.join('\n')).not.toContain('FeatherSpecVersion');
    });

    it('lists completed, kept and the setting keys kept with another value, and carries the merge prompt', async () => {
        const world = small();
        world.target.setFile(ROOT, 'CLAUDE.md', 'secret user text\n');
        world.target.setFile(ROOT, '.gitignore', 'node_modules/\n');
        world.target.setFile(ROOT, '.vscode/settings.json', '{"x": false}');
        await run(world);
        const block = world.output.blocks[0] ?? [];
        expect(block).toEqual(expect.arrayContaining(['completed: 2', '  .gitignore', '  .vscode/settings.json', 'kept: 1', '  CLAUDE.md', 'setting kept: x', 'merge prompt:']));
        expect(block.join('\n')).toContain('  - CLAUDE.md (existing file) and .featherspec-setup/CLAUDE.md (FeatherSpec copy)');
        expect(block.join('\n')).not.toContain('secret user text');
        expect(block[block.length - 1]).toBe('next step: 1 existing file was kept: merge them with your AI assistant, then run /sdd-setup.');
    });

    it('a stopped block: the outcome with path and reason, the paths not written, no next step', async () => {
        const world = small();
        world.target.failOn('.gitignore', 'EIO');
        await run(world);
        const block = world.output.blocks[0] ?? [];
        expect(block).toContain('outcome: stopped: .gitignore could not be written (EIO)');
        expect(block).toEqual(expect.arrayContaining(['not written: 3', '  .gitignore', '  .vscode/settings.json', '  AGENTS.md']));
        expect(block.some((line) => line.startsWith('next step'))).toBe(false);
    });

    it('a cancelled, a download-failed and an archive-refused block, each with the folder', async () => {
        const declined = small();
        declined.ui.confirmAnswer = false;
        await run(declined);
        expect(declined.output.blocks[0]).toEqual(expect.arrayContaining(['folder: file:///w/plain', 'version: 2.0.0', 'outcome: cancelled']));
        const failed = createSetupWorld({ routes: { [LATEST]: reply(500) } });
        await run(failed);
        expect(failed.output.blocks[0]).toEqual(expect.arrayContaining(['outcome: download failed: GitHub answered with status 500']));
        const refused = createSetupWorld({ routes: { [LATEST]: reply(302, { location: TAG_URL }), [archiveUrl('v1.10.0')]: reply(200, {}, [new Uint8Array([1, 2, 3])]) } });
        await run(refused);
        expect(refused.output.blocks[0]).toEqual(expect.arrayContaining(['tag: v1.10.0', 'outcome: archive refused: it could not be read as a .tar.gz archive']));
    });

    it('a cancelled download writes a block, too', async () => {
        const world = createSetupWorld();
        world.ui.onProgress = () => queueMicrotask(() => world.ui.cancelProgress());
        await run(world);
        expect(world.output.blocks[0]).toEqual(expect.arrayContaining(['folder: file:///w/plain', 'outcome: cancelled']));
    });

    it('no block without a target: distrust, a dismissed pick, no eligible folder, a second start', async () => {
        const distrust = createSetupWorld({ trusted: false });
        await run(distrust);
        const none = createSetupWorld({ folders: [folderAt('p', 'project')] });
        await run(none);
        expect(distrust.output.blocks).toEqual([]);
        expect(none.output.blocks).toEqual([]);
    });

    it('BR-06: a release tag that names another version than AGENTS.md is logged, not an error', async () => {
        const world = createSetupWorld({ releaseBytes: SMALL, routes: { [LATEST]: reply(302, { location: 'https://github.com/GregorBiswanger/featherspec/releases/tag/v9.9.9' }), [archiveUrl('v9.9.9')]: reply(200, {}, [SMALL]) } });
        await run(world);
        expect(world.output.blocks[0]).toContain('note: the release tag v9.9.9 names another version than AGENTS.md (2.0.0)');
        expect(noticeTexts(world)[0]).toContain('FeatherSpec 2.0.0 is set up');
    });

    it('negative control: a tag that matches the version brings no note', async () => {
        const world = createSetupWorld({ releaseBytes: SMALL, routes: { [LATEST]: reply(302, { location: 'https://github.com/GregorBiswanger/featherspec/releases/tag/v2.0.0' }), [archiveUrl('v2.0.0')]: reply(200, {}, [SMALL]) } });
        await run(world);
        expect((world.output.blocks[0] ?? []).some((line) => line.startsWith('note:'))).toBe(false);
    });
});

describe('0014 AC-016: Copy merge prompt from the panel or the view', () => {
    it('one setup-pending folder: its prompt is copied, from the parked files without the .gitignore of the folder', async () => {
        const world = createSetupWorld({ folders: [folderAt('plain', 'incomplete', { setupPending: true }), folderAt('app', 'project')] });
        world.target.setFile(ROOT, '.featherspec-setup/.gitignore', '*\n');
        world.target.setFile(ROOT, '.featherspec-setup/AGENTS.md', 'x');
        world.target.setFile(ROOT, '.featherspec-setup/docs/a.md', 'x');
        await world.service.copyMergePrompt();
        await world.service.whenIdle();
        expect(world.ui.copied).toEqual([buildMergePrompt('file:///w/plain', ['AGENTS.md', 'docs/a.md'])]);
        expect(world.ui.picks).toEqual([]);
        expect(noticeTexts(world)).toEqual(['The merge prompt was copied to the clipboard.']);
    });

    it('several setup-pending folders: asks for the folder first', async () => {
        const world = createSetupWorld({ folders: [folderAt('a', 'incomplete', { setupPending: true }), folderAt('b', 'incomplete', { setupPending: true }), folderAt('c', 'incomplete')] });
        world.target.setFile('file:///w/a', '.featherspec-setup/A.md', 'x');
        world.target.setFile('file:///w/b', '.featherspec-setup/B.md', 'x');
        world.ui.pickAnswer = () => 'file:///w/b';
        await world.service.copyMergePrompt();
        await world.service.whenIdle();
        expect(world.ui.picks).toHaveLength(1);
        expect(world.ui.picks[0]?.items.map((item) => item.label)).toEqual(['a', 'b']);
        expect(world.ui.copied).toEqual([buildMergePrompt('file:///w/b', ['B.md'])]);
    });

    it('a dismissed pick copies nothing', async () => {
        const world = createSetupWorld({ folders: [folderAt('a', 'incomplete', { setupPending: true }), folderAt('b', 'incomplete', { setupPending: true })] });
        world.ui.pickAnswer = () => undefined;
        await world.service.copyMergePrompt();
        await world.service.whenIdle();
        expect(world.ui.copied).toEqual([]);
        expect(world.ui.notices).toEqual([]);
    });

    it('no setup-pending folder, or one with nothing to merge, says so and copies nothing', async () => {
        const none = createSetupWorld({ folders: [folderAt('a', 'incomplete')] });
        await none.service.copyMergePrompt();
        await none.service.whenIdle();
        expect(noticeTexts(none)).toEqual(['No folder of this workspace has files to merge.']);
        const empty = createSetupWorld({ folders: [folderAt('plain', 'incomplete', { setupPending: true })] });
        empty.target.setFile(ROOT, '.featherspec-setup/.gitignore', '*\n');
        await empty.service.copyMergePrompt();
        await empty.service.whenIdle();
        expect(noticeTexts(empty)).toEqual(['There are no files to merge in plain.']);
        expect(none.ui.copied).toEqual([]);
        expect(empty.ui.copied).toEqual([]);
    });
});
