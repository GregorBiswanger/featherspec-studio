import { describe, expect, it } from 'vitest';
import { createDiscoveryController } from './discoveryController';
import type { DiscoveredFolder } from './discoverWorkspace';
import { createFakeHost, createFakeState } from './testing/fakeHost';
import { createMemoryFileSystem } from './testing/memoryFileSystem';

const sameRoot = (first: string, second: string) => first === second;

function addProject(fileSystem: ReturnType<typeof createMemoryFileSystem>, root: string, version = '1.10.0') {
    fileSystem.setFile(root, 'AGENTS.md', `FeatherSpecVersion: ${version}\n`);
    fileSystem.setDirectory(root, '.specs');
}

function setup(roots: string[], prepare: (fileSystem: ReturnType<typeof createMemoryFileSystem>) => void = () => undefined) {
    const fileSystem = createMemoryFileSystem();
    prepare(fileSystem);
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
    const received: (string | undefined)[] = [];
    const subscription = controller.onDidChangeActiveProject((active) => received.push(active?.root));
    return { fileSystem, host, controller, received, subscription };
}

describe('active project changed notification', () => {
    it('AC-023: the first result with one project notifies once with that project', async () => {
        const { controller, received } = setup(['a'], (fileSystem) => addProject(fileSystem, 'a'));
        await controller.start();
        expect(received).toEqual(['a']);
    });

    it('AC-023: the first result without any project still notifies once, with none', async () => {
        const { controller, received } = setup(['plain']);
        await controller.start();
        expect(received).toEqual([undefined]);
    });

    it('AC-023: negative control, a refresh that changes nothing notifies nobody', async () => {
        const { controller, received } = setup(['a'], (fileSystem) => addProject(fileSystem, 'a'));
        await controller.start();
        await controller.refresh();
        await controller.refresh();
        expect(received).toEqual(['a']);
    });

    it('AC-023: the user selecting another project notifies with that project', async () => {
        const { host, controller, received } = setup(['a', 'b'], (fileSystem) => {
            addProject(fileSystem, 'a');
            addProject(fileSystem, 'b');
        });
        await controller.start();
        expect(received).toEqual([undefined]);
        host.ui.pickAnswer = () => 'a';
        await controller.selectProject();
        host.ui.pickAnswer = () => 'b';
        await controller.selectProject();
        expect(received).toEqual([undefined, 'a', 'b']);
    });

    it('AC-023: the remembered project losing its marker notifies with none, its return notifies with the project', async () => {
        const { fileSystem, controller, received } = setup(['a'], (system) => addProject(system, 'a'));
        await controller.start();
        fileSystem.remove('a', 'AGENTS.md');
        await controller.refresh();
        addProject(fileSystem, 'a');
        await controller.refresh();
        expect(received).toEqual(['a', undefined, 'a']);
    });

    it('AC-023: a changed version of the same project notifies, a changed unrelated file does not', async () => {
        const { fileSystem, controller, received } = setup(['a'], (system) => addProject(system, 'a'));
        await controller.start();
        fileSystem.setFile('a', 'README.md', 'unrelated');
        await controller.refresh();
        expect(received).toEqual(['a']);
        const versions: (string | undefined)[] = [];
        controller.onDidChangeActiveProject((active) => versions.push(active?.version));
        addProject(fileSystem, 'a', '1.11.0');
        await controller.refresh();
        expect(received).toEqual(['a', 'a']);
        expect(versions).toEqual(['1.11.0']);
    });

    it('AC-023: the status bar and the snapshot already show the result when the subscriber is called', async () => {
        const { host, controller } = setup(['a'], (fileSystem) => addProject(fileSystem, 'a'));
        const seen: { text: string | undefined; active: DiscoveredFolder | undefined; passed: DiscoveredFolder | undefined }[] = [];
        controller.onDidChangeActiveProject((passed) =>
            seen.push({ text: host.statusBar.current?.text, active: controller.snapshot().active, passed }),
        );
        await controller.start();
        expect(seen).toHaveLength(1);
        expect(seen[0]?.text).toBe('FeatherSpec: a (1.10.0)');
        expect(seen[0]?.active?.root).toBe('a');
        expect(seen[0]?.passed).toBe(seen[0]?.active);
    });

    it('AC-023: a failing subscriber does not stop the other subscriber, the status bar or the run', async () => {
        const { host, controller, received } = setup(['a'], (fileSystem) => addProject(fileSystem, 'a'));
        controller.onDidChangeActiveProject(() => {
            throw new Error('subscriber broke');
        });
        const later: (string | undefined)[] = [];
        controller.onDidChangeActiveProject((active) => later.push(active?.root));
        await expect(controller.start()).resolves.toBeUndefined();
        expect(received).toEqual(['a']);
        expect(later).toEqual(['a']);
        expect(host.statusBar.current?.text).toBe('FeatherSpec: a (1.10.0)');
    });

    it('AC-023: a disposed subscription receives nothing further', async () => {
        const { fileSystem, controller, received, subscription } = setup(['a'], (system) => addProject(system, 'a'));
        await controller.start();
        subscription.dispose();
        fileSystem.remove('a', 'AGENTS.md');
        await controller.refresh();
        expect(received).toEqual(['a']);
    });
});
