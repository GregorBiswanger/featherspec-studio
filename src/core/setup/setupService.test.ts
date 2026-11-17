import { describe, expect, it } from 'vitest';
import { archiveUrl } from './releaseDownload';
import { CODELOAD, createSetupWorld, folderAt, LATEST, TAG_URL, type SetupWorld } from './testing/setupWorld';
import { reply, whenAborted } from './testing/scriptedHttp';
import { tarGz, releaseEntries } from '../../adapters/node/testing/tarWriter';

async function started(world: SetupWorld): Promise<SetupWorld> {
    await world.service.start();
    await world.service.whenIdle();
    return world;
}

function messages(world: SetupWorld): string[] {
    return world.ui.notices.map((notice) => notice.message);
}

describe('0014 AC-004: a workspace that is not trusted', () => {
    it('shows no pick, sends no request, writes nothing, and shows the text with "Manage Workspace Trust"', async () => {
        const world = createSetupWorld({ trusted: false, folders: [folderAt('a', 'not-a-project'), folderAt('b', 'incomplete')] });
        await started(world);
        expect(world.ui.notices).toEqual([{ message: 'Setting up FeatherSpec needs a trusted workspace.', actions: ['Manage Workspace Trust'] }]);
        expect(world.ui.picks).toEqual([]);
        expect(world.http.requests).toEqual([]);
        expect(world.target.log).toEqual([]);
        expect(world.ui.progressTitles).toEqual([]);
    });

    it('the action runs Manage Workspace Trust; no other choice does', async () => {
        const world = createSetupWorld({ trusted: false });
        world.ui.noticeAnswer = () => 'Manage Workspace Trust';
        await started(world);
        expect(world.actions.calls).toEqual(['manageTrust']);
        const other = createSetupWorld({ trusted: false });
        await started(other);
        expect(other.actions.calls).toEqual([]);
    });

    it('negative control: the same workspace trusted does reach the download', async () => {
        const world = createSetupWorld({ trusted: true });
        await started(world);
        expect(world.http.requests.length).toBeGreaterThan(0);
    });
});

