import { describe, expect, it } from 'vitest';
import { createDiscoveryController } from './discoveryController';
import { createFakeHost, createFakeState } from './testing/fakeHost';
import { createMemoryFileSystem } from './testing/memoryFileSystem';
import type { ReadOnlyFileSystem } from '../ports/readOnlyFileSystem';

const sameRoot = (first: string, second: string) => first === second;

function addProject(fileSystem: ReturnType<typeof createMemoryFileSystem>, root: string, version = '1.10.0') {
    fileSystem.setFile(root, 'AGENTS.md', `FeatherSpecVersion: ${version}\n`);
    fileSystem.setDirectory(root, '.specs');
}

function setup(roots: string[], fileSystem: ReadOnlyFileSystem = createMemoryFileSystem()) {
    const host = createFakeHost(roots.map((root) => ({ root, name: root })), createFakeState());
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

function newestBlock(host: ReturnType<typeof createFakeHost>): string {
    return host.output.blocks[host.output.blocks.length - 1]?.join('\n') ?? '';
}

describe('live re-detection', () => {
    it('AC-013: a burst of marker changes causes one rerun, and status bar and newest block match the final disk state', async () => {
        const fileSystem = createMemoryFileSystem();
        const { host, controller } = setup(['a'], fileSystem);
        await controller.start();
        expect(host.statusBar.current).toBeUndefined();
        expect(host.output.blocks).toHaveLength(1);

        fileSystem.setFile('a', 'AGENTS.md', 'draft\n');
        host.watch.fire('a');
        host.clock.advance(50);
        addProject(fileSystem, 'a');
        host.watch.fire('a');
        host.clock.advance(50);
        host.watch.fire('a');
        host.clock.advance(200);
        await controller.whenIdle();

        expect(host.output.blocks).toHaveLength(2);
        expect(newestBlock(host)).toContain('verdict: project');
        expect(host.statusBar.current?.text).toBe('FeatherSpec: a (1.10.0)');
        expect(host.state.value).toBe('a');
    });

    it('AC-013: negative control, without a marker event nothing is rerun', async () => {
        const fileSystem = createMemoryFileSystem();
        const { host, controller } = setup(['a'], fileSystem);
        await controller.start();
        addProject(fileSystem, 'a');
        host.clock.advance(10000);
        await controller.whenIdle();
        expect(host.output.blocks).toHaveLength(1);
        expect(host.statusBar.current).toBeUndefined();
    });

    it('AC-013: a change during a running discovery ends with the state of the final disk', async () => {
        const memory = createMemoryFileSystem();
        addProject(memory, 'a', '1.0.0');
        let gate: (() => void) | undefined;
        let blocked = true;
        const slow: ReadOnlyFileSystem = {
            ...memory,
            async readText(root, relativePath) {
                const text = await memory.readText(root, relativePath);
                if (blocked) {
                    await new Promise<void>((resolve) => {
                        gate = resolve;
                    });
                }
                return text;
            },
        };
        const { host, controller } = setup(['a'], slow);
        const started = controller.start();
        await new Promise((resolve) => setImmediate(resolve));
        expect(gate).toBeDefined();

        memory.setFile('a', 'AGENTS.md', 'FeatherSpecVersion: 2.0.0\n');
        host.watch.fire('a');
        host.clock.advance(200);
        blocked = false;
        gate?.();
        await started;
        await controller.whenIdle();

        expect(host.statusBar.current?.text).toBe('FeatherSpec: a (2.0.0)');
        expect(newestBlock(host)).toContain('version: 2.0.0');
    });

    it('AC-013: adding a folder reruns discovery and watches it; removing it drops the watch', async () => {
        const fileSystem = createMemoryFileSystem();
        addProject(fileSystem, 'a');
        addProject(fileSystem, 'b');
        const { host, controller } = setup(['a'], fileSystem);
        await controller.start();
        expect(host.watch.watched()).toEqual(['a']);

        host.folders.change([
            { root: 'a', name: 'a' },
            { root: 'b', name: 'b' },
        ]);
        host.clock.advance(200);
        await controller.whenIdle();
        expect(host.watch.watched().sort()).toEqual(['a', 'b']);
        expect(host.statusBar.current?.text).toBe('FeatherSpec: a (1.10.0)');
        expect(controller.snapshot().result?.folders).toHaveLength(2);

        host.folders.change([{ root: 'b', name: 'b' }]);
        host.clock.advance(200);
        await controller.whenIdle();
        expect(host.watch.watched()).toEqual(['b']);
        expect(host.statusBar.current?.text).toBe('FeatherSpec project not found');
    });

    it('AC-012: after folder changes every folder has exactly one entry in the newest block', async () => {
        const fileSystem = createMemoryFileSystem();
        addProject(fileSystem, 'a');
        const { host, controller } = setup(['a'], fileSystem);
        await controller.start();
        host.folders.change([
            { root: 'a', name: 'a' },
            { root: 'b', name: 'b' },
            { root: 'a', name: 'a' },
        ]);
        host.clock.advance(200);
        await controller.whenIdle();
        const entries = newestBlock(host).split('\n').filter((line) => line === 'a' || line === 'b');
        expect(entries).toEqual(['a', 'b']);
        expect(controller.snapshot().result?.folders).toHaveLength(2);
    });

    it('AC-013: Studio watches exactly the folder roots, so a change inside .specs/ has no event to trigger a rerun', async () => {
        const fileSystem = createMemoryFileSystem();
        addProject(fileSystem, 'a');
        addProject(fileSystem, 'b');
        const { host, controller } = setup(['a', 'b'], fileSystem);
        await controller.start();
        expect(host.watch.watched().sort()).toEqual(['a', 'b']);
        host.watch.fire('a/.specs/active/x.md');
        host.clock.advance(1000);
        await controller.whenIdle();
        expect(host.output.blocks).toHaveLength(1);
    });

    it('AC-013: after dispose no event reruns discovery and no watch stays', async () => {
        const fileSystem = createMemoryFileSystem();
        const { host, controller } = setup(['a'], fileSystem);
        await controller.start();
        controller.dispose();
        expect(host.watch.watched()).toEqual([]);
        host.folders.change([{ root: 'b', name: 'b' }]);
        host.clock.advance(1000);
        await controller.whenIdle();
        expect(host.output.blocks).toHaveLength(1);
    });

    it('AC-013: a refresh while a rerun is pending still ends in the final state', async () => {
        const fileSystem = createMemoryFileSystem();
        const { host, controller } = setup(['a'], fileSystem);
        await controller.start();
        addProject(fileSystem, 'a');
        host.watch.fire('a');
        await controller.refresh();
        host.clock.advance(200);
        await controller.whenIdle();
        expect(host.statusBar.current?.text).toBe('FeatherSpec: a (1.10.0)');
    });
});
