import * as vscode from 'vscode';
import { createProjectStoreOpener } from './adapters/node/fileRuntimeMedium';
import { createRandomIds } from './adapters/node/randomIds';
import { createSystemClock } from './adapters/node/systemClock';
import { createSystemRuntimeClock } from './adapters/node/systemRuntimeClock';
import { createMarkerWatch } from './adapters/vscode/markerWatch';
import { resolveStorageLocation } from './adapters/vscode/storageLocation';
import { createOutputChannel } from './adapters/vscode/outputChannel';
import { createShellActions } from './adapters/vscode/shellActions';
import { createStudioPanel, VIEW_TYPE, type StudioPanel, type StudioPanelInspection } from './adapters/vscode/studioPanel';
import { AREA_COMMANDS, COPY_NEXT_STEP_COMMAND, OPEN_COMMAND, OPEN_SETTINGS_COMMAND, REFRESH_COMMAND, SELECT_SPEC_COMMAND, SHELL_ACTION_COMMAND, TREE_COPY_COMMAND, TREE_OPEN_PLAN_COMMAND, TREE_OPEN_SPEC_COMMAND, TREE_SHOW_IN_PLAN_MAP_COMMAND } from './adapters/vscode/commands';
import { createFetchReleaseHttp } from './adapters/node/fetchReleaseHttp';
import { createNodeSetupTarget } from './adapters/node/nodeSetupTarget';
import { createTarGzArchive } from './adapters/node/tarGzArchive';
import { createSetupUi } from './adapters/vscode/setupUi';
import { COPY_MERGE_PROMPT_COMMAND_ID, SELECT_PROJECT_COMMAND_ID, SETUP_COMMAND_ID } from './shared/protocol/texts';
import { createStudioTree } from './adapters/vscode/studioTree';
import { createTrust } from './adapters/vscode/trust';
import { sameRootFor } from './adapters/vscode/sameRoot';
import { createStatusItem, type StatusItemInspection } from './adapters/vscode/statusBar';
import { createStepUi } from './adapters/vscode/stepUi';
import { createFileWatch } from './adapters/vscode/fileWatch';
import { createRuntimeUi } from './adapters/vscode/runtimeUi';
import { createEditor } from './adapters/vscode/editor';
import { createClipboard } from './adapters/vscode/clipboard';
import { createUi } from './adapters/vscode/ui';
import { createVscodeSpecSource } from './adapters/vscode/vscodeSpecSource';
import { createVscodeFileSystem } from './adapters/vscode/vscodeFileSystem';
import { createWorkspaceFolders } from './adapters/vscode/workspaceFolders';
import { createWorkspaceState } from './adapters/vscode/workspaceState';
import { createEarlierRunDataFiles } from './adapters/node/earlierRunDataFiles';
import { createEarlierRunDataState } from './adapters/vscode/earlierRunDataState';
import { createUiMemory } from './adapters/vscode/uiMemory';
import { createSettingPort } from './adapters/vscode/settings';
import { createAssistantHost } from './adapters/vscode/assistantHost';
import { type DiscoverySnapshot } from './core/discovery/discoveryController';
import type { SpecRepository } from './core/specs/specRepository';
import type { StoreState } from './core/runtime/model';
import type { RuntimeSession } from './core/runtime/runtimeSession';
import type { RuntimeStore } from './core/runtime/runtimeStore';
import type { LifecycleService } from './core/lifecycle/lifecycleService';
import { openSettings } from './core/settings/openSettings';
import type { OpenRequest } from './core/shell/shellService';
import { AREA_IDS } from './shared/protocol/areas';
import type { BoardView } from './shared/protocol/board';
import type { BoardFilter, BoardState } from './shared/protocol/boardFilter';
import type { DetailView } from './shared/protocol/detail';
import type { OverviewView } from './shared/protocol/overview';
import { isRunActionPayload, isSelectPayload, type ProbeOutcome, type ShellView } from './shared/protocol/messages';
import type { SpecTreeModel } from './core/shell/specTree';
import { composeStudio } from './hosts/compose';

export interface ShellTestApi {
    view(): ShellView;
    lastHelloAt(): number | undefined;
    panelCount(): number;
    closePanel(): void;
    probe(url: string): Promise<ProbeOutcome>;
    asWebviewUri(uri: vscode.Uri): string | undefined;
    inspect(): StudioPanelInspection | undefined;
    restore(restored: vscode.WebviewPanel): Promise<void>;
    select(stem: string): Promise<void>;
    tree(): SpecTreeModel;
}

export interface StatusEntryTestApi {
    inspect(): StatusItemInspection;
}

