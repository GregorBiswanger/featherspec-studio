import { describe, expect, it } from 'vitest';
import { createNodeFileSystem } from '../../adapters/node/nodeFileSystem';
import { createDiscoveryController } from './discoveryController';
import { createFakeHost, createFakeState } from './testing/fakeHost';
import { fixturePath } from './testing/fixtures';
import { snapshotTree } from './testing/snapshotTree';
import { SETUP_GUIDE_URL } from './report';

const fileSystem = createNodeFileSystem();
const sameRoot = (first: string, second: string) => first === second;

function folder(name: string) {
    return { root: fixturePath(name), name };
}

function depsOf(host: ReturnType<typeof createFakeHost>) {
    return {
        statusBar: host.statusBar,
        output: host.output,
        state: host.state,
        folders: host.folders,
        clock: host.clock,
        ui: host.ui,
        watch: host.watch,
    };
}

function setup(names: string[], remembered?: string) {
    const host = createFakeHost(names.map(folder), createFakeState(remembered));
    const controller = createDiscoveryController({
        fileSystem,
        statusBar: host.statusBar,
        output: host.output,
        state: host.state,
        folders: host.folders,
        clock: host.clock,
        ui: host.ui,
        watch: host.watch,
        sameRoot,
    });
    return { host, controller };
}

describe('discoveryController start', () => {
    it('AC-007, AC-014, AC-019: one project becomes active without asking, is remembered and shown with name and version', async () => {
        const { host, controller } = setup(['fs110-de-active-review']);
        await controller.start();
        expect(host.statusBar.current?.text).toBe('FeatherSpec: fs110-de-active-review (1.10.0)');
        expect(host.state.value).toBe(fixturePath('fs110-de-active-review'));
        expect(controller.snapshot().active?.name).toBe('fs110-de-active-review');
    });

    it('AC-014: a legacy project is shown with version unknown', async () => {
        const { host, controller } = setup(['fs-legacy-unstamped']);
        await controller.start();
        expect(host.statusBar.current?.text).toBe('FeatherSpec: fs-legacy-unstamped (unknown)');
    });

    it('AC-020: no project and no incomplete folder leaves the status bar hidden and the state untouched', async () => {
        const { host, controller } = setup(['not-fs-speckit', 'not-fs-agents-only', 'nested-project']);
        await controller.start();
        expect(host.statusBar.current).toBeUndefined();
        expect(host.statusBar.shown).toEqual([]);
        expect(host.state.writes).toEqual([]);
        expect(host.ui.callCount()).toBe(0);
        expect(controller.snapshot().active).toBeUndefined();
    });

    it('AC-019, AC-020: an incomplete folder still runs discovery and shows "FeatherSpec project not found"', async () => {
        const { host, controller } = setup(['incomplete-specs-only']);
        await controller.start();
        expect(host.statusBar.current?.text).toBe('FeatherSpec project not found');
        expect(host.output.blocks).toHaveLength(1);
        expect(host.state.writes).toEqual([]);
    });

    it('AC-008: several projects and nothing remembered show "Select FeatherSpec project" and remember nothing', async () => {
        const { host, controller } = setup(['fs110-de-active-review', 'fs-legacy-unstamped']);
        await controller.start();
        expect(host.statusBar.current?.text).toBe('Select FeatherSpec project');
        expect(host.state.writes).toEqual([]);
        expect(controller.snapshot().active).toBeUndefined();
    });

    it('AC-016: writes one Output block with one entry per workspace folder', async () => {
        const { host, controller } = setup(['fs110-de-active-review', 'incomplete-specs-only', 'not-fs-speckit']);
        await controller.start();
        expect(host.output.blocks).toHaveLength(1);
        const text = host.output.blocks[0]?.join('\n') ?? '';
        for (const name of ['fs110-de-active-review', 'incomplete-specs-only', 'not-fs-speckit']) {
            expect(text.split(fixturePath(name)).length - 1).toBe(1);
        }
        expect(text).toContain('verdict: incomplete');
        expect(text).toContain('open the project folder itself');
    });

    it('AC-016: no folder open writes a block saying so and shows no status bar entry', async () => {
        const { host, controller } = setup([]);
        await controller.start();
        expect(host.output.blocks[0]?.join('\n')).toContain('No workspace folder is open');
        expect(host.statusBar.current).toBeUndefined();
    });
});

const FS110 = 'fs110-de-active-review';
const LEGACY = 'fs-legacy-unstamped';

