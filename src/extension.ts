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
import { AREA_COMMANDS, MOVE_COMMAND, OPEN_COMMAND, RESCAN_COMMAND, SHELL_ACTION_COMMAND } from './adapters/vscode/commands';
import { createFetchReleaseHttp } from './adapters/node/fetchReleaseHttp';
import { createNodeSetupTarget } from './adapters/node/nodeSetupTarget';
import { createTarGzArchive } from './adapters/node/tarGzArchive';
import { createSetupUi } from './adapters/vscode/setupUi';
import { createSetupService } from './core/setup/setupService';
import { COPY_MERGE_PROMPT_COMMAND_ID, SETUP_COMMAND_ID } from './shared/protocol/texts';
import { createStudioTree } from './adapters/vscode/studioTree';
import { createTrust } from './adapters/vscode/trust';
import { createUiMemory } from './adapters/vscode/uiMemory';
import { sameRootFor } from './adapters/vscode/sameRoot';
import { createStatusBar } from './adapters/vscode/statusBar';
import { createFileWatch } from './adapters/vscode/fileWatch';
import { createRuntimeUi } from './adapters/vscode/runtimeUi';
import { createEditor } from './adapters/vscode/editor';
import { createMovePicks, createMoveResultSink } from './adapters/vscode/boardPicks';
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
import { createMissionControlService } from './core/missionControl/missionControlService';
import { createBoardRequests } from './core/board/boardRequests';
import { createMoves } from './core/board/moves';
import { createOpenFile } from './core/board/openFile';
import { createShellSelection } from './core/board/shellSelection';
import { createLifecycleService, type LifecycleService } from './core/lifecycle/lifecycleService';
import { createModelSource } from './core/shell/modelSource';
import { createShellService, type OpenRequest } from './core/shell/shellService';
import { AREA_IDS } from './shared/protocol/areas';
import type { BoardView, MoveResult } from './shared/protocol/board';
import type { BoardFilter, BoardState } from './shared/protocol/boardFilter';
import type { DetailView } from './shared/protocol/detail';
import type { MissionControlView } from './shared/protocol/missionControl';
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

export interface BoardTestApi {
    view(): BoardView | undefined;
    detail(): DetailView;
    whenIdle(): Promise<void>;
    setFilter(filter: BoardFilter): void;
    requestMove(key: string, target: BoardState): Promise<MoveResult>;
    openFile(key: string, line?: number): Promise<'opened' | 'refused' | 'not-found'>;
}

export interface MissionControlTestApi {
    view(): MissionControlView | undefined;
    whenIdle(): Promise<void>;
    listen(listener: (view: MissionControlView | undefined) => void): vscode.Disposable;
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
    missionControl(): MissionControlTestApi;
}

let runtimeSession: RuntimeSession | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<StudioApi> {
    const statusBar = createStatusBar();
    const output = createOutputChannel();
    const controller = createDiscoveryController({
        fileSystem: createVscodeFileSystem(),
        statusBar,
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
    const missionControl = createMissionControlService({
        source: modelSource,
        discovery: controller,
        history: { read: () => lifecycle.history(), onDidChange: (listener) => lifecycle.onDidChange(() => listener()) },
    });
    const moves = createMoves({
        source: modelSource,
        picks: createMovePicks(),
        sink: createMoveResultSink((result) => studio?.showMoveResult(result) ?? false),
        selection,
        focused: () => board.focused(),
    });
    const openFile = createOpenFile({ source: modelSource, editor: createEditor() });
    const requests = createBoardRequests({ board, moves, openFile, clipboard: createClipboard() });
    const navigation = service.onDidNavigate((request) => {
        if (request.target?.kind === 'boardFilter') {
            board.applyNavigationFilter(request.target.filter);
        }
    });
    const panel = createStudioPanel({
        extensionUri: context.extensionUri,
        service,
        missionControl: {
            view: () => missionControl.view(),
            onDidChangeView: (listener) => missionControl.onDidChangeView(listener),
        },
        board: {
            handlers: requests.handlers,
            view: () => board.view(),
            detail: () => board.detail(),
            onDidChangeView: (listener) => board.onDidChangeView(listener),
            onDidChangeDetail: (listener) => board.onDidChangeDetail(listener),
            onDidMoveResult: (listener) => requests.onDidMoveResult(listener),
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
        statusBar,
        { dispose: () => service.dispose() },
        navigation,
        { dispose: () => board.dispose() },
        { dispose: () => missionControl.dispose() },
        tree,
        panel,
        vscode.window.registerWebviewPanelSerializer(VIEW_TYPE, panel.serializer),
        vscode.commands.registerCommand(OPEN_COMMAND, openStudio({ via: 'start' })),
        ...AREA_IDS.map((area) => vscode.commands.registerCommand(AREA_COMMANDS[area], openStudio({ via: 'area', area }))),
        vscode.commands.registerCommand(SETUP_COMMAND_ID, () => setup.start()),
        vscode.commands.registerCommand(COPY_MERGE_PROMPT_COMMAND_ID, () => setup.copyMergePrompt()),
        vscode.commands.registerCommand(RESCAN_COMMAND, () => service.rescan()),
        vscode.commands.registerCommand(SHELL_ACTION_COMMAND, (action: unknown) => {
            const payload = { action };
            return isRunActionPayload(payload) ? service.runAction(payload.action) : undefined;
        }),
        output,
        { dispose: () => controller.dispose() },
        feed,
        { dispose: () => repository.dispose() },
        { dispose: () => lifecycle.dispose() },
        vscode.commands.registerCommand(MOVE_COMMAND, () => moves.runMoveCommand()),
        vscode.commands.registerCommand('featherspec-studio.selectProject', () => controller.selectProject()),
        vscode.commands.registerCommand('featherspec-studio.refreshDiscovery', () => controller.refresh()),
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
            await missionControl.whenIdle();
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
            requestMove: (key, target) => moves.requestMove(key, target),
            openFile: async (key, line) => {
                const result = await (line === undefined ? openFile.open(key) : openFile.open(key, line));
                return result.kind === 'opened' ? 'opened' : result.kind;
            },
        }),
        missionControl: () => ({
            view: () => missionControl.view(),
            whenIdle: () => missionControl.whenIdle(),
            listen: (listener) => {
                const subscription = missionControl.onDidChangeView(listener);
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
