import type { ClockPort, Disposable } from '../../core/ports/host';
import type { FileWatchPort } from '../../core/ports/fileWatch';
import type { ReadOnlyFileSystem } from '../../core/ports/readOnlyFileSystem';
import type { SpecSourcePort } from '../../core/ports/specSource';
import { discoverWorkspace } from '../../core/discovery/discoverWorkspace';
import { createSpecRepository, type SpecRepository } from '../../core/specs/specRepository';

const UPDATE_TIMEOUT_MS = 30_000;

export interface BudgetStats {
    calls: number;
    frames: number;
}

export interface BudgetMeasure extends BudgetStats {
    ms: number;
}

export interface BudgetProbeOptions {
    source: SpecSourcePort;
    fileSystem: ReadOnlyFileSystem;
    sameRoot: (first: string, second: string) => boolean;
    clock: ClockPort;
    now: () => number;
    stats: () => BudgetStats;
}

export interface BudgetProbe {
    read(root: string, version: string): Promise<BudgetMeasure>;
    update(relativePath: string): Promise<BudgetMeasure>;
    discover(roots: readonly string[]): Promise<BudgetMeasure>;
    dispose(): void;
}

interface FireableWatch extends FileWatchPort {
    fire(root: string, relativePath: string): void;
}

function createFireableWatch(): FireableWatch {
    const registrations: { root: string; listener: (relativePath: string) => void }[] = [];
    return {
        watch(root, listener): Disposable {
            const registration = { root, listener };
            registrations.push(registration);
            return { dispose: () => void registrations.splice(registrations.indexOf(registration), 1) };
        },
        fire(root, relativePath) {
            registrations.filter((registration) => registration.root === root).forEach((registration) => registration.listener(relativePath));
        },
    };
}

function folderName(root: string): string {
    const segments = root.split('/').filter((segment) => segment !== '');
    return decodeURIComponent(segments[segments.length - 1] ?? root);
}

export function createBudgetProbe(options: BudgetProbeOptions): BudgetProbe {
    const watch = createFireableWatch();
    let repository: SpecRepository | undefined;
    let root: string | undefined;

    const fresh = (): SpecRepository => {
        repository?.dispose();
        repository = createSpecRepository({ source: options.source, watch, clock: options.clock });
        return repository;
    };

    const timed = async (measured: () => Promise<void>): Promise<BudgetMeasure> => {
        const before = options.stats();
        const started = options.now();
        await measured();
        const ms = options.now() - started;
        const after = options.stats();
        return { ms, calls: after.calls - before.calls, frames: after.frames - before.frames };
    };

    return {
        async read(projectRoot, version) {
            root = projectRoot;
            await fresh().open({ root: projectRoot, version });
            let best: BudgetMeasure | undefined;
            for (let attempt = 0; attempt < 3; attempt += 1) {
                const current = fresh();
                const measure = await timed(() => current.open({ root: projectRoot, version }));
                if (best === undefined || measure.ms < best.ms) {
                    best = measure;
                }
            }
            return best ?? { ms: 0, calls: 0, frames: 0 };
        },
        async discover(roots) {
            const folders = roots.map((folderRoot) => ({ root: folderRoot, name: folderName(folderRoot) }));
            const discovery = { sameRoot: options.sameRoot };
            await discoverWorkspace(options.fileSystem, folders, discovery);
            let best: BudgetMeasure | undefined;
            for (let attempt = 0; attempt < 3; attempt += 1) {
                const measure = await timed(async () => {
                    await discoverWorkspace(options.fileSystem, folders, discovery);
                });
                if (best === undefined || measure.ms < best.ms) {
                    best = measure;
                }
            }
            return best ?? { ms: 0, calls: 0, frames: 0 };
        },
        update(relativePath) {
            const current = repository;
            const projectRoot = root;
            if (current === undefined || projectRoot === undefined) {
                return Promise.reject(new Error('budget.update needs a budget.read first.'));
            }
            return new Promise<BudgetMeasure>((resolve, reject) => {
                const guard = options.clock.setTimeout(() => {
                    subscription.dispose();
                    reject(new Error('The repository did not report the change in time.'));
                }, UPDATE_TIMEOUT_MS);
                const before = options.stats();
                const started = options.now();
                const subscription = current.onDidChange(() => {
                    subscription.dispose();
                    guard.dispose();
                    const ms = options.now() - started;
                    const after = options.stats();
                    resolve({ ms, calls: after.calls - before.calls, frames: after.frames - before.frames });
                });
                watch.fire(projectRoot, relativePath);
            });
        },
        dispose() {
            repository?.dispose();
            repository = undefined;
            root = undefined;
        },
    };
}
