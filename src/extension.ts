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
import { createSetupService } from './core/setup/setupService';
import { COPY_MERGE_PROMPT_COMMAND_ID, SELECT_PROJECT_COMMAND_ID, SETUP_COMMAND_ID } from './shared/protocol/texts';
import { createCopyNextStep } from './core/copyNextStep/copyNextStep';
import { createProjectLine } from './core/copyNextStep/projectLine';
import { createStatusEntry } from './core/copyNextStep/statusEntry';
import { createStudioTree } from './adapters/vscode/studioTree';
import { createTrust } from './adapters/vscode/trust';
import { BOARD_MEMORY_KEY, HAND_OVER_MEMORY_KEY, SHELL_MEMORY_KEY, SIDE_PANEL_MEMORY_KEY, createUiMemory } from './adapters/vscode/uiMemory';
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
import { removeEarlierRunData } from './core/runtime/earlierRunData';
import { createDiscoveryController, type DiscoverySnapshot } from './core/discovery/discoveryController';
import { connectActiveProject } from './core/specs/activeProjectFeed';
import { isCaseInsensitivePlatform } from './core/specs/eventPath';
import { createSpecRepository, type SpecRepository } from './core/specs/specRepository';
import type { StoreState } from './core/runtime/model';
import { createRuntimeSession, type RuntimeSession } from './core/runtime/runtimeSession';
import type { RuntimeStore } from './core/runtime/runtimeStore';
import { createBoardService } from './core/board/boardService';
import { createOverviewService } from './core/overview/overviewService';
import { createSettingsSource } from './core/settings/settingsSource';
import { MODEL_HINTS_KEY, parseStepTipSettings, SHOW_STEP_TIPS_KEY } from './core/settings/stepTipSettings';
import { createSettingPort } from './adapters/vscode/settings';
import { createAssistantHost } from './adapters/vscode/assistantHost';
import { ASSISTANT_KEY } from './core/assistant/offer';
import { createAssistantWiring } from './core/assistant/wiring';
import { openSettings } from './core/settings/openSettings';
import { createBoardRequests } from './core/board/boardRequests';
import { createOpenFile } from './core/board/openFile';
import { createShellSelection } from './core/board/shellSelection';
import { createLifecycleService, type LifecycleService } from './core/lifecycle/lifecycleService';
import { createHandOverMemory } from './core/assistant/handOver';
import { createModelSource } from './core/shell/modelSource';
import { createShellService, type OpenRequest } from './core/shell/shellService';
import { AREA_IDS } from './shared/protocol/areas';
import type { BoardView } from './shared/protocol/board';
import type { BoardFilter, BoardState } from './shared/protocol/boardFilter';
import type { DetailView } from './shared/protocol/detail';
import type { OverviewView } from './shared/protocol/overview';
import { isRunActionPayload, isSelectPayload, type ProbeOutcome, type ShellView } from './shared/protocol/messages';
import type { SpecTreeModel } from './core/shell/specTree';
import { createSpecTreeService } from './core/shell/specTreeService';
import { createTreeActions } from './core/shell/treeActions';

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
    const projectLine = createProjectLine();
    const statusItem = createStatusItem();
    const output = createOutputChannel();
    const controller = createDiscoveryController({
        fileSystem: createVscodeFileSystem(),
        statusBar: projectLine,
        output,
        state: createWorkspaceState(context.workspaceState),
        folders: createWorkspaceFolders(),
        clock: createSystemClock(),
        ui: createUi(),
        watch: createMarkerWatch(),
        sameRoot: sameRootFor(process.platform),
    });

    const specSource = createVscodeSpecSource();
    const repository = createSpecRepository({
        source: specSource,
        watch: createFileWatch(process.platform),
        clock: createSystemClock(),
        caseInsensitiveEvents: isCaseInsensitivePlatform(process.platform),
    });
    const feed = connectActiveProject(controller, repository);
    const runtimeUi = createRuntimeUi();
    const storage = resolveStorageLocation(context.globalStorageUri, context.globalStoragePath);
    const clock = createSystemRuntimeClock();
    const ids = createRandomIds();
    const session = createRuntimeSession({
        discovery: controller,
        openStore: createProjectStoreOpener({
            storage,
            platform: process.platform,
            ids,
            clock,
            notices: { show: (message) => runtimeUi.warn(message) },
        }),
    });
    runtimeSession = session;
    const lifecycle = createLifecycleService({ repository, session, clock: createSystemClock() });

    const sameRoot = sameRootFor(process.platform);
    let studio: StudioPanel | undefined;
    const handOvers = createHandOverMemory(createUiMemory(context.workspaceState, HAND_OVER_MEMORY_KEY), () => modelSource.current()?.project);
    const modelSource = createModelSource(repository, handOvers);
    const shellActions = createShellActions({
        showOutput: () => output.show(),
        reloadPanel: () => studio?.reload(),
    });
    const service = createShellService({
        discovery: controller,
        repository,
        source: modelSource,
        folders: createWorkspaceFolders(),
        trust: createTrust(),
        memory: createUiMemory(context.workspaceState, SHELL_MEMORY_KEY),
        sideMemory: createUiMemory(context.workspaceState, SIDE_PANEL_MEMORY_KEY),
        actions: shellActions,
        sameRoot,
    });
    const setup = createSetupService({
        trust: createTrust(),
        folders: createWorkspaceFolders(),
        discovery: controller,
        http: createFetchReleaseHttp(),
        archive: createTarGzArchive(),
        target: createNodeSetupTarget(),
        ui: createSetupUi(),
        clock: createSystemClock(),
        output,
        actions: {
            manageTrust: () => shellActions.manageTrust(),
            showOutput: () => output.show(),
            openSetupGuide: () => shellActions.openSetupGuide(),
        },
        studioVersion: String((context.extension.packageJSON as { version?: unknown }).version ?? ''),
    });
    const selection = createShellSelection(service);
    const tips = createSettingsSource([createSettingPort(SHOW_STEP_TIPS_KEY), createSettingPort(MODEL_HINTS_KEY)], ([show, hints]) => parseStepTipSettings(show, hints));
    const assistantHost = createAssistantHost();
    const clipboard = createClipboard();
    const stepUi = createStepUi();
    const assistant = createAssistantWiring({ setting: createSettingPort(ASSISTANT_KEY), host: assistantHost, clipboard, ui: stepUi, output, clock: createSystemClock(), platform: process.platform, source: modelSource, specs: specSource, handOver: handOvers });
    const board = createBoardService({
        source: modelSource,
        selection,
        history: { read: () => lifecycle.history(), onDidChange: (listener) => lifecycle.onDidChange(() => listener()) },
        memory: createUiMemory(context.workspaceState, BOARD_MEMORY_KEY),
        tips,
        assistant: assistant.offer,
    });
    const overview = createOverviewService({
        source: modelSource,
        discovery: controller,
        history: { read: () => lifecycle.history(), onDidChange: (listener) => lifecycle.onDidChange(() => listener()) },
        tips,
        assistant: assistant.offer,
    });
    const entry = createStatusEntry({ line: projectLine, discovery: controller, shell: service, source: modelSource, item: statusItem, clock: createSystemClock(), sameRoot });
    const copyNextStep = createCopyNextStep({
        entry,
        clipboard,
        ui: stepUi,
        handOver: handOvers,
        actions: {
            selectProject: () => controller.selectProject(),
            openStudio: async () => {
                await vscode.commands.executeCommand(OPEN_COMMAND);
            },
        },
    });
    const openFile = createOpenFile({ source: modelSource, editor: createEditor() });
    const requests = createBoardRequests({ board, openFile, clipboard, send: (request) => assistant.send.send(request), handOver: handOvers });
    const navigation = service.onDidNavigate((request) => {
        if (request.target?.kind === 'boardFilter') {
            board.applyNavigationFilter(request.target.filter);
        }
    });
    const panel = createStudioPanel({
        extensionUri: context.extensionUri,
        service,
        overview: {
            handlers: overview.handlers,
            view: () => overview.view(),
            onDidChangeView: (listener) => overview.onDidChangeView(listener),
        },
        board: {
            handlers: requests.handlers,
            view: () => board.view(),
            detail: () => board.detail(),
            onDidChangeView: (listener) => board.onDidChangeView(listener),
            onDidChangeDetail: (listener) => board.onDidChangeDetail(listener),
            onDidOpenFileResult: (listener) => requests.onDidOpenFileResult(listener),
            onDidCopyResult: (listener) => requests.onDidCopyResult(listener),
            onDidSendResult: (listener) => requests.onDidSendResult(listener),
            panelClosed: () => board.panelClosed(),
        },
        output,
        testMode: context.extensionMode === vscode.ExtensionMode.Test,
    });
    studio = panel;
    const openStudio = (request: OpenRequest) => () => {
        service.open(request);
        panel.show();
    };
    const treeService = createSpecTreeService({ shell: service, source: modelSource, discovery: controller, sameRoot });
    const treeActions = createTreeActions({
        shell: service,
        panel: { isOpen: () => panel.panelCount() > 0, show: (options) => panel.show(options) },
        copy: (line) => copyNextStep.copy(line),
        openFile,
        warn: (text) => stepUi.warn(text),
    });
    const tree = createStudioTree(treeService);
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
        entry,
        { dispose: () => service.dispose() },
        navigation,
        { dispose: () => board.dispose() },
        { dispose: () => overview.dispose() },
        treeService,
        tree,
        panel,
        vscode.window.registerWebviewPanelSerializer(VIEW_TYPE, panel.serializer),
        vscode.commands.registerCommand(OPEN_COMMAND, openStudio({ via: 'start' })),
        ...AREA_IDS.map((area) => vscode.commands.registerCommand(AREA_COMMANDS[area], openStudio({ via: 'area', area }))),
        vscode.commands.registerCommand(SETUP_COMMAND_ID, () => setup.start()),
        vscode.commands.registerCommand(COPY_MERGE_PROMPT_COMMAND_ID, () => setup.copyMergePrompt()),
        vscode.commands.registerCommand(REFRESH_COMMAND, () => service.refresh()),
        vscode.commands.registerCommand(OPEN_SETTINGS_COMMAND, () => openSettings(assistantHost)),
        vscode.commands.registerCommand(COPY_NEXT_STEP_COMMAND, () => copyNextStep.run()),
        vscode.commands.registerCommand(SHELL_ACTION_COMMAND, (action: unknown) => {
            const payload = { action };
            return isRunActionPayload(payload) ? service.runAction(payload.action) : undefined;
        }),
        output,
        { dispose: () => controller.dispose() },
        feed,
        { dispose: () => repository.dispose() },
        { dispose: () => lifecycle.dispose() },
        vscode.commands.registerCommand(SELECT_SPEC_COMMAND, (reference: unknown) => {
            if (!isSelectPayload(reference)) {
                return;
            }
            treeActions.select(reference.path === undefined ? { stem: reference.stem } : { stem: reference.stem, path: reference.path });
        }),
        vscode.commands.registerCommand(TREE_COPY_COMMAND, (row: unknown) => {
            const found = treeRow(row);
            return found === undefined ? undefined : treeActions.copy(found);
        }),
        vscode.commands.registerCommand(TREE_OPEN_SPEC_COMMAND, (row: unknown) => {
            const found = treeRow(row);
            return found === undefined ? undefined : treeActions.open(found, 'spec');
        }),
        vscode.commands.registerCommand(TREE_OPEN_PLAN_COMMAND, (row: unknown) => {
            const found = treeRow(row);
            return found === undefined ? undefined : treeActions.open(found, 'plan');
        }),
        vscode.commands.registerCommand(TREE_SHOW_IN_PLAN_MAP_COMMAND, (row: unknown) => {
            const found = treeRow(row);
            if (found?.stem !== undefined) {
                treeActions.showInPlanMap({ stem: found.stem, ...(found.path === undefined ? {} : { path: found.path }), ...(found.mapStep === undefined ? {} : { mapStep: found.mapStep }) });
            }
        }),
        vscode.commands.registerCommand(SELECT_PROJECT_COMMAND_ID, () => controller.selectProject()),
    );

    await removeEarlierRunData({
        files: storage.kind === 'directory' ? createEarlierRunDataFiles(storage.path) : undefined,
        state: createEarlierRunDataState(context.workspaceState),
        output,
    });
    await session.start();
    await controller.start();
    await session.whenIdle();
    return {
        snapshot: () => controller.snapshot(),
        whenIdle: async () => {
            await controller.whenIdle();
            await repository.whenIdle();
            await session.whenIdle();
            await lifecycle.whenIdle();
            await board.whenIdle();
            await overview.whenIdle();
        },
        specs: () => repository,
        runtimeState: () => session.state(),
        runtimeStore: () => session.current(),
        lifecycle: () => lifecycle,
        board: () => ({
            view: () => board.view(),
            detail: () => board.detail(),
            whenIdle: () => board.whenIdle(),
            setFilter: (filter) => board.setFilter(filter),
            setDone: (expanded) => board.setDone(expanded),
            openFile: async (key, line) => {
                const result = await (line === undefined ? openFile.open(key) : openFile.open(key, line));
                return result.kind === 'opened' ? 'opened' : result.kind;
            },
        }),
        statusEntry: () => ({ inspect: () => statusItem.inspect() }),
        overview: () => ({
            view: () => overview.view(),
            whenIdle: () => overview.whenIdle(),
            listen: (listener) => {
                const subscription = overview.onDidChangeView(listener);
                return new vscode.Disposable(() => subscription.dispose());
            },
        }),
        shell: () => ({
            view: () => service.view(),
            lastHelloAt: () => panel.lastHelloAt(),
            panelCount: () => panel.panelCount(),
            closePanel: () => panel.closePanel(),
            probe: (url) => panel.probe(url),
            asWebviewUri: (uri) => panel.asWebviewUri(uri),
            inspect: () => panel.inspect(),
            select: (stem) => service.handlers.select({ stem }),
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