export interface BoardTestApi {
    view(): BoardView | undefined;
    detail(): DetailView;
    whenIdle(): Promise<void>;
    setFilter(filter: BoardFilter): void;
    setDone(expanded: boolean): void;
    openFile(key: string, line?: number): Promise<'opened' | 'refused' | 'not-found'>;
}

export interface OverviewTestApi {
    view(): OverviewView | undefined;
    whenIdle(): Promise<void>;
    listen(listener: (view: OverviewView | undefined) => void): vscode.Disposable;
}

export interface StudioApi {
    snapshot(): DiscoverySnapshot;
    whenIdle(): Promise<void>;
    specs(): SpecRepository;
    runtimeState(): StoreState;
    runtimeStore(): RuntimeStore | undefined;
    lifecycle(): LifecycleService;
    shell(): ShellTestApi;
    board(): BoardTestApi;
    statusEntry(): StatusEntryTestApi;
    overview(): OverviewTestApi;
}

let runtimeSession: RuntimeSession | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<StudioApi> {
    const statusItem = createStatusItem();
    const output = createOutputChannel();
    const runtimeUi = createRuntimeUi();
    const storage = resolveStorageLocation(context.globalStorageUri, context.globalStoragePath);
    const ids = createRandomIds();
    const runtimeClock = createSystemRuntimeClock();
    const openStore = createProjectStoreOpener({
        storage,
        platform: process.platform,
        ids,
        clock: runtimeClock,
        notices: { show: (message) => runtimeUi.warn(message) },
    });

    let studio: StudioPanel | undefined;
    const shellActions = createShellActions({
        showOutput: () => output.show(),
        reloadPanel: () => studio?.reload(),
    });
    const composed = composeStudio<StudioPanel>({
        platform: process.platform,
        studioVersion: String((context.extension.packageJSON as { version?: unknown }).version ?? ''),
        fileSystem: createVscodeFileSystem(),
        specSource: createVscodeSpecSource(),
        folders: createWorkspaceFolders(),
        workspaceState: createWorkspaceState(context.workspaceState),
        uiMemory: (key) => createUiMemory(context.workspaceState, key),
        clock: createSystemClock(),
        ui: createUi(),
        markerWatch: createMarkerWatch(),
        fileWatch: createFileWatch(process.platform),
        sameRoot: sameRootFor(process.platform),
        output,
        statusItem,
        openStore,
        trust: () => createTrust(),
        http: createFetchReleaseHttp(),
        archive: createTarGzArchive(),
        setupTarget: createNodeSetupTarget(),
        setupUi: createSetupUi(),
        setting: (key) => createSettingPort(key),
        assistantHost: createAssistantHost(),
        clipboard: createClipboard(),
        stepUi: createStepUi(),
        editor: createEditor(),
        shellActions,
        openStudio: async () => {
            await vscode.commands.executeCommand(OPEN_COMMAND);
        },
        createPanel: (services) => {
            const created = createStudioPanel({
                extensionUri: context.extensionUri,
                ...services,
                testMode: context.extensionMode === vscode.ExtensionMode.Test,
            });
            studio = created;
            return created;
        },
        earlierRunData: {
            files: storage.kind === 'directory' ? createEarlierRunDataFiles(storage.path) : undefined,
            state: createEarlierRunDataState(context.workspaceState),
        },
    });
    const panel = composed.panel;
    runtimeSession = composed.session;
    const openStudio = (request: OpenRequest) => () => {
        composed.service.open(request);
        panel.show();
    };
    const tree = createStudioTree(composed.treeService);
    const treeRow = (argument: unknown): { specKey: string; planKey?: string; line?: string; stem?: string; path?: string; mapStep?: string } | undefined => {
        const row = argument as { specKey?: unknown; planKey?: unknown; line?: unknown; stem?: unknown; path?: unknown; mapStep?: unknown } | undefined;
        return typeof row?.specKey === 'string'
            ? {
                  specKey: row.specKey,
                  ...(typeof row.planKey === 'string' ? { planKey: row.planKey } : {}),
                  ...(typeof row.line === 'string' ? { line: row.line } : {}),
                  ...(typeof row.stem === 'string' ? { stem: row.stem } : {}),
                  ...(typeof row.path === 'string' ? { path: row.path } : {}),
                  ...(typeof row.mapStep === 'string' ? { mapStep: row.mapStep } : {}),
              }
            : undefined;
    };

    context.subscriptions.push(
        statusItem,
        composed.entry,
        { dispose: () => composed.service.dispose() },
        composed.navigation,
        { dispose: () => composed.board.dispose() },
        { dispose: () => composed.overview.dispose() },
        composed.treeService,
        tree,
        panel,
        vscode.window.registerWebviewPanelSerializer(VIEW_TYPE, panel.serializer),
        vscode.commands.registerCommand(OPEN_COMMAND, openStudio({ via: 'start' })),
        ...AREA_IDS.map((area) => vscode.commands.registerCommand(AREA_COMMANDS[area], openStudio({ via: 'area', area }))),
        vscode.commands.registerCommand(SETUP_COMMAND_ID, () => composed.setup.start()),
        vscode.commands.registerCommand(COPY_MERGE_PROMPT_COMMAND_ID, () => composed.setup.copyMergePrompt()),
        vscode.commands.registerCommand(REFRESH_COMMAND, () => composed.service.refresh()),
        vscode.commands.registerCommand(OPEN_SETTINGS_COMMAND, () => openSettings(composed.assistantHost)),
        vscode.commands.registerCommand(COPY_NEXT_STEP_COMMAND, () => composed.copyNextStep.run()),
        vscode.commands.registerCommand(SHELL_ACTION_COMMAND, (action: unknown) => {
            const payload = { action };
            return isRunActionPayload(payload) ? composed.service.runAction(payload.action) : undefined;
        }),
        output,
        { dispose: () => composed.controller.dispose() },
        composed.feed,
        { dispose: () => composed.repository.dispose() },
        { dispose: () => composed.lifecycle.dispose() },
        vscode.commands.registerCommand(SELECT_SPEC_COMMAND, (reference: unknown) => {
            if (!isSelectPayload(reference)) {
                return;
            }
            composed.treeActions.select(reference.path === undefined ? { stem: reference.stem } : { stem: reference.stem, path: reference.path });
        }),
        vscode.commands.registerCommand(TREE_COPY_COMMAND, (row: unknown) => {
            const found = treeRow(row);
            return found === undefined ? undefined : composed.treeActions.copy(found);
        }),
        vscode.commands.registerCommand(TREE_OPEN_SPEC_COMMAND, (row: unknown) => {
            const found = treeRow(row);
            return found === undefined ? undefined : composed.treeActions.open(found, 'spec');
        }),
        vscode.commands.registerCommand(TREE_OPEN_PLAN_COMMAND, (row: unknown) => {
            const found = treeRow(row);
            return found === undefined ? undefined : composed.treeActions.open(found, 'plan');
        }),
        vscode.commands.registerCommand(TREE_SHOW_IN_PLAN_MAP_COMMAND, (row: unknown) => {
            const found = treeRow(row);
            if (found?.stem !== undefined) {
                composed.treeActions.showInPlanMap({ stem: found.stem, ...(found.path === undefined ? {} : { path: found.path }), ...(found.mapStep === undefined ? {} : { mapStep: found.mapStep }) });
            }
        }),
        vscode.commands.registerCommand(SELECT_PROJECT_COMMAND_ID, () => composed.controller.selectProject()),
    );

    await composed.start();
    return {
        snapshot: () => composed.controller.snapshot(),
        whenIdle: async () => {
            await composed.controller.whenIdle();
            await composed.repository.whenIdle();
            await composed.session.whenIdle();
            await composed.lifecycle.whenIdle();
            await composed.board.whenIdle();
            await composed.overview.whenIdle();
        },
        specs: () => composed.repository,
        runtimeState: () => composed.session.state(),
        runtimeStore: () => composed.session.current(),
        lifecycle: () => composed.lifecycle,
        board: () => ({
            view: () => composed.board.view(),
            detail: () => composed.board.detail(),
            whenIdle: () => composed.board.whenIdle(),
            setFilter: (filter) => composed.board.setFilter(filter),
            setDone: (expanded) => composed.board.setDone(expanded),
            openFile: async (key, line) => {
                const result = await (line === undefined ? composed.openFile.open(key) : composed.openFile.open(key, line));
                return result.kind === 'opened' ? 'opened' : result.kind;
            },
        }),
        statusEntry: () => ({ inspect: () => statusItem.inspect() }),
        overview: () => ({
            view: () => composed.overview.view(),
            whenIdle: () => composed.overview.whenIdle(),
            listen: (listener) => {
                const subscription = composed.overview.onDidChangeView(listener);
                return new vscode.Disposable(() => subscription.dispose());
            },
        }),
        shell: () => ({
            view: () => composed.service.view(),
            lastHelloAt: () => panel.lastHelloAt(),
            panelCount: () => panel.panelCount(),
            closePanel: () => panel.closePanel(),
            probe: (url) => panel.probe(url),
            asWebviewUri: (uri) => panel.asWebviewUri(uri),
            inspect: () => panel.inspect(),
            select: (stem) => composed.service.handlers.select({ stem }),
            tree: () => tree.model(),
            restore: async (restored) => {
                await panel.serializer.deserializeWebviewPanel(restored, undefined);
            },
        }),
    };
}

export async function deactivate(): Promise<void> {
    const closing = runtimeSession;
    runtimeSession = undefined;
    await closing?.dispose();
}
