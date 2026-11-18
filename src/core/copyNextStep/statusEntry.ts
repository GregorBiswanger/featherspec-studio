import type { Disposable } from '../ports/host';
import type { DiscoveryController } from '../discovery/discoveryController';
import type { StatusEntryView, StatusItemPort } from '../ports/copyNextStep';
import type { ShellModel, ShellModelSource } from '../ports/shell';
import type { ShellService } from '../shell/shellService';
import { currentSpec, pickOrder, readyCount, specsWithStep } from './currentSpec';
import { entryView, type Situation } from './entryView';
import type { ProjectLine } from './projectLine';

export interface StatusEntryDeps {
    line: Pick<ProjectLine, 'current' | 'onDidChange'>;
    discovery: Pick<DiscoveryController, 'snapshot' | 'onDidUpdate'>;
    shell: Pick<ShellService, 'view' | 'onDidChangeView'>;
    source: ShellModelSource;
    item: StatusItemPort;
    sameRoot: (first: string, second: string) => boolean;
}

export interface StatusEntry extends Disposable {
    situation(): Situation;
}

export function createStatusEntry(deps: StatusEntryDeps): StatusEntry {
    let shown: string | undefined;

    function loadedModel(root: string): ShellModel | undefined {
        const model = deps.source.current();
        return model !== undefined && deps.sameRoot(model.project.root, root) ? model : undefined;
    }

    function situation(): Situation {
        const snapshot = deps.discovery.snapshot();
        const active = snapshot.active;
        if (active === undefined) {
            return { kind: 'line', line: deps.line.current() };
        }
        const project = { name: active.name, version: active.version };
        const projects = (snapshot.result?.folders ?? []).filter((folder) => folder.verdict === 'project').length;
        const view = deps.shell.view();
        const model = loadedModel(active.root);
        if (model === undefined || view.state?.id === 'S4' || view.state?.id === 'S5') {
            return { kind: 'notRead', project, projects };
        }
        const steps = pickOrder(specsWithStep(model));
        const spec = currentSpec(steps, view.selection === undefined ? undefined : { stem: view.selection.stem, path: view.selection.path });
        return spec === undefined ? { kind: 'none', project, projects, ready: readyCount(model), steps } : { kind: 'current', project, projects, spec, steps };
    }

    function render(): void {
        const view: StatusEntryView | undefined = entryView(situation());
        const serialized = view === undefined ? '' : JSON.stringify(view);
        if (serialized === shown) {
            return;
        }
        shown = serialized;
        if (view === undefined) {
            deps.item.hide();
        } else {
            deps.item.show(view);
        }
    }

    const subscriptions: Disposable[] = [
        deps.line.onDidChange(render),
        deps.discovery.onDidUpdate(render),
        deps.shell.onDidChangeView(render),
        deps.source.onDidChange(render),
    ];
    render();

    return {
        situation,
        dispose() {
            subscriptions.forEach((subscription) => subscription.dispose());
        },
    };
}
