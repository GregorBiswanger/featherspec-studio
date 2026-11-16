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

export type ActiveProjectListener = (active: DiscoveredFolder | undefined) => void;

export interface DiscoveryController {
    onDidChangeActiveProject(listener: ActiveProjectListener): Disposable;
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

    const activeListeners = new Set<ActiveProjectListener>();
    let notified: { active: DiscoveredFolder | undefined } | undefined;

    function sameActive(previous: DiscoveredFolder | undefined, next: DiscoveredFolder | undefined): boolean {
        if (previous === undefined || next === undefined) {
            return previous === next;
        }
        return deps.sameRoot(previous.root, next.root) && previous.version === next.version && previous.legacy === next.legacy;
    }

    function notifyActiveChanged(): void {
        if (notified !== undefined && sameActive(notified.active, active)) {
            return;
        }
        notified = { active };
        for (const listener of [...activeListeners]) {
            try {
                listener(active);
            } catch {
                continue;
            }
        }
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
        notifyActiveChanged();
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
        onDidChangeActiveProject(listener) {
            activeListeners.add(listener);
            return { dispose: () => void activeListeners.delete(listener) };
        },
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
