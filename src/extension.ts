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
import { AREA_COMMANDS, COPY_NEXT_STEP_COMMAND, OPEN_COMMAND, REFRESH_COMMAND, SHELL_ACTION_COMMAND } from './adapters/vscode/commands';
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
import { createUiMemory } from './adapters/vscode/uiMemory';
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
import { createBoardRequests } from './core/board/boardRequests';
import { createOpenFile } from './core/board/openFile';
import { createShellSelection } from './core/board/shellSelection';
import { createLifecycleService, type LifecycleService } from './core/lifecycle/lifecycleService';
import { createModelSource } from './core/shell/modelSource';
import { createShellService, type OpenRequest } from './core/shell/shellService';
import { AREA_IDS } from './shared/protocol/areas';
import type { BoardView } from './shared/protocol/board';
import type { BoardFilter, BoardState } from './shared/protocol/boardFilter';
import type { DetailView } from './shared/protocol/detail';
import type { OverviewView } from './shared/protocol/overview';
import { isRunActionPayload, type ProbeOutcome, type ShellView } from './shared/protocol/messages';
import type { TreeModel } from './core/shell/treeModel';

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
    tree(): TreeModel;
}

export interface StatusEntryTestApi {
    inspect(): StatusItemInspection;
}

export interface BoardTestApi {
    view(): BoardView | undefined;
    detail(): DetailView;
    whenIdle(): Promise<void>;
    setFilter(filter: BoardFilter): void;
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

    const repository = createSpecRepository({
        source: createVscodeSpecSource(),
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
    const modelSource = createModelSource(repository);
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
        memory: createUiMemory(context.workspaceState),
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
    const board = createBoardService({
        source: modelSource,
        selection,
        history: { read: () => lifecycle.history(), onDidChange: (listener) => lifecycle.onDidChange(() => listener()) },
    });
    const overview = createOverviewService({
        source: modelSource,
        discovery: controller,
        history: { read: () => lifecycle.history(), onDidChange: (listener) => lifecycle.onDidChange(() => listener()) },
    });
    const clipboard = createClipboard();
    const entry = createStatusEntry({ line: projectLine, discovery: controller, shell: service, source: modelSource, item: statusItem, clock: createSystemClock(), sameRoot });
    const copyNextStep = createCopyNextStep({
        entry,
        clipboard,
        ui: createStepUi(),
        actions: {
            selectProject: () => controller.selectProject(),
            openStudio: async () => {
                await vscode.commands.executeCommand(OPEN_COMMAND);
            },
        },
    });
    const openFile = createOpenFile({ source: modelSource, editor: createEditor() });
    const requests = createBoardRequests({ board, openFile, clipboard });
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
    const tree = createStudioTree(service);

    context.subscriptions.push(
        statusItem,
        entry,
        { dispose: () => service.dispose() },
        navigation,
        { dispose: () => board.dispose() },
        { dispose: () => overview.dispose() },
        tree,
        panel,
        vscode.window.registerWebviewPanelSerializer(VIEW_TYPE, panel.serializer),
        vscode.commands.registerCommand(OPEN_COMMAND, openStudio({ via: 'start' })),
        ...AREA_IDS.map((area) => vscode.commands.registerCommand(AREA_COMMANDS[area], openStudio({ via: 'area', area }))),
        vscode.commands.registerCommand(SETUP_COMMAND_ID, () => setup.start()),
        vscode.commands.registerCommand(COPY_MERGE_PROMPT_COMMAND_ID, () => setup.copyMergePrompt()),
        vscode.commands.registerCommand(REFRESH_COMMAND, () => service.refresh()),
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
