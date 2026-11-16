import { DEFAULT_AREA, type AreaId } from '../../shared/protocol/areas';
import type { ActionId, NavigationRequest, NavigationTarget, PanelState, ShellView } from '../../shared/protocol/messages';
import type { DiscoveryController } from '../discovery/discoveryController';
import type { Disposable, WorkspaceFoldersPort } from '../ports/host';
import type { ShellActionsPort, ShellModelSource, TrustPort, UiMemoryPort } from '../ports/shell';
import type { SpecRepository } from '../specs/specRepository';
import type { RequestHandlers } from './messageRouter';
import { derivePanelState, listingFailure } from './panelState';

export interface ShellServiceDeps {
    discovery: Pick<DiscoveryController, 'snapshot' | 'onDidUpdate' | 'refresh' | 'selectProject'>;
    repository: Pick<SpecRepository, 'rescan'>;
    source: ShellModelSource;
    folders: Pick<WorkspaceFoldersPort, 'list' | 'onDidChange'>;
    trust: TrustPort;
    memory: UiMemoryPort;
    actions: ShellActionsPort;
    sameRoot: (first: string, second: string) => boolean;
}

export interface ShellService {
    view(): ShellView;
    onDidChangeView(listener: (view: ShellView) => void): Disposable;
    runAction(action: ActionId): Promise<void>;
    rescan(): Promise<void>;
    handlers: RequestHandlers;
    dispose(): void;
}

export function createShellService(deps: ShellServiceDeps): ShellService {
    const listeners = new Set<(view: ShellView) => void>();
    let busy = false;
    let area: AreaId = DEFAULT_AREA;
    let target: NavigationTarget | undefined;
    let lastNotified = '';

    function compute(): ShellView {
        const discovery = deps.discovery.snapshot();
        const model = deps.source.current();
        const activeRoot = discovery.active?.root;
        const modelLoaded = activeRoot !== undefined && model !== undefined && deps.sameRoot(model.project.root, activeRoot);
        const listing = modelLoaded && model !== undefined ? listingFailure(model.project) : undefined;
        const derived = derivePanelState({
            folderCount: deps.folders.list().length,
            discovery,
            modelLoaded,
            listingFailure: listing,
            sameRoot: deps.sameRoot,
        });
        const state: PanelState | undefined = busy ? { id: 'S4' } : derived;
        return {
            state,
            restricted: !deps.trust.isTrusted(),
            projectName: discovery.active?.name,
            area,
            target,
            selection: undefined,
            notice: undefined,
            rows: [],
        };
    }

    function recompute(): void {
        const view = compute();
        const serialized = JSON.stringify(view);
        if (serialized === lastNotified) {
            return;
        }
        lastNotified = serialized;
        [...listeners].forEach((listener) => {
            try {
                listener(view);
            } catch {
                return;
            }
        });
    }

    async function guarded(task: () => Promise<void>): Promise<void> {
        if (busy) {
            return;
        }
        busy = true;
        recompute();
        try {
            await task();
        } finally {
            busy = false;
            recompute();
        }
    }

    async function ignoring(task: () => Promise<void>): Promise<void> {
        try {
            await task();
        } catch {
            return;
        }
    }

    const subscriptions: Disposable[] = [
        deps.discovery.onDidUpdate(recompute),
        deps.source.onDidChange(recompute),
        deps.folders.onDidChange(recompute),
        deps.trust.onDidGrant(recompute),
    ];
    lastNotified = JSON.stringify(compute());

    async function runAction(action: ActionId): Promise<void> {
        switch (action) {
            case 'openFolder':
                return deps.actions.openFolder();
            case 'openSetupGuide':
                return deps.actions.openSetupGuide();
            case 'showOutput':
                return deps.actions.showOutput();
            case 'manageTrust':
                return deps.actions.manageTrust();
            case 'reload':
                return deps.actions.reloadPanel();
            case 'selectProject':
                return deps.discovery.selectProject();
            case 'refresh':
                return guarded(() => ignoring(() => deps.discovery.refresh()));
            case 'retry':
                return guarded(async () => {
                    await ignoring(() => deps.discovery.refresh());
                    await ignoring(() => deps.repository.rescan());
                });
        }
    }

    function navigate(request: NavigationRequest): void {
        area = request.area;
        target = request.target;
        recompute();
    }

    return {
        view: compute,
        onDidChangeView(listener) {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
        runAction,
        async rescan() {
            if (deps.discovery.snapshot().active === undefined) {
                return;
            }
            await deps.repository.rescan();
        },
        handlers: {
            hello: async () => undefined,
            navigate: async (request) => navigate(request),
            select: async () => undefined,
            runAction: async (payload) => runAction(payload.action),
            dismissNotice: async () => undefined,
        },
        dispose() {
            subscriptions.forEach((subscription) => subscription.dispose());
            listeners.clear();
        },
    };
}
