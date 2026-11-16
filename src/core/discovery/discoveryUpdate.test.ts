import { describe, expect, it } from 'vitest';
import { createDiscoveryController } from './discoveryController';
import { createFakeHost, createFakeState } from './testing/fakeHost';
import { createMemoryFileSystem } from './testing/memoryFileSystem';

const sameRoot = (first: string, second: string) => first === second;

function addProject(fileSystem: ReturnType<typeof createMemoryFileSystem>, root: string) {
    fileSystem.setFile(root, 'AGENTS.md', 'FeatherSpecVersion: 1.10.0\n');
    fileSystem.setDirectory(root, '.specs');
}

function setup(roots: string[], prepare: (fileSystem: ReturnType<typeof createMemoryFileSystem>) => void = () => undefined, remembered?: string) {
    const fileSystem = createMemoryFileSystem();
    prepare(fileSystem);
    const host = createFakeHost(roots.map((root) => ({ root, name: root })), createFakeState(remembered));
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
    const order: string[] = [];
    const subscription = controller.onDidUpdate(() => order.push('update'));
    return { fileSystem, host, controller, order, subscription };
}

describe('discovery update notification', () => {
    it('AC-024: a run that changes nothing still notifies once per run', async () => {
        const { controller, order } = setup(['a'], (fileSystem) => addProject(fileSystem, 'a'));
        await controller.start();
        expect(order).toEqual(['update']);
        await controller.refresh();
        await controller.refresh();
        expect(order).toEqual(['update', 'update', 'update']);
    });

    it('AC-024: a run that fails unexpectedly notifies once and reports the failure; the next success clears it', async () => {
        const { controller, host, order } = setup(['a'], (fs) => addProject(fs, 'a'));
        await controller.start();
        const folders = host.folders.list;
        let failing = true;
        host.folders.list = () => {
            if (failing) {
                throw new Error('folder list broke');
            }
            return folders();
        };
        await expect(controller.refresh()).rejects.toThrow('folder list broke');
        expect(order).toEqual(['update', 'update']);
        expect(controller.snapshot().failure).toBe('folder list broke');
        failing = false;
        await controller.refresh();
        expect(order).toHaveLength(3);
        expect(controller.snapshot().failure).toBeUndefined();
    });

    it('AC-024: a successful run never reports a failure (control)', async () => {
        const { controller } = setup(['a'], (fileSystem) => addProject(fileSystem, 'a'));
        await controller.start();
        expect(controller.snapshot().failure).toBeUndefined();
    });

    it('AC-024: remembered reports the stored root also while no project is active', async () => {
        const { controller } = setup(['a'], () => undefined, 'a');
        await controller.start();
        expect(controller.snapshot().active).toBeUndefined();
        expect(controller.snapshot().remembered).toBe('a');
    });

    it('AC-024: remembered is none when nothing is stored', async () => {
        const { controller } = setup(['plain']);
        await controller.start();
        expect(controller.snapshot().remembered).toBeUndefined();
    });

    it('AC-024: the status bar and the active-project listener ran before the update listener', async () => {
        const { controller, host, order } = setup(['a'], (fileSystem) => addProject(fileSystem, 'a'));
        controller.onDidChangeActiveProject(() => order.push('active'));
        const seen: (string | undefined)[] = [];
        controller.onDidUpdate(() => seen.push(host.statusBar.current?.text));
        await controller.start();
        expect(order).toEqual(['active', 'update']);
        expect(seen).toEqual(['FeatherSpec: a (1.10.0)']);
    });

    it('AC-024: a failing subscriber does not stop the others or the run', async () => {
        const { controller, order } = setup(['a'], (fileSystem) => addProject(fileSystem, 'a'));
        controller.onDidUpdate(() => {
            throw new Error('boom');
        });
        controller.onDidUpdate(() => order.push('second'));
        await controller.start();
        expect(order).toEqual(['update', 'second']);
        expect(controller.snapshot().active?.root).toBe('a');
    });

    it('AC-024: a disposed subscriber gets nothing', async () => {
        const { controller, order, subscription } = setup(['a'], (fileSystem) => addProject(fileSystem, 'a'));
        subscription.dispose();
        await controller.start();
        expect(order).toEqual([]);
    });
});
