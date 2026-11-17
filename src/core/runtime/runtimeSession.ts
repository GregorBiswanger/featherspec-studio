import type { DiscoveryController } from '../discovery/discoveryController';
import type { Disposable } from '../ports/host';
import { RuntimeRefusal, type StoreState } from './model';
import {
    CLEAR_BUTTON,
    NOT_CLEARED_DECLINED,
    NOT_CLEARED_NO_PROJECT,
    NO_ACTIVE_PROJECT_REASON,
    clearedNotice,
    notClearedBecause,
} from './notices';
import type { RuntimeStore } from './runtimeStore';

export { CLEAR_BUTTON };

export interface RuntimeUiPort {
    confirmClear(project: string): Promise<boolean>;
    info(message: string): void;
    warn(message: string): void;
}

export interface RuntimeSessionDeps {
    discovery: Pick<DiscoveryController, 'snapshot' | 'onDidChangeActiveProject'>;
    openStore(projectRoot: string): Promise<RuntimeStore>;
    ui: RuntimeUiPort;
}

export interface RuntimeSession {
    start(): Promise<void>;
    current(): RuntimeStore | undefined;
    state(): StoreState;
    onDidChangeState(listener: (state: StoreState) => void): Disposable;
    clearRunHistory(): Promise<void>;
    whenIdle(): Promise<void>;
    dispose(): Promise<void>;
}

const NO_PROJECT_STATE: StoreState = { kind: 'unavailable', reason: NO_ACTIVE_PROJECT_REASON };

export function createRuntimeSession(deps: RuntimeSessionDeps): RuntimeSession {
    const listeners = new Set<(state: StoreState) => void>();
    let store: RuntimeStore | undefined;
    let storeSubscription: Disposable | undefined;
    let activeRoot: string | undefined;
    let activeName = '';
    let state: StoreState = NO_PROJECT_STATE;
    let chain: Promise<void> = Promise.resolve();
    let subscription: Disposable | undefined;
    let disposed = false;

    function setState(next: StoreState, storeSwitched = false): void {
        if (!storeSwitched && next.kind === state.kind && next.reason === state.reason) {
            return;
        }
        state = next;
        [...listeners].forEach((listener) => listener(next));
    }

    async function closeStore(): Promise<void> {
        storeSubscription?.dispose();
        storeSubscription = undefined;
        const closing = store;
        store = undefined;
        await closing?.dispose();
    }

    async function switchTo(root: string | undefined, name: string): Promise<void> {
        if (disposed || root === activeRoot) {
            return;
        }
        activeRoot = root;
        activeName = name;
        await closeStore();
        if (root === undefined) {
            setState(NO_PROJECT_STATE);
            return;
        }
        try {
            const opened = await deps.openStore(root);
            if (disposed || activeRoot !== root) {
                await opened.dispose();
                return;
            }
            store = opened;
            storeSubscription = opened.onDidChangeState((next) => setState(next));
            setState(opened.state(), true);
        } catch (error) {
            setState({ kind: 'unavailable', reason: error instanceof Error ? error.message : String(error) });
        }
    }

    function follow(active: { root: string; name: string } | undefined): void {
        chain = chain.then(() => switchTo(active?.root, active?.name ?? ''));
    }

    return {
        async start() {
            subscription ??= deps.discovery.onDidChangeActiveProject((active) => follow(active));
            const { result, active } = deps.discovery.snapshot();
            if (result !== undefined) {
                follow(active);
            }
            await chain;
        },
        current: () => store,
        state: () => state,
        onDidChangeState(listener) {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
        async clearRunHistory() {
            await chain;
            const target = store;
            if (target === undefined || activeRoot === undefined) {
                deps.ui.info(NOT_CLEARED_NO_PROJECT);
                return;
            }
            const current = target.state();
            if (current.kind !== 'writable') {
                deps.ui.info(notClearedBecause(current.reason ?? ''));
                return;
            }
            if (!(await deps.ui.confirmClear(activeName))) {
                deps.ui.info(NOT_CLEARED_DECLINED);
                return;
            }
            try {
                const result = await target.clear();
                deps.ui.info(clearedNotice(result.failed));
            } catch (error) {
                deps.ui.info(notClearedBecause(error instanceof RuntimeRefusal ? error.message : String(error)));
            }
        },
        whenIdle: () => chain,
        async dispose() {
            disposed = true;
            subscription?.dispose();
            await chain;
            await closeStore();
            listeners.clear();
        },
    };
}
