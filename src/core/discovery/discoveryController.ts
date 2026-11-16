import type { ClockPort, OutputPort, StatusBarPort, WorkspaceFoldersPort, WorkspaceStatePort } from '../ports/host';
import type { ReadOnlyFileSystem } from '../ports/readOnlyFileSystem';
import { resolveActiveProject } from './activeProject';
import { discoverWorkspace, type DiscoveredFolder, type DiscoveryResult } from './discoverWorkspace';
import { formatOutputBlock } from './report';

export interface DiscoveryControllerDeps {
    fileSystem: ReadOnlyFileSystem;
    statusBar: StatusBarPort;
    output: OutputPort;
    state: WorkspaceStatePort;
    folders: WorkspaceFoldersPort;
    clock: ClockPort;
    sameRoot: (first: string, second: string) => boolean;
}

export interface DiscoverySnapshot {
    result: DiscoveryResult | undefined;
    active: DiscoveredFolder | undefined;
}

export interface DiscoveryController {
    start(): Promise<void>;
    snapshot(): DiscoverySnapshot;
}

export function createDiscoveryController(deps: DiscoveryControllerDeps): DiscoveryController {
    let result: DiscoveryResult | undefined;
    let active: DiscoveredFolder | undefined;

    async function discover(): Promise<DiscoveryResult> {
        const discovered = await discoverWorkspace(deps.fileSystem, deps.folders.list(), { sameRoot: deps.sameRoot });
        result = discovered;
        deps.output.appendBlock(formatOutputBlock(discovered, deps.clock.now()));
        return discovered;
    }

    async function apply(discovered: DiscoveryResult, selection: string | undefined): Promise<void> {
        const outcome = resolveActiveProject({
            result: discovered,
            remembered: deps.state.get(),
            selection,
            sameRoot: deps.sameRoot,
        });
        active = outcome.active;
        if (outcome.remember !== undefined && outcome.remember !== deps.state.get()) {
            await deps.state.set(outcome.remember);
        }
        if (outcome.statusBar.visible) {
            deps.statusBar.show(outcome.statusBar.text, outcome.statusBar.command);
        } else {
            deps.statusBar.hide();
        }
    }

    return {
        async start() {
            await apply(await discover(), undefined);
        },
        snapshot: () => ({ result, active }),
    };
}
