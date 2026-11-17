import * as path from 'node:path';
import * as vscode from 'vscode';
import { createFileRuntimeMedium, projectStoreDirectory } from './adapters/node/fileRuntimeMedium';
import { createRandomIds } from './adapters/node/randomIds';
import { createSystemClock } from './adapters/node/systemClock';
import { createSystemRuntimeClock } from './adapters/node/systemRuntimeClock';
import { createMarkerWatch } from './adapters/vscode/markerWatch';
import { resolveStorageLocation } from './adapters/vscode/storageLocation';
import { createOutputChannel } from './adapters/vscode/outputChannel';
import { createShellActions } from './adapters/vscode/shellActions';
import { createStudioPanel, VIEW_TYPE, type StudioPanel, type StudioPanelInspection } from './adapters/vscode/studioPanel';
import { AREA_COMMANDS, MOVE_COMMAND, OPEN_COMMAND, RESCAN_COMMAND, SHELL_ACTION_COMMAND } from './adapters/vscode/commands';
import { createStudioTree } from './adapters/vscode/studioTree';
import { createTrust } from './adapters/vscode/trust';
import { createUiMemory } from './adapters/vscode/uiMemory';
import { createAgentCenterMemory } from './adapters/vscode/agentCenterMemory';
import { createAgentCenterUi } from './adapters/vscode/agentCenterUi';
import { createAgentCenterService } from './core/agentCenter/agentCenterService';
import { createAgentCenterHandlers } from './core/agentCenter/agentCenterRequests';
import { createRequestNotifier } from './core/agentCenter/requestNotifier';
import { withEventSignal } from './core/agentCenter/eventSignal';
import type { AgentCenterStore } from './core/ports/agentCenter';
import type { AgentCenterView, TimelinePayload } from './shared/protocol/agentCenter';
import { sameRootFor } from './adapters/vscode/sameRoot';
import { createStatusBar } from './adapters/vscode/statusBar';
import { createFileWatch } from './adapters/vscode/fileWatch';
import { createRuntimeUi } from './adapters/vscode/runtimeUi';
import { createMaxAgeDaysSetting } from './adapters/vscode/runtimeSettings';
import { createDefaultProviderSetting, createFakeProviderEnabledSetting, createFakeProviderScenarioSetting } from './adapters/vscode/providerSettings';
import { createFakeProvider } from './adapters/providers/fake/fakeProvider';
import { createCopilotProvider } from './adapters/providers/copilot/copilotProvider';
import { createSdkClientFactory, loadCopilotSdk } from './adapters/providers/copilot/sdkClient';
import { createNodeLocate } from './adapters/providers/copilot/nodeLocate';
import { createCopilotCliPathSetting, createCopilotModelSetting } from './adapters/vscode/copilotSettings';
import { createOrchestrator, type Orchestrator } from './core/orchestrator/orchestrator';
import { createRunCommands } from './core/orchestrator/runCommands';
import { createOrchestratorUi } from './adapters/vscode/orchestratorUi';
import { createProviderSetup } from './core/providers/providerSetup';
import type { ProviderRegistry } from './core/providers/registry';
import type { ProviderService } from './core/providers/providerService';
import { createEditor } from './adapters/vscode/editor';
import { createMovePicks, createMoveResultSink } from './adapters/vscode/boardPicks';
import { createUi } from './adapters/vscode/ui';
import { createVscodeSpecSource } from './adapters/vscode/vscodeSpecSource';
import { createVscodeFileSystem } from './adapters/vscode/vscodeFileSystem';
import { createWorkspaceFolders } from './adapters/vscode/workspaceFolders';
import { createWorkspaceState } from './adapters/vscode/workspaceState';
import { createDiscoveryController, type DiscoverySnapshot } from './core/discovery/discoveryController';
import { connectActiveProject } from './core/specs/activeProjectFeed';
import { isCaseInsensitivePlatform } from './core/specs/eventPath';
import { createSpecRepository, type SpecRepository } from './core/specs/specRepository';
import type { StoreState } from './core/runtime/model';
import { createRuntimeSession, type RuntimeSession } from './core/runtime/runtimeSession';
import { openRuntimeStore, type RuntimeStore } from './core/runtime/runtimeStore';
import { createUnavailableMedium } from './core/runtime/unavailableMedium';
import { createBoardService } from './core/board/boardService';
import { createMissionControlService } from './core/missionControl/missionControlService';
import { createBoardRequests } from './core/board/boardRequests';
import { createMoves } from './core/board/moves';
import { createAgentStartHandlers } from './core/agentStart/agentStartRequests';
import { bindOrchestrator } from './core/agentStart/orchestratorBinding';
import { createStartFlow } from './core/agentStart/startFlow';
import { createRunSource } from './core/missionControl/runSource';
import { createOpenFile } from './core/board/openFile';
import { createShellSelection } from './core/board/shellSelection';
import { createLifecycleService, type LifecycleService } from './core/lifecycle/lifecycleService';
import { createModelSource } from './core/shell/modelSource';
import { createShellService, type OpenRequest } from './core/shell/shellService';
import { AREA_IDS } from './shared/protocol/areas';
import type { BoardView, MoveResult } from './shared/protocol/board';
import type { BoardFilter, BoardState } from './shared/protocol/boardFilter';
import type { AgentStartView } from './shared/protocol/agentStart';
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

