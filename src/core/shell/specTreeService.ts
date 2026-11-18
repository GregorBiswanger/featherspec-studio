import type { Disposable } from '../ports/host';
import type { ShellModelSource } from '../ports/shell';
import type { DiscoveryController } from '../discovery/discoveryController';
import type { ShellService } from './shellService';
import { buildSpecTree, type SpecTreeModel } from './specTree';

export interface SpecTreeServiceDeps {
    shell: Pick<ShellService, 'view' | 'onDidChangeView'>;
    source: ShellModelSource;
    discovery: Pick<DiscoveryController, 'snapshot' | 'onDidUpdate'>;
    sameRoot: (first: string, second: string) => boolean;
}

export interface SpecTreeService {
    model(): SpecTreeModel;
    onDidChange(listener: (model: SpecTreeModel) => void): Disposable;
    dispose(): void;
}

export function createSpecTreeService(deps: SpecTreeServiceDeps): SpecTreeService {
    const listeners = new Set<(model: SpecTreeModel) => void>();

    function compute(): SpecTreeModel {
        const snapshot = deps.discovery.snapshot();
        const active = snapshot.active;
        const model = deps.source.current();
        const loaded = active !== undefined && model !== undefined && deps.sameRoot(model.project.root, active.root) ? model : undefined;
        return buildSpecTree({
            projectActive: active !== undefined,
            projectName: active?.name,
            projectCount: snapshot.result?.folders.filter((folder) => folder.verdict === 'project').length ?? 0,
            state: deps.shell.view().state,
            model: loaded,
        });
    }

    let current = compute();
    let serialized = JSON.stringify(current);

    function rebuild(): void {
        const next = compute();
        const text = JSON.stringify(next);
        if (text === serialized) {
            return;
        }
        current = next;
        serialized = text;
        [...listeners].forEach((listener) => {
            try {
                listener(next);
            } catch {
                return;
            }
        });
    }

    const subscriptions: Disposable[] = [deps.shell.onDidChangeView(rebuild), deps.source.onDidChange(rebuild), deps.discovery.onDidUpdate(rebuild)];

    return {
        model: () => current,
        onDidChange(listener) {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
        dispose() {
            subscriptions.forEach((subscription) => subscription.dispose());
            listeners.clear();
        },
    };
}
