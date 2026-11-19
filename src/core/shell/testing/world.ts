import type { DiscoveryController } from '../../discovery/discoveryController';
import { createDiscoveryController } from '../../discovery/discoveryController';
import { createFakeHost, createFakeState, type FakeHost } from '../../discovery/testing/fakeHost';
import { createMemoryFileSystem, type MemoryFileSystem } from '../../discovery/testing/memoryFileSystem';
import type { Disposable } from '../../ports/host';
import type { ShellActionsPort, TrustPort, UiMemoryPort } from '../../ports/shell';
import { connectActiveProject } from '../../specs/activeProjectFeed';
import { createSpecRepository, type SpecRepository } from '../../specs/specRepository';
import { createFakeFileWatch } from '../../specs/testing/fakeFileWatch';
import { createMemorySpecSource, type MemorySpecSource } from '../../specs/testing/memorySpecSource';
import { createModelSource } from '../modelSource';
import { createShellService, type ShellService } from '../shellService';

export const SPEC_HEADER = (status: string, title = 'A spec') => `# ${title}\n\n**Status:** ${status}\n**Plan:** _none yet_\n`;

export interface FakeTrust extends TrustPort {
    trusted: boolean;
    grant(): void;
}

export interface FakeMemory extends UiMemoryPort {
    value: unknown;
    writes: unknown[];
}

export interface FakeActions extends ShellActionsPort {
    calls: string[];
}

export interface ShellWorld {
    host: FakeHost;
    discoveryFs: MemoryFileSystem;
    specs: MemorySpecSource;
    controller: DiscoveryController;
    repository: SpecRepository;
    trust: FakeTrust;
    memory: FakeMemory;
    sideMemory: FakeMemory;
    actions: FakeActions;
    service: ShellService;
    views: string[];
    settle(): Promise<void>;
    restart(): ShellService;
    dispose(): void;
}

export interface WorldOptions {
    roots?: string[];
    rememberedRoot?: string;
    trusted?: boolean;
    memory?: unknown;
    sideMemory?: unknown;
}

export function createShellWorld(options: WorldOptions = {}): ShellWorld {
    const roots = options.roots ?? ['proj'];
    const discoveryFs = createMemoryFileSystem();
    const specs = createMemorySpecSource();
    const host = createFakeHost(roots.map((root) => ({ root, name: root })), createFakeState(options.rememberedRoot));
    const sameRoot = (first: string, second: string) => first === second;
    const controller = createDiscoveryController({
        fileSystem: discoveryFs,
        statusBar: host.statusBar,
        output: host.output,
        state: host.state,
        folders: host.folders,
        clock: host.clock,
        ui: host.ui,
        watch: host.watch,
        sameRoot,
    });
    const repository = createSpecRepository({ source: specs, watch: createFakeFileWatch(), clock: host.clock });
    const feed = connectActiveProject(controller, repository);
    const grantListeners = new Set<() => void>();
    const trust: FakeTrust = {
        trusted: options.trusted ?? true,
        isTrusted: () => trust.trusted,
        onDidGrant(listener): Disposable {
            grantListeners.add(listener);
            return { dispose: () => void grantListeners.delete(listener) };
        },
        grant() {
            trust.trusted = true;
            [...grantListeners].forEach((listener) => listener());
        },
    };
    const fakeMemory = (value: unknown): FakeMemory => {
        const fake: FakeMemory = {
            value,
            writes: [],
            get: () => fake.value,
            async set(next) {
                fake.value = next;
                fake.writes.push(next);
            },
        };
        return fake;
    };
    const memory = fakeMemory(options.memory);
    const sideMemory = fakeMemory(options.sideMemory);
    const actions: FakeActions = {
        calls: [],
        async openFolder() {
            actions.calls.push('openFolder');
        },
        async openSetupGuide() {
            actions.calls.push('openSetupGuide');
        },
        showOutput() {
            actions.calls.push('showOutput');
        },
        async manageTrust() {
            actions.calls.push('manageTrust');
        },
        reloadPanel() {
            actions.calls.push('reloadPanel');
        },
        async setUp() {
            actions.calls.push('setUp');
        },
        async copyMergePrompt() {
            actions.calls.push('copyMergePrompt');
        },
    };
    const services: ShellService[] = [];
    const build = (): ShellService => {
        const service = createShellService({
            discovery: controller,
            repository,
            source: createModelSource(repository),
            folders: host.folders,
            trust,
            memory,
            sideMemory,
            actions,
            sameRoot,
        });
        services.push(service);
        return service;
    };
    const service = build();
    const views: string[] = [];
    service.onDidChangeView((view) => views.push(view.state?.id ?? 'area'));
    const world: ShellWorld = {
        host,
        discoveryFs,
        specs,
        controller,
        repository,
        trust,
        memory,
        sideMemory,
        actions,
        service,
        views,
        async settle() {
            await controller.whenIdle();
            await repository.whenIdle();
        },
        restart() {
            return build();
        },
        dispose() {
            services.forEach((each) => each.dispose());
            feed.dispose();
            controller.dispose();
            repository.dispose();
        },
    };
    return world;
}

export function addProject(world: ShellWorld, root = 'proj', specFiles: Record<string, string> = {}): void {
    world.discoveryFs.setFile(root, 'AGENTS.md', 'FeatherSpecVersion: 1.10.0\n');
    world.discoveryFs.setDirectory(root, '.specs');
    world.specs.setFile(root, 'AGENTS.md', 'FeatherSpecVersion: 1.10.0\n');
    world.specs.setDirectory(root, '.specs');
    for (const folder of ['backlog', 'active', 'done']) {
        world.specs.setDirectory(root, `.specs/${folder}`);
    }
    for (const [relativePath, content] of Object.entries(specFiles)) {
        world.specs.setFile(root, relativePath, content);
    }
}