export interface AgentStartTestApi {
    view(): AgentStartView;
    handOff(stem: string, key: string): void;
    cancel(token: string): void;
    whenIdle(): Promise<void>;
}

export interface AgentCenterTestApi {
    view(): AgentCenterView | undefined;
    timeline(): TimelinePayload | undefined;
    whenIdle(): Promise<void>;
    listen(listener: (view: AgentCenterView | undefined) => void): vscode.Disposable;
    select(runId: string): void;
}

export interface StudioApi {
    snapshot(): DiscoverySnapshot;
    whenIdle(): Promise<void>;
    specs(): SpecRepository;
    runtimeState(): StoreState;
    runtimeStore(): RuntimeStore | undefined;
    lifecycle(): LifecycleService;
    providers(): { registry: ProviderRegistry; service: ProviderService };
    orchestrator(): Orchestrator;
    agentStart(): AgentStartTestApi;
    shell(): ShellTestApi;
    board(): BoardTestApi;
    missionControl(): MissionControlTestApi;
    agentCenter(): AgentCenterTestApi;
}

let runtimeSession: RuntimeSession | undefined;
let runOrchestrator: Orchestrator | undefined;

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
    const maxAgeDays = createMaxAgeDaysSetting();
    const fakeScenario = createFakeProviderScenarioSetting();
    const copilotCliPath = createCopilotCliPathSetting();
    const copilotModel = createCopilotModelSetting();
    const copilot = createCopilotProvider({
        clock,
        clientFactory: createSdkClientFactory({ loadSdk: loadCopilotSdk, environment: process.env, clock }),
        locate: createNodeLocate({ settingPath: () => String(copilotCliPath.read()), environment: process.env, platform: process.platform }),
        settings: { model: () => String(copilotModel.read()) },
        ...(storage.kind === 'directory' ? { baseDirectory: path.join(storage.path, 'copilot-home') } : {}),
        workspaceFolders: () => createWorkspaceFolders().list().flatMap((folder) => (folder.displayPath === undefined ? [] : [folder.displayPath])),
        platform: process.platform,
        isTrusted: () => vscode.workspace.isTrusted,
    });
    context.subscriptions.push({ dispose: () => copilot.dispose() });
    const providers = createProviderSetup({
        clock,
        adapters: [copilot],
        toggled: [{ enabled: createFakeProviderEnabledSetting(), create: () => createFakeProvider({ clock, profile: 'full', scenario: fakeScenario }) }],
    });
    context.subscriptions.push({ dispose: () => providers.dispose() });
    const session = createRuntimeSession({
        discovery: controller,
        ui: runtimeUi,
        openStore: async (projectRoot) =>
            withEventSignal(await openRuntimeStore({
                medium:
                    storage.kind === 'directory'
                        ? createFileRuntimeMedium(
                              projectStoreDirectory(storage.path, process.platform === 'win32' ? projectRoot.toLowerCase() : projectRoot),
                          )
                        : createUnavailableMedium(storage.reason),
                ids,
                clock,
                notices: { show: (message) => runtimeUi.warn(message) },
                credentials: providers.service.credentials,
                projectRoot,
                maxAgeDays,
            })),
    });
    runtimeSession = session;
    const lifecycle = createLifecycleService({ repository, session, clock: createSystemClock() });

    const sameRoot = sameRootFor(process.platform);
    let studio: StudioPanel | undefined;
    const modelSource = createModelSource(repository);
    const orchestrator = createOrchestrator({
        session,
        registry: providers.registry,
        providers: providers.service,
        specs: modelSource,
        ui: createOrchestratorUi(),
        clock,
        workingDirectory: () => controller.snapshot().active?.root,
    });
    runOrchestrator = orchestrator;
    const startRuns = createRunSource({ session });
    const runCommands = createRunCommands({ orchestrator, session, ui: createOrchestratorUi() });
    const service = createShellService({
        discovery: controller,
        repository,
        source: modelSource,
        folders: createWorkspaceFolders(),
        trust: createTrust(),
        memory: createUiMemory(context.workspaceState),
        actions: createShellActions({
            showOutput: () => output.show(),
            reloadPanel: () => studio?.reload(),
            setUp: async () => void (await vscode.commands.executeCommand('featherspec-studio.setup')),
            copyMergePrompt: async () => void (await vscode.commands.executeCommand('featherspec-studio.copyMergePrompt')),
        }),
        sameRoot,
    });
    const selection = createShellSelection(service);
    const board = createBoardService({
        source: modelSource,
        session,
        selection,
        history: { read: () => lifecycle.history(), onDidChange: (listener) => lifecycle.onDidChange(() => listener()) },
    });
    const missionControl = createMissionControlService({
        source: modelSource,
        discovery: controller,
        session,
        history: { read: () => lifecycle.history(), onDidChange: (listener) => lifecycle.onDidChange(() => listener()) },
        clock: createSystemClock(),
    });
    const agentCenterUi = createAgentCenterUi();
    const agentCenter = createAgentCenterService({
        session: {
            current: () => session.current() as AgentCenterStore | undefined,
            state: () => session.state(),
            onDidChangeState: (listener) => session.onDidChangeState(listener),
        },
        providers: providers.registry,
        source: modelSource,
        memory: createAgentCenterMemory(context.workspaceState),
        discovery: controller,
        navigation: service,
        trust: createTrust(),
        orchestrator,
        ui: agentCenterUi,
        files: createVscodeFileSystem(),
        editor: createEditor(),
    });
    const requestNotifier = createRequestNotifier({
        session: { current: () => session.current() as AgentCenterStore | undefined, state: () => session.state(), onDidChangeState: (listener) => session.onDidChangeState(listener) },
        model: modelSource,
        ui: agentCenterUi,
        trust: createTrust(),
        shownAndFocused: (runId) => {
            const view = agentCenter.view();
            const selected = view?.kind === 'ready' ? view.detail?.header.runId : undefined;
            return studio?.isFocused() === true && service.view().area === 'agentCenter' && selected === runId;
        },
        open: (runId) => {
            void service.handlers.navigate({ area: 'agentCenter', target: { kind: 'run', id: runId } });
            studio?.show();
        },
    });
    const agentStart = createStartFlow({
        preconditions: {
            model: modelSource,
            files: createVscodeFileSystem(),
            setting: createDefaultProviderSetting(),
            registry: providers.registry,
            providers: providers.service,
            runs: startRuns,
            session,
            trust: createTrust(),
        },
        orchestrator: bindOrchestrator(orchestrator, (root) => vscode.Uri.parse(root).fsPath),
        ui: { reveal: () => studio?.show() },
        runs: startRuns,
    });
    const moves = createMoves({
        source: modelSource,
        start: agentStart,
        picks: createMovePicks(),
        sink: createMoveResultSink((result) => studio?.showMoveResult(result) ?? false),
        selection,
        focused: () => board.focused(),
    });
    const openFile = createOpenFile({ source: modelSource, editor: createEditor() });
    const requests = createBoardRequests({ board, moves, openFile });
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
            panelClosed: () => board.panelClosed(),
        },
        agentCenter: {
            handlers: createAgentCenterHandlers(agentCenter),
            view: () => agentCenter.view(),
            timeline: () => agentCenter.timeline(),
            onDidChangeView: (listener) => {
                const subscription = agentCenter.onDidChangeView(listener);
                return new vscode.Disposable(() => subscription.dispose());
            },
            onDidChangeTimeline: (listener) => {
                const subscription = agentCenter.onDidChangeTimeline(listener);
                return new vscode.Disposable(() => subscription.dispose());
            },
            reread: () => agentCenter.reread(),
        },
        agentStart: {
            handlers: createAgentStartHandlers(agentStart),
            view: () => agentStart.view(),
            onDidChangeView: (listener) => {
                const subscription = agentStart.onDidChangeView(listener);
                return new vscode.Disposable(() => subscription.dispose());
            },
            panelHidden: () => agentStart.panelHidden(),
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
        { dispose: () => agentStart.dispose() },
        { dispose: () => startRuns.dispose() },
        { dispose: () => missionControl.dispose() },
        { dispose: () => agentCenter.dispose() },
        { dispose: () => requestNotifier.dispose() },
        tree,
        panel,
        vscode.window.registerWebviewPanelSerializer(VIEW_TYPE, panel.serializer),
        vscode.commands.registerCommand(OPEN_COMMAND, openStudio({ via: 'start' })),
        ...AREA_IDS.map((area) => vscode.commands.registerCommand(AREA_COMMANDS[area], openStudio({ via: 'area', area }))),
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
        vscode.commands.registerCommand('featherspec-studio.clearRunHistory', () => session.clearRunHistory()),
        vscode.commands.registerCommand('featherspec-studio.stopRun', () => runCommands.stopRun()),
        vscode.commands.registerCommand('featherspec-studio.resumeRun', () => runCommands.resumeRun()),
    );

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
            await agentCenter.whenIdle();
            await agentStart.whenIdle();
        },
        specs: () => repository,
        runtimeState: () => session.state(),
        runtimeStore: () => session.current(),
        lifecycle: () => lifecycle,
        providers: () => ({ registry: providers.registry, service: providers.service }),
        orchestrator: () => orchestrator,
        agentStart: () => ({
            view: () => agentStart.view(),
            handOff: (stem, key) => agentStart.handOff({ stem, key }),
            cancel: (token) => agentStart.cancel(token),
            whenIdle: () => agentStart.whenIdle(),
        }),
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
        agentCenter: () => ({
            view: () => agentCenter.view(),
            timeline: () => agentCenter.timeline(),
            whenIdle: () => agentCenter.whenIdle(),
            listen: (listener) => {
                const subscription = agentCenter.onDidChangeView(listener);
                const timelineSubscription = agentCenter.onDidChangeTimeline(() => undefined);
                return new vscode.Disposable(() => {
                    subscription.dispose();
                    timelineSubscription.dispose();
                });
            },
            select: (runId) => agentCenter.select(runId),
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
    runOrchestrator?.dispose();
    runOrchestrator = undefined;
    const closing = runtimeSession;
    runtimeSession = undefined;
    await closing?.dispose();
}