describe('0014 AC-003: the target folder', () => {
    it('one eligible folder is used without asking, also next to a project', async () => {
        const world = createSetupWorld({ folders: [folderAt('app', 'project'), folderAt('plain', 'not-a-project')] });
        await started(world);
        expect(world.ui.picks).toEqual([]);
        expect(world.ui.confirmations[0]?.message).toBe('Set up FeatherSpec 1.10.0 in plain?');
    });

    it('several: a quick pick lists the plain and the incomplete folder only, with name, path and verdict', async () => {
        const world = createSetupWorld({
            folders: [
                folderAt('app', 'project'),
                folderAt('plain', 'not-a-project', { displayPath: '/work/plain' }),
                folderAt('half', 'incomplete'),
                folderAt('pending', 'incomplete', { setupPending: true }),
                folderAt('broken', 'not-a-project', { readError: 'EACCES' }),
                folderAt('remote', 'not-a-project', { root: 'vscode-vfs://github/x/y' }),
            ],
        });
        world.ui.pickAnswer = () => 'file:///w/half';
        await started(world);
        expect(world.ui.picks).toHaveLength(1);
        expect(world.ui.picks[0]?.items).toEqual([
            { label: 'plain', description: 'not a project', detail: '/work/plain', root: 'file:///w/plain' },
            { label: 'half', description: 'incomplete', detail: 'file:///w/half', root: 'file:///w/half' },
            { label: 'pending', description: 'setup not finished', detail: 'file:///w/pending', root: 'file:///w/pending' },
        ]);
        expect(world.ui.confirmations[0]?.message).toBe('Set up FeatherSpec 1.10.0 in half?');
    });

    it('dismissing the pick ends the setup without a request or a message', async () => {
        const world = createSetupWorld({ folders: [folderAt('a', 'not-a-project'), folderAt('b', 'not-a-project')] });
        world.ui.pickAnswer = () => undefined;
        await started(world);
        expect(world.http.requests).toEqual([]);
        expect(world.ui.notices).toEqual([]);
        expect(world.ui.progressTitles).toEqual([]);
        expect(world.service.isRunning()).toBe(false);
    });

    it('no folder open: "Open a folder to use FeatherSpec Studio." and no request', async () => {
        const world = await started(createSetupWorld({ folders: [] }));
        expect(world.ui.notices).toEqual([{ message: 'Open a folder to use FeatherSpec Studio.', actions: [] }]);
        expect(world.http.requests).toEqual([]);
    });

    it('every folder a project: its own message', async () => {
        const world = await started(createSetupWorld({ folders: [folderAt('a', 'project'), folderAt('b', 'project', { legacy: true })] }));
        expect(world.ui.notices).toEqual([{ message: 'Every folder of this workspace is already a FeatherSpec project.', actions: [] }]);
        expect(world.http.requests).toEqual([]);
    });

    it('otherwise "No folder of this workspace can be set up." with "Show output", which shows the output', async () => {
        const folders = [folderAt('a', 'project'), folderAt('broken', 'not-a-project', { readError: 'EACCES' }), folderAt('v', 'not-a-project', { root: 'vscode-vfs://x/y' })];
        const world = createSetupWorld({ folders });
        world.ui.noticeAnswer = () => 'Show output';
        await started(world);
        expect(world.ui.notices).toEqual([{ message: 'No folder of this workspace can be set up.', actions: ['Show output'] }]);
        expect(world.actions.calls).toEqual(['showOutput']);
        expect(world.http.requests).toEqual([]);
    });

    it('a virtual folder is no target, also when it is the only one', async () => {
        const world = await started(createSetupWorld({ folders: [folderAt('v', 'not-a-project', { root: 'vscode-vfs://github/a/b' })] }));
        expect(messages(world)).toEqual(['No folder of this workspace can be set up.']);
    });

    it('asks discovery for a result when it has none yet', async () => {
        const world = createSetupWorld();
        world.discovery.hide();
        await started(world);
        expect(world.discovery.refreshes).toBe(1);
        expect(world.ui.confirmations).toHaveLength(1);
    });

    it('a retry for a folder that is still eligible skips the pick', async () => {
        const world = createSetupWorld({ folders: [folderAt('a', 'not-a-project'), folderAt('b', 'not-a-project')] });
        await world.service.start({ root: 'file:///w/b' });
        await world.service.whenIdle();
        expect(world.ui.picks).toEqual([]);
        expect(world.ui.confirmations[0]?.message).toBe('Set up FeatherSpec 1.10.0 in b?');
    });
});

describe('0014 AC-005, AC-021: the download under a progress notification', () => {
    it('shows "Downloading FeatherSpec…" while it downloads, and writes nothing before the confirmation', async () => {
        const world = createSetupWorld();
        let writesAtConfirmation = -1;
        world.ui.confirmAnswer = () => {
            writesAtConfirmation = world.target.log.length;
            return true;
        };
        let requestsAtProgress = -1;
        world.ui.onProgress = () => {
            requestsAtProgress = world.http.requests.length;
        };
        await started(world);
        expect(world.ui.progressTitles).toEqual(['Downloading FeatherSpec…']);
        expect(requestsAtProgress).toBe(0);
        expect(writesAtConfirmation).toBe(0);
        expect(world.http.requests).toHaveLength(3);
    });

    it('AC-021: cancelling the progress notification stops the download, writes nothing and shows no message', async () => {
        const world = createSetupWorld({ routes: { [LATEST]: (request) => whenAborted(request.signal) } });
        world.ui.onProgress = () => queueMicrotask(() => world.ui.cancelProgress());
        await started(world);
        expect(world.http.requests[0]?.signal.aborted).toBe(true);
        expect(world.target.log).toEqual([]);
        expect(world.ui.notices).toEqual([]);
        expect(world.ui.confirmations).toEqual([]);
        expect(world.service.isRunning()).toBe(false);
    });
});

