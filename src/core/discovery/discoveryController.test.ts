import { describe, expect, it } from 'vitest';
import { createNodeFileSystem } from '../../adapters/node/nodeFileSystem';
import { createDiscoveryController } from './discoveryController';
import { createFakeHost, createFakeState } from './testing/fakeHost';
import { fixturePath } from './testing/fixtures';

const fileSystem = createNodeFileSystem();
const sameRoot = (first: string, second: string) => first === second;

function folder(name: string) {
    return { root: fixturePath(name), name };
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
