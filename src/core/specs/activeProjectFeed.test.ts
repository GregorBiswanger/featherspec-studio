import { describe, expect, it } from 'vitest';
import { createDiscoveryController } from '../discovery/discoveryController';
import { createFakeHost, createFakeState } from '../discovery/testing/fakeHost';
import { createMemoryFileSystem } from '../discovery/testing/memoryFileSystem';
import { connectActiveProject } from './activeProjectFeed';
import { createSpecRepository } from './specRepository';
import { createFakeFileWatch } from './testing/fakeFileWatch';
import { createMemorySpecSource } from './testing/memorySpecSource';

const sameRoot = (first: string, second: string): boolean => first === second;

function spec(): string {
    return '# Spec\n\n**Status:** Draft\n**Plan:** _none yet_\n';
}

function setup(roots: string[]) {
    const fileSystem = createMemoryFileSystem();
    const source = createMemorySpecSource();
    for (const root of roots) {
        fileSystem.setFile(root, 'AGENTS.md', 'FeatherSpecVersion: 1.10.0\n');
        fileSystem.setDirectory(root, '.specs');
        source.setFile(root, `.specs/active/0001-in-${root}.md`, spec());
    }
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
    const watch = createFakeFileWatch();
    const repository = createSpecRepository({ source, watch, clock: host.clock });
    return { fileSystem, source, host, controller, watch, repository };
}

describe('connectActiveProject', () => {
    it('AC-022: the active project that 0001 reports on start is read and watched', async () => {
        const { controller, repository, watch } = setup(['a']);
        connectActiveProject(controller, repository);
        await controller.start();
        await repository.whenIdle();
        expect(repository.snapshot()?.root).toBe('a');
        expect(repository.snapshot()?.specs.map((entry) => entry.reference)).toEqual(['0001-in-a']);
        expect(watch.watched()).toEqual(['a']);
    });

    it('AC-022: connecting after 0001 has started still opens the project it already reported (no replay)', async () => {
        const { controller, repository } = setup(['a']);
        await controller.start();
        connectActiveProject(controller, repository);
        await repository.whenIdle();
        expect(repository.snapshot()?.root).toBe('a');
    });

    it('AC-022: a changed version reported by 0001 gives a fresh read with the new version', async () => {
        const { controller, repository, fileSystem } = setup(['a']);
        connectActiveProject(controller, repository);
        await controller.start();
        await repository.whenIdle();
        expect(repository.snapshot()?.version).toBe('1.10.0');
        fileSystem.setFile('a', 'AGENTS.md', 'FeatherSpecVersion: 2.0.0\n');
        await controller.refresh();
        await repository.whenIdle();
        expect(repository.snapshot()?.version).toBe('2.0.0');
        expect(repository.snapshot()?.diagnostics).toEqual([{ kind: 'unverified-version', scope: 'project', reason: 'newer than known' }]);
    });

    it('AC-022: when 0001 reports no active project the repository stops watching and discards the model', async () => {
        const { controller, repository, fileSystem, watch } = setup(['a']);
        connectActiveProject(controller, repository);
        await controller.start();
        await repository.whenIdle();
        fileSystem.remove('a', 'AGENTS.md');
        await controller.refresh();
        await repository.whenIdle();
        expect(repository.snapshot()).toBeUndefined();
        expect(watch.watched()).toEqual([]);
    });

    it('AC-022: 0001 reporting the same root and the same version again triggers no re-read and no notification', async () => {
        const { controller, repository, source } = setup(['a']);
        const changes: unknown[] = [];
        repository.onDidChange((change) => changes.push(change));
        connectActiveProject(controller, repository);
        await controller.start();
        await repository.whenIdle();
        const model = repository.snapshot();
        const reads = source.reads().length;
        changes.length = 0;
        await controller.refresh();
        await repository.whenIdle();
        expect(source.reads()).toHaveLength(reads);
        expect(changes).toEqual([]);
        expect(repository.snapshot()).toBe(model);
    });

    it('AC-022: an AGENTS.md edit that keeps the version does not change the model', async () => {
        const { controller, repository, fileSystem, source } = setup(['a']);
        const changes: unknown[] = [];
        repository.onDidChange((change) => changes.push(change));
        connectActiveProject(controller, repository);
        await controller.start();
        await repository.whenIdle();
        const model = repository.snapshot();
        const reads = source.reads().length;
        changes.length = 0;
        fileSystem.setFile('a', 'AGENTS.md', 'FeatherSpecVersion: 1.10.0\n\n# edited, version kept\n');
        await controller.refresh();
        await repository.whenIdle();
        expect(source.reads()).toHaveLength(reads);
        expect(changes).toEqual([]);
        expect(repository.snapshot()).toBe(model);
    });

    it('AC-022: a change under .specs/ reaches the model through the watcher, and a missed one through rescan()', async () => {
        const { controller, repository, source, watch, host } = setup(['a']);
        connectActiveProject(controller, repository);
        await controller.start();
        await repository.whenIdle();
        source.setFile('a', '.specs/backlog/0002-watched.md', spec());
        watch.fire('a', '.specs/backlog/0002-watched.md');
        host.clock.advance(200);
        await repository.whenIdle();
        expect(repository.snapshot()?.specs.map((entry) => entry.reference)).toEqual(['0001-in-a', '0002-watched']);
        source.setFile('a', '.specs/backlog/0003-missed.md', spec());
        expect(repository.snapshot()?.specs.map((entry) => entry.reference)).not.toContain('0003-missed');
        await repository.rescan();
        expect(repository.snapshot()?.specs.map((entry) => entry.reference)).toContain('0003-missed');
    });

    it('AC-022: no active project from the start never touches the repository', async () => {
        const { controller, repository, watch } = setup([]);
        const changes: unknown[] = [];
        repository.onDidChange((change) => changes.push(change));
        connectActiveProject(controller, repository);
        await controller.start();
        await repository.whenIdle();
        expect(changes).toEqual([]);
        expect(watch.watched()).toEqual([]);
    });

    it('AC-022: disposing the connection stops following 0001', async () => {
        const { controller, repository } = setup(['a']);
        const connection = connectActiveProject(controller, repository);
        connection.dispose();
        await controller.start();
        await repository.whenIdle();
        expect(repository.snapshot()).toBeUndefined();
    });
});