describe('0014 AC-008: one confirmation before the first write', () => {
    it('asks "Set up FeatherSpec <version> in <folder>?" with the path and the counts, and "Set up" as the action', async () => {
        const world = createSetupWorld({ folders: [folderAt('plain', 'not-a-project', { displayPath: '/work/plain' })] });
        await started(world);
        expect(world.ui.confirmations).toEqual([
            { message: 'Set up FeatherSpec 1.10.0 in plain?', detail: '/work/plain\n\n63 files will be created.', confirmLabel: 'Set up' },
        ]);
    });

    it('counts created, completed and kept; zero counts are left out', async () => {
        const world = createSetupWorld();
        world.target.setFile('file:///w/plain', 'AGENTS.md', 'mine\n');
        world.target.setFile('file:///w/plain', 'CLAUDE.md', 'mine\n');
        world.target.setFile('file:///w/plain', '.gitignore', 'node_modules/\n');
        await started(world);
        expect(world.ui.confirmations[0]?.detail).toBe('file:///w/plain\n\n60 files will be created, 1 completed, 2 existing files kept unchanged.');
    });

    it('uses the singular for a count of 1', async () => {
        const world = createSetupWorld();
        world.target.setFile('file:///w/plain', 'AGENTS.md', 'mine\n');
        await started(world);
        expect(world.ui.confirmations[0]?.detail).toContain('62 files will be created, 1 existing file kept unchanged.');
    });

    it('with nothing to do (every file the same) the detail is the path alone', async () => {
        const world = createSetupWorld();
        await started(world);
        const copy = createSetupWorld();
        for (const name of world.target.files('file:///w/plain')) {
            copy.target.setFile('file:///w/plain', name, world.target.text('file:///w/plain', name) ?? '');
        }
        await started(copy);
        expect(copy.ui.confirmations[0]?.detail).toBe('file:///w/plain');
    });

    it('singular for one file to create', async () => {
        const bytes = tarGz(releaseEntries('top', '3.0.0'));
        const world = createSetupWorld({ releaseBytes: bytes, routes: { [LATEST]: reply(302, { location: TAG_URL }), [archiveUrl('v1.10.0')]: reply(200, {}, [bytes]) } });
        world.target.setFile('file:///w/plain', '.specs/README.md', '# Specs\n');
        await started(world);
        expect(world.ui.confirmations[0]).toEqual({ message: 'Set up FeatherSpec 3.0.0 in plain?', detail: 'file:///w/plain\n\n1 file will be created.', confirmLabel: 'Set up' });
    });

    it('cancelling or closing the dialog writes nothing', async () => {
        const world = createSetupWorld();
        world.ui.confirmAnswer = false;
        await started(world);
        expect(world.target.log).toEqual([]);
        expect(world.target.files('file:///w/plain')).toEqual([]);
    });

    it('confirming writes the files', async () => {
        const world = await started(createSetupWorld());
        expect(world.target.files('file:///w/plain')).toHaveLength(63);
    });
});

describe('0014 AC-022: one setup at a time', () => {
    it('a second start while the confirmation is open is answered with "A FeatherSpec setup is already running." and starts nothing', async () => {
        const world = createSetupWorld();
        let release: (() => void) | undefined;
        world.ui.confirmAnswer = () =>
            new Promise<boolean>((resolve) => {
                release = () => resolve(true);
            });
        const first = world.service.start();
        for (let turn = 0; turn < 500 && release === undefined; turn++) {
            await new Promise((resolve) => setTimeout(resolve, 2));
        }
        expect(release).toBeDefined();
        expect(world.service.isRunning()).toBe(true);
        await world.service.start();
        await world.service.whenIdle();
        expect(messages(world)).toEqual(['A FeatherSpec setup is already running.']);
        expect(world.ui.progressTitles).toHaveLength(1);
        release?.();
        await first;
        expect(world.service.isRunning()).toBe(false);
    });

    it('negative control: after the first has ended a new start runs', async () => {
        const world = createSetupWorld();
        world.ui.confirmAnswer = false;
        await started(world);
        await started(world);
        expect(world.ui.progressTitles).toHaveLength(2);
        expect(messages(world)).toEqual([]);
    });

    it('a start that ended without a target does not leave the flag set', async () => {
        const world = createSetupWorld({ trusted: false });
        await started(world);
        expect(world.service.isRunning()).toBe(false);
        world.trust.trusted = true;
        await started(world);
        expect(world.ui.progressTitles).toHaveLength(1);
    });

    it('the flag is cleared when the message is shown, not when it is dismissed', async () => {
        const world = createSetupWorld({ trusted: false });
        world.ui.notify = () => new Promise<string | undefined>(() => undefined);
        await world.service.start();
        expect(world.service.isRunning()).toBe(false);
    });
});
