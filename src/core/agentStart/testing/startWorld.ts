import { createNodeFileSystem } from '../../../adapters/node/nodeFileSystem';
import { createNodeSpecSource } from '../../../adapters/node/nodeSpecSource';
import { fixturePath } from '../../discovery/testing/fixtures';
import { deriveLifecycle } from '../../lifecycle/deriveLifecycle';
import { createRunSource, type RunSource } from '../../missionControl/runSource';
import { createWorld, type World, type WorldOptions } from '../../orchestrator/testing/world';
import type { Disposable, SettingPort } from '../../ports/host';
import type { ReadOnlyFileSystem } from '../../ports/readOnlyFileSystem';
import type { TrustPort } from '../../ports/shell';
import { readProject } from '../../specs/readProject';
import type { PreconditionDeps } from '../preconditions';

export const START_FIXTURE = 'fs110-start-ready';
export const START_STEM = '0001-ready-feature';

export interface FakeSetting extends SettingPort {
    value: unknown;
    set(value: unknown): void;
}

export function createFakeSetting(initial: unknown): FakeSetting {
    const listeners = new Set<() => void>();
    const setting: FakeSetting = {
        value: initial,
        read: () => setting.value,
        onDidChange(listener): Disposable {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
        set(value) {
            setting.value = value;
            [...listeners].forEach((listener) => listener());
        },
    };
    return setting;
}

export interface FakeTrust extends TrustPort {
    trusted: boolean;
}

export interface HidingFileSystem extends ReadOnlyFileSystem {
    hide(path: string): void;
}

export interface StartWorld extends World {
    root: string;
    setting: FakeSetting;
    trust: FakeTrust;
    files: HidingFileSystem;
    runSource: RunSource;
    deps: PreconditionDeps;
    loadFixture(root?: string): Promise<void>;
}

export async function createStartWorld(options: WorldOptions & { root?: string } = {}): Promise<StartWorld> {
    const base = await createWorld(options);
    const root = options.root ?? fixturePath(START_FIXTURE);
    const node = createNodeFileSystem();
    const hidden = new Set<string>();
    const files: HidingFileSystem = {
        hide: (path) => void hidden.add(path),
        stat: (target, relative) => (hidden.has(relative) ? Promise.resolve(undefined) : node.stat(target, relative)),
        readText: (target, relative) => node.readText(target, relative),
        readDirectory: (target, relative) => node.readDirectory(target, relative),
    };
    const setting = createFakeSetting('fake');
    const trust: FakeTrust = { trusted: true, isTrusted: () => trust.trusted, onDidGrant: () => ({ dispose: () => undefined }) };
    const originalSetSpecs = base.setSpecs;
    const runSource = createRunSource({ session: base.session });
    const world: StartWorld = Object.assign(base, {
        root,
        setting,
        trust,
        files,
        runSource,
        deps: {
            model: { current: () => base.model.current, updatedAt: () => '', onDidChange: () => ({ dispose: () => undefined }) },
            files,
            setting,
            registry: base.setup.registry,
            providers: base.setup.service,
            runs: runSource,
            session: base.session,
            trust,
        } satisfies PreconditionDeps,
        async setSpecs(specs: Parameters<World['setSpecs']>[0]) {
            await originalSetSpecs(specs);
            const current = base.model.current;
            if (current !== undefined) {
                base.model.current = { ...current, project: { ...current.project, root } };
            }
        },
        async loadFixture(target = root) {
            const project = await readProject(createNodeSpecSource(), target, '1.10.0');
            base.model.current = { project, lifecycle: deriveLifecycle(project) };
        },
    });
    await world.loadFixture();
    return world;
}
