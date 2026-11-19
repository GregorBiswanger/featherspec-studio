import { DEFAULT_AREA, type AreaId } from '../../shared/protocol/areas';
import type { ActionId, NavigationRequest, NavigationTarget, PanelState, SelectedSpec, ShellEventPayload, ShellFocus, ShellView } from '../../shared/protocol/messages';
import type { DiscoveryController } from '../discovery/discoveryController';
import type { Disposable, WorkspaceFoldersPort } from '../ports/host';
import type { ShellActionsPort, ShellModel, ShellModelSource, TrustPort, UiMemoryPort } from '../ports/shell';
import type { SpecRepository } from '../specs/specRepository';
import type { RequestHandlers } from './messageRouter';
import type { ShellRequestType } from '../../shared/protocol/messages';
import { derivePanelState, listingFailure } from './panelState';
import { findSpec, numberOfStem, reconcileSelection } from './selection';
import { isSideFraction } from '../../shared/protocol/layout';
import { parseSideWidth, serializeSideWidth } from './sidePanelWidth';
import { parseUiMemory, serializeUiMemory, type RememberedSelection } from './uiMemory';

export interface ShellServiceDeps {
    discovery: Pick<DiscoveryController, 'snapshot' | 'onDidUpdate' | 'refresh' | 'selectProject'>;
    repository: Pick<SpecRepository, 'rescan'>;
    source: ShellModelSource;
    folders: Pick<WorkspaceFoldersPort, 'list' | 'onDidChange'>;
    trust: TrustPort;
    memory: UiMemoryPort;
    sideMemory: UiMemoryPort;
    actions: ShellActionsPort;
    sameRoot: (first: string, second: string) => boolean;
}

export interface SpecReference {
    stem: string;
    path?: string;
}

export type OpenRequest = { via: 'start' } | { via: 'area'; area: AreaId };

export interface ShellService {
    view(): ShellView;
    /** The next shell event: the view and, once, a pending focus (0025 A-011). */
    shellEvent(): ShellEventPayload;
    panelReady(): void;
    panelGone(): void;
    onDidChangeView(listener: (view: ShellView) => void): Disposable;
    onDidNavigate(listener: (request: NavigationRequest) => void): Disposable;
    runAction(action: ActionId): Promise<void>;
    refresh(): Promise<void>;
    open(request: OpenRequest): void;
    select(reference: SpecReference | undefined): void;
    handlers: Pick<RequestHandlers, ShellRequestType>;
    dispose(): void;
}

