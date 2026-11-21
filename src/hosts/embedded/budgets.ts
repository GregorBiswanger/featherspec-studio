import type { ClockPort, Disposable } from '../../core/ports/host';
import type { FileWatchPort } from '../../core/ports/fileWatch';
import type { SpecSourcePort } from '../../core/ports/specSource';
import { createSpecRepository, type SpecRepository } from '../../core/specs/specRepository';

const UPDATE_TIMEOUT_MS = 30_000;

export interface BudgetProbeOptions {
    source: SpecSourcePort;
    clock: ClockPort;
    now: () => number;
}

export interface BudgetProbe {
    read(root: string, version: string): Promise<number>;
    update(relativePath: string): Promise<number>;
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

export function createBudgetProbe(options: BudgetProbeOptions): BudgetProbe {
    const watch = createFireableWatch();
    let repository: SpecRepository | undefined;
    let root: string | undefined;

    const fresh = (): SpecRepository => {
        repository?.dispose();
        repository = createSpecRepository({ source: options.source, watch, clock: options.clock });
        return repository;
    };

    const timed = async (measured: () => Promise<void>): Promise<number> => {
        const started = options.now();
        await measured();
        return options.now() - started;
    };

    return {
        async read(projectRoot, version) {
            root = projectRoot;
            await fresh().open({ root: projectRoot, version });
            let best = Number.POSITIVE_INFINITY;
            for (let attempt = 0; attempt < 3; attempt += 1) {
                const current = fresh();
                best = Math.min(best, await timed(() => current.open({ root: projectRoot, version })));
            }
            return best;
        },
        update(relativePath) {
            const current = repository;
            const projectRoot = root;
            if (current === undefined || projectRoot === undefined) {
                return Promise.reject(new Error('budget.update needs a budget.read first.'));
            }
            return new Promise<number>((resolve, reject) => {
                const guard = options.clock.setTimeout(() => {
                    subscription.dispose();
                    reject(new Error('The repository did not report the change in time.'));
                }, UPDATE_TIMEOUT_MS);
                const started = options.now();
                const subscription = current.onDidChange(() => {
                    subscription.dispose();
                    guard.dispose();
                    resolve(options.now() - started);
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
