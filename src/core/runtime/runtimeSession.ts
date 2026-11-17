import type { DiscoveryController } from '../discovery/discoveryController';
import type { Disposable } from '../ports/host';
import type { StoreState } from './model';
import { NO_ACTIVE_PROJECT_REASON } from './notices';
import type { RuntimeStore } from './runtimeStore';

export interface RuntimeUiPort {
    warn(message: string): void;
}

export interface RuntimeSessionDeps {
    discovery: Pick<DiscoveryController, 'snapshot' | 'onDidChangeActiveProject'>;
    openStore(projectRoot: string): Promise<RuntimeStore>;
}

export interface RuntimeSession {
    start(): Promise<void>;
    current(): RuntimeStore | undefined;
    state(): StoreState;
    onDidChangeState(listener: (state: StoreState) => void): Disposable;
    whenIdle(): Promise<void>;
    dispose(): Promise<void>;
}

const NO_PROJECT_STATE: StoreState = { kind: 'unavailable', reason: NO_ACTIVE_PROJECT_REASON };

export function createRuntimeSession(deps: RuntimeSessionDeps): RuntimeSession {
    const listeners = new Set<(state: StoreState) => void>();
    let store: RuntimeStore | undefined;
    let storeSubscription: Disposable | undefined;
    let activeRoot: string | undefined;
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

    async function switchTo(root: string | undefined): Promise<void> {
        if (disposed || root === activeRoot) {
            return;
        }
        activeRoot = root;
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

    function follow(active: { root: string } | undefined): void {
        chain = chain.then(() => switchTo(active?.root));
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
