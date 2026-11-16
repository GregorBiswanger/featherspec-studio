import type {
    ClockPort,
    Disposable,
    MarkerWatchPort,
    OutputPort,
    StatusBarPort,
    UiPort,
    WorkspaceFoldersPort,
    WorkspaceStatePort,
} from '../ports/host';
import type { ReadOnlyFileSystem } from '../ports/readOnlyFileSystem';
import { resolveActiveProject } from './activeProject';
import { discoverWorkspace, type DiscoveredFolder, type DiscoveryResult } from './discoverWorkspace';
import { createRerunScheduler } from './rerunScheduler';
import { buildNoProjectNotification, buildSelectItems, formatOutputBlock, SETUP_GUIDE_URL } from './report';

const RERUN_DEBOUNCE_MS = 200;

export interface DiscoveryControllerDeps {
    fileSystem: ReadOnlyFileSystem;
    statusBar: StatusBarPort;
    output: OutputPort;
    state: WorkspaceStatePort;
    folders: WorkspaceFoldersPort;
    clock: ClockPort;
    ui: UiPort;
    watch: MarkerWatchPort;
    sameRoot: (first: string, second: string) => boolean;
}

export interface DiscoverySnapshot {
    result: DiscoveryResult | undefined;
    active: DiscoveredFolder | undefined;
}

export interface DiscoveryController {
    start(): Promise<void>;
    refresh(): Promise<void>;
    selectProject(): Promise<void>;
    whenIdle(): Promise<void>;
    dispose(): void;
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

    let queue: Promise<unknown> = Promise.resolve();

    function runOnce(): Promise<DiscoveryResult> {
        const next = queue.then(async () => {
            const discovered = await discover();
            await apply(discovered, undefined);
            return discovered;
        });
        queue = next.catch(() => undefined);
        return next;
    }

    const scheduler = createRerunScheduler({
        clock: deps.clock,
        debounceMs: RERUN_DEBOUNCE_MS,
        run: async () => {
            await runOnce();
        },
    });
    const watches: { root: string; subscription: Disposable }[] = [];
    let folderSubscription: Disposable | undefined;

    function syncWatches(): void {
        const wanted = deps.folders.list();
        for (const watched of [...watches]) {
            if (!wanted.some((folder) => deps.sameRoot(folder.root, watched.root))) {
                watched.subscription.dispose();
                watches.splice(watches.indexOf(watched), 1);
            }
        }
        for (const folder of wanted) {
            if (!watches.some((watched) => deps.sameRoot(watched.root, folder.root))) {
                const subscription = deps.watch.watch(folder.root, () => scheduler.trigger());
                watches.push({ root: folder.root, subscription });
            }
        }
    }

    return {
        async start() {
            if (folderSubscription === undefined) {
                folderSubscription = deps.folders.onDidChange(() => {
                    syncWatches();
                    scheduler.trigger();
                });
                syncWatches();
            }
            await runOnce();
        },
        async refresh() {
            await runOnce();
        },
        async selectProject() {
            const current = result ?? (await runOnce());
            const items = buildSelectItems(current);
            if (items.length === 0) {
                const model = buildNoProjectNotification(current.folders.length);
                const action = await deps.ui.showNotification(model);
                if (action === 'Open setup guide') {
                    await deps.ui.openExternal(SETUP_GUIDE_URL);
                } else if (action === 'Refresh') {
                    await runOnce();
                }
                return;
            }
            const picked = await deps.ui.showQuickPick(items);
            if (picked !== undefined) {
                await apply(current, picked.root);
            }
        },
        async whenIdle() {
            await scheduler.whenIdle();
            await queue;
        },
        dispose() {
            scheduler.dispose();
            folderSubscription?.dispose();
            folderSubscription = undefined;
            watches.splice(0).forEach((watched) => watched.subscription.dispose());
        },
        snapshot: () => ({ result, active }),
    };
}