describe('discoveryController selectProject', () => {
    it('AC-008, AC-003: lists every project with its path, never an incomplete folder', async () => {
        const { host, controller } = setup([FS110, LEGACY, 'incomplete-specs-only']);
        await controller.start();
        await controller.selectProject();
        expect(host.ui.pickCalls).toHaveLength(1);
        expect(host.ui.pickCalls[0]?.map((item) => item.label)).toEqual([FS110, LEGACY]);
        expect(host.ui.pickCalls[0]?.map((item) => item.detail)).toEqual([fixturePath(FS110), fixturePath(LEGACY)]);
    });

    it('AC-009: the chosen project becomes active, is remembered and shown', async () => {
        const { host, controller } = setup([FS110, LEGACY]);
        await controller.start();
        host.ui.pickAnswer = () => fixturePath(LEGACY);
        await controller.selectProject();
        expect(controller.snapshot().active?.name).toBe(LEGACY);
        expect(host.state.value).toBe(fixturePath(LEGACY));
        expect(host.statusBar.current?.text).toBe('FeatherSpec: fs-legacy-unstamped (unknown)');
    });

    it('AC-009: dismissing the list changes nothing', async () => {
        const { host, controller } = setup([FS110, LEGACY]);
        await controller.start();
        await controller.selectProject();
        expect(controller.snapshot().active).toBeUndefined();
        expect(host.state.writes).toEqual([]);
        expect(host.statusBar.current?.text).toBe('Select FeatherSpec project');
    });

    it('AC-009: a new controller on the same workspace state restores the active project without asking', async () => {
        const first = setup([FS110, LEGACY]);
        await first.controller.start();
        first.host.ui.pickAnswer = () => fixturePath(LEGACY);
        await first.controller.selectProject();

        const state = createFakeState(first.host.state.value);
        const second = createFakeHost([folder(FS110), folder(LEGACY)], state);
        const controller = createDiscoveryController({ ...depsOf(second), fileSystem, sameRoot });
        await controller.start();
        expect(controller.snapshot().active?.name).toBe(LEGACY);
        expect(second.ui.callCount()).toBe(0);
    });

    it('AC-009: negative control, a fresh workspace state with two projects asks and has no active project', async () => {
        const fresh = createFakeHost([folder(FS110), folder(LEGACY)], createFakeState());
        const controller = createDiscoveryController({ ...depsOf(fresh), fileSystem, sameRoot });
        await controller.start();
        expect(controller.snapshot().active).toBeUndefined();
    });

    it('AC-010: a lost remembered project leaves no active project, no other one takes over, and it returns by itself', async () => {
        const { host, controller } = setup([FS110]);
        await controller.start();
        expect(host.state.value).toBe(fixturePath(FS110));

        host.folders.folders = [folder('not-fs-speckit'), folder(LEGACY)];
        await controller.refresh();
        expect(controller.snapshot().active).toBeUndefined();
        expect(host.statusBar.current?.text).toBe('FeatherSpec project not found');
        expect(host.state.value).toBe(fixturePath(FS110));

        host.folders.folders = [folder(FS110), folder(LEGACY)];
        await controller.refresh();
        expect(controller.snapshot().active?.name).toBe(FS110);
        expect(host.statusBar.current?.text).toBe('FeatherSpec: fs110-de-active-review (1.10.0)');
        expect(host.ui.callCount()).toBe(0);
    });

    it('AC-010: negative control, after the user selected another project the returning one does not take over', async () => {
        const { host, controller } = setup([FS110, LEGACY]);
        await controller.start();
        host.ui.pickAnswer = () => fixturePath(FS110);
        await controller.selectProject();
        host.folders.folders = [folder(LEGACY)];
        await controller.refresh();
        host.ui.pickAnswer = () => fixturePath(LEGACY);
        await controller.selectProject();
        host.folders.folders = [folder(FS110), folder(LEGACY)];
        await controller.refresh();
        expect(controller.snapshot().active?.name).toBe(LEGACY);
    });
});

describe('discoveryController no project', () => {
    it('AC-015: the select command with no project shows the notification with both actions', async () => {
        const { host, controller } = setup(['not-fs-speckit']);
        await controller.start();
        await controller.selectProject();
        expect(host.ui.pickCalls).toHaveLength(0);
        expect(host.ui.notifications).toEqual([
            { message: 'No FeatherSpec project found in this workspace', actions: ['Open setup guide', 'Refresh'] },
        ]);
    });

    it('AC-015: an incomplete folder alone is not a project, so the notification appears', async () => {
        const { host, controller } = setup(['incomplete-agents-only']);
        await controller.start();
        await controller.selectProject();
        expect(host.ui.notifications).toHaveLength(1);
    });

    it('AC-015: "Open setup guide" opens the A-005 link', async () => {
        const { host, controller } = setup(['not-fs-speckit']);
        host.ui.notificationAnswer = 'Open setup guide';
        await controller.start();
        await controller.selectProject();
        expect(host.ui.opened).toEqual([SETUP_GUIDE_URL]);
    });

    it('AC-015: "Refresh" runs discovery again and a dismissed notification does not', async () => {
        const { host, controller } = setup(['not-fs-speckit']);
        await controller.start();
        await controller.selectProject();
        expect(host.output.blocks).toHaveLength(1);
        host.ui.notificationAnswer = 'Refresh';
        await controller.selectProject();
        expect(host.output.blocks).toHaveLength(2);
    });

    it('AC-015: with no folder open it shows "Open a folder to use FeatherSpec Studio" and no actions', async () => {
        const { host, controller } = setup([]);
        await controller.start();
        await controller.selectProject();
        expect(host.ui.notifications).toEqual([{ message: 'Open a folder to use FeatherSpec Studio', actions: [] }]);
    });

    it('AC-020: negative control, automatic discovery alone never notifies', async () => {
        const { host, controller } = setup(['not-fs-speckit']);
        await controller.start();
        await controller.refresh();
        expect(host.ui.notifications).toEqual([]);
    });
});

describe('discoveryController read-only', () => {
    it('AC-011: start, refresh and selection leave the fixture tree unchanged', async () => {
        const names = [FS110, LEGACY, 'incomplete-specs-only'];
        const before = await Promise.all(names.map((name) => snapshotTree(fixturePath(name))));
        const { host, controller } = setup(names);
        host.ui.pickAnswer = () => fixturePath(LEGACY);
        await controller.start();
        await controller.refresh();
        await controller.selectProject();
        const after = await Promise.all(names.map((name) => snapshotTree(fixturePath(name))));
        expect(after).toEqual(before);
        expect(controller.snapshot().active?.name).toBe(LEGACY);
    });
});