export function createShellService(deps: ShellServiceDeps): ShellService {
    const listeners = new Set<(view: ShellView) => void>();
    const navigationListeners = new Set<(request: NavigationRequest) => void>();
    let busy = false;
    const remembered = parseUiMemory(deps.memory.get());
    let area: AreaId = remembered?.area ?? DEFAULT_AREA;
    let selection: RememberedSelection | undefined = remembered?.selection;
    let sideWidth: number | undefined = parseSideWidth(deps.sideMemory.get());
    let notice: { number: string } | undefined;
    let target: NavigationTarget | undefined;
    let pendingFocus: ShellFocus | undefined;
    let focusCount = 0;
    let panelIsReady = false;
    let lastNotified = '';
    let lastPersisted = JSON.stringify(remembered === undefined ? null : serializeUiMemory(remembered));

    function loadedModel(): ShellModel | undefined {
        const activeRoot = deps.discovery.snapshot().active?.root;
        const model = deps.source.current();
        return activeRoot !== undefined && model !== undefined && deps.sameRoot(model.project.root, activeRoot) ? model : undefined;
    }

    function persist(): void {
        const memory = selection === undefined ? { v: 1 as const, area } : { v: 1 as const, area, selection };
        const serialized = JSON.stringify(serializeUiMemory(memory));
        if (serialized !== lastPersisted) {
            lastPersisted = serialized;
            void deps.memory.set(serializeUiMemory(memory)).catch(() => undefined);
        }
    }

    function reconcile(): void {
        const reconciled = reconcileSelection({
            selection,
            activeRoot: deps.discovery.snapshot().active?.root,
            model: loadedModel(),
            sameRoot: deps.sameRoot,
        });
        if (JSON.stringify(reconciled.selection) !== JSON.stringify(selection)) {
            selection = reconciled.selection;
            persist();
        }
        if (reconciled.notice !== undefined) {
            notice = reconciled.notice;
        }
    }

    function selectedSpec(model: ShellModel | undefined): SelectedSpec | undefined {
        if (selection === undefined) {
            return undefined;
        }
        const entry = model?.lifecycle.entries.find((candidate) => candidate.stem === selection?.stem);
        const number = entry?.number ?? numberOfStem(selection.stem);
        return selection.path === undefined ? { stem: selection.stem, number } : { stem: selection.stem, path: selection.path, number };
    }

    function compute(): ShellView {
        reconcile();
        const discovery = deps.discovery.snapshot();
        const model = loadedModel();
        const modelLoaded = model !== undefined;
        const listing = model !== undefined ? listingFailure(model.project) : undefined;
        const derived = derivePanelState({
            folderCount: deps.folders.list().length,
            discovery,
            modelLoaded,
            listingFailure: listing,
            sameRoot: deps.sameRoot,
        });
        const state: PanelState | undefined = busy ? { id: 'S4' } : derived;
        const read = discovery.active === undefined || !modelLoaded ? '' : deps.source.updatedAt();
        return {
            state,
            restricted: !deps.trust.isTrusted(),
            projectName: discovery.active?.name,
            ...(discovery.active === undefined ? {} : { projectVersion: discovery.active.version }),
            ...(read === '' ? {} : { updatedAt: read }),
            area,
            target,
            selection: selectedSpec(model),
            notice,
            ...(sideWidth === undefined ? {} : { sideWidth }),
        };
    }

    function rememberSideWidth(fraction: number | undefined): void {
        sideWidth = fraction;
        void deps.sideMemory.set(fraction === undefined ? undefined : serializeSideWidth(fraction)).catch(() => undefined);
        recompute();
    }

    function recompute(force = false): void {
        const view = compute();
        const serialized = JSON.stringify(view);
        if (serialized === lastNotified && !force) {
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

    async function refresh(): Promise<void> {
        await ignoring(() => deps.discovery.refresh());
        const snapshot = deps.discovery.snapshot();
        if (snapshot.active !== undefined && snapshot.failure === undefined) {
            await ignoring(() => deps.repository.rescan());
        }
    }

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
            case 'setUp':
                return deps.actions.setUp();
            case 'copyMergePrompt':
                return deps.actions.copyMergePrompt();
            case 'selectProject':
                return deps.discovery.selectProject();
            case 'refresh':
            case 'retry':
                return guarded(refresh);
        }
    }

    function chooseSpec(stem: string, path: string | undefined): boolean {
        const activeRoot = deps.discovery.snapshot().active?.root;
        const model = loadedModel();
        if (model !== undefined && findSpec(model, stem, path) === undefined) {
            notice = { number: numberOfStem(stem) };
            return false;
        }
        if (activeRoot !== undefined) {
            selection = path === undefined ? { projectRoot: activeRoot, stem } : { projectRoot: activeRoot, stem, path };
            notice = undefined;
        }
        return true;
    }

    function navigate(request: NavigationRequest): void {
        reconcile();
        const spec = request.target?.kind === 'spec' ? request.target : undefined;
        if (spec !== undefined && !chooseSpec(spec.stem, spec.path)) {
            recompute();
            return;
        }
        area = request.area;
        target = spec === undefined ? request.target : { kind: 'spec', stem: spec.stem, ...(spec.path === undefined ? {} : { path: spec.path }) };
        const aimed = spec !== undefined && (spec.step !== undefined || spec.ways === true || spec.heading === true);
        if (aimed) {
            focusCount += 1;
            pendingFocus = {
                n: focusCount,
                stem: spec.stem,
                ...(spec.path === undefined ? {} : { path: spec.path }),
                ...(spec.step === undefined ? {} : { step: spec.step }),
                ...(spec.ways === true ? { ways: true as const } : {}),
                ...(spec.heading === true ? { heading: true as const } : {}),
            };
        }
        persist();
        recompute(aimed);
        [...navigationListeners].forEach((listener) => {
            try {
                listener(request);
            } catch {
                return;
            }
        });
    }

    function select(reference: SpecReference | undefined): void {
        reconcile();
        if (reference === undefined) {
            selection = undefined;
        } else {
            chooseSpec(reference.stem, reference.path);
        }
        persist();
        recompute();
    }

    function open(request: OpenRequest): void {
        area = request.via === 'area' ? request.area : (parseUiMemory(deps.memory.get())?.area ?? DEFAULT_AREA);
        target = undefined;
        pendingFocus = undefined;
        persist();
        recompute();
    }

    return {
        open,
        select,
        view: compute,
        shellEvent() {
            const view = compute();
            if (panelIsReady && pendingFocus !== undefined) {
                const focus = pendingFocus;
                pendingFocus = undefined;
                return { view, focus };
            }
            return { view };
        },
        panelReady() {
            panelIsReady = true;
        },
        panelGone() {
            panelIsReady = false;
            pendingFocus = undefined;
        },
        onDidChangeView(listener) {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
        onDidNavigate(listener) {
            navigationListeners.add(listener);
            return { dispose: () => void navigationListeners.delete(listener) };
        },
        runAction,
        refresh,
        handlers: {
            hello: async () => undefined,
            navigate: async (request) => navigate(request),
            select: async (payload) => select(payload.path === undefined ? { stem: payload.stem } : { stem: payload.stem, path: payload.path }),
            clearSelection: async () => select(undefined),
            runAction: async (payload) => runAction(payload.action),
            setSideWidth: async (payload) => {
                if (isSideFraction(payload.fraction)) {
                    rememberSideWidth(payload.fraction);
                }
            },
            resetSideWidth: async () => rememberSideWidth(undefined),
            dismissNotice: async () => {
                notice = undefined;
                recompute();
            },
        },
        dispose() {
            subscriptions.forEach((subscription) => subscription.dispose());
            listeners.clear();
            navigationListeners.clear();
        },
    };
}
