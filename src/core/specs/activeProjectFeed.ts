import type { DiscoveredFolder } from '../discovery/discoverWorkspace';
import type { DiscoveryController } from '../discovery/discoveryController';
import type { Disposable } from '../ports/host';
import type { RepositoryProject, SpecRepository } from './specRepository';

export function connectActiveProject(
    controller: Pick<DiscoveryController, 'snapshot' | 'onDidChangeActiveProject'>,
    repository: Pick<SpecRepository, 'open'>,
): Disposable {
    let disposed = false;
    let last: RepositoryProject | undefined;

    function follow(active: DiscoveredFolder | undefined): void {
        if (disposed) {
            return;
        }
        if (active === undefined) {
            if (last !== undefined) {
                last = undefined;
                void repository.open(undefined).catch(() => undefined);
            }
            return;
        }
        const setupRun = active.setupRun ?? 'run or unknown';
        if (last?.root === active.root && last.version === active.version && last.setupRun === setupRun) {
            return;
        }
        last = { root: active.root, version: active.version, setupRun };
        void repository.open(last).catch(() => undefined);
    }

    const subscription = controller.onDidChangeActiveProject(follow);
    follow(controller.snapshot().active);
    return {
        dispose() {
            disposed = true;
            subscription.dispose();
        },
    };
}
