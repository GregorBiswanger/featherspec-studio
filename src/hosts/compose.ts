import { createAssistantWiring } from '../core/assistant/wiring';
import type { AssistantTable } from '../core/assistant/assistants';
import { ASSISTANT_KEY } from '../core/assistant/offer';
import { createHandOverMemory } from '../core/assistant/handOver';
import { createBoardRequests, type BoardRequests } from '../core/board/boardRequests';
import { createBoardService, type BoardService } from '../core/board/boardService';
import { createOpenFile, type OpenFile } from '../core/board/openFile';
import { createShellSelection } from '../core/board/shellSelection';
import { createCopyNextStep, type CopyNextStep } from '../core/copyNextStep/copyNextStep';
import { createProjectLine } from '../core/copyNextStep/projectLine';
import { createStatusEntry, type StatusEntry } from '../core/copyNextStep/statusEntry';
import { createDiscoveryController, type DiscoveryController } from '../core/discovery/discoveryController';
import { removeEarlierRunData } from '../core/runtime/earlierRunData';
import { createRuntimeSession, type RuntimeSession } from '../core/runtime/runtimeSession';
import type { RuntimeStore } from '../core/runtime/runtimeStore';
import { createLifecycleService, type LifecycleService } from '../core/lifecycle/lifecycleService';
import { createOverviewService, type OverviewService } from '../core/overview/overviewService';
import { createModelSource } from '../core/shell/modelSource';
import { createShellService, type ShellService } from '../core/shell/shellService';
import { createSpecTreeService, type SpecTreeService } from '../core/shell/specTreeService';
import { createTreeActions, type TreeActions } from '../core/shell/treeActions';
import { connectActiveProject } from '../core/specs/activeProjectFeed';
import { isCaseInsensitivePlatform } from '../core/specs/eventPath';
import { createSpecRepository, type SpecRepository } from '../core/specs/specRepository';
import { createSettingsSource } from '../core/settings/settingsSource';
import { MODEL_HINTS_KEY, parseStepTipSettings, SHOW_STEP_TIPS_KEY } from '../core/settings/stepTipSettings';
import { createSetupService, type SetupService } from '../core/setup/setupService';
import type { ClipboardPort, EditorPort } from '../core/ports/board';
import type { AssistantHostPort } from '../core/ports/assistant';
import type { FileWatchPort } from '../core/ports/fileWatch';
import type { StatusItemPort, StepUiPort } from '../core/ports/copyNextStep';
import type { ClockPort, Disposable, MarkerWatchPort, OutputPort, SettingPort, UiPort, WorkspaceFoldersPort, WorkspaceStatePort } from '../core/ports/host';
import type { ReadOnlyFileSystem } from '../core/ports/readOnlyFileSystem';
import type { ReleaseArchivePort } from '../core/ports/releaseArchive';
import type { ReleaseHttpPort } from '../core/ports/releaseHttp';
import type { SetupTargetPort } from '../core/ports/setupTarget';
import type { SetupUiPort } from '../core/ports/setupUi';
import type { ShellActionsPort, TrustPort, UiMemoryPort } from '../core/ports/shell';
import type { SpecSourcePort } from '../core/ports/specSource';
import type { EarlierRunDataFilesPort, EarlierRunDataStatePort } from '../core/ports/earlierRunData';

export const SHELL_MEMORY_KEY = 'featherspec-studio.shell';
export const BOARD_MEMORY_KEY = 'featherspec-studio.board';
export const HAND_OVER_MEMORY_KEY = 'featherspec-studio.handOvers';
export const SIDE_PANEL_MEMORY_KEY = 'featherspec-studio.sidePanel';

export interface PanelPort {
    panelCount(): number;
    show(options?: { preserveFocus?: boolean }): void;
}

export interface PanelServices {
    service: ShellService;
    overview: Pick<OverviewService, 'handlers' | 'view' | 'onDidChangeView'>;
    board: Pick<BoardService, 'view' | 'detail' | 'onDidChangeView' | 'onDidChangeDetail' | 'panelClosed'> &
        Pick<BoardRequests, 'handlers' | 'onDidOpenFileResult' | 'onDidCopyResult' | 'onDidSendResult'>;
    output: OutputPort;
}

export interface HostPorts<Panel extends PanelPort = PanelPort> {
    platform: string;
    studioVersion: string;
    fileSystem: ReadOnlyFileSystem;
    specSource: SpecSourcePort;
    folders: WorkspaceFoldersPort;
    workspaceState: WorkspaceStatePort;
    uiMemory(key: string): UiMemoryPort;
    clock: ClockPort;
    ui: UiPort;
    markerWatch: MarkerWatchPort;
    fileWatch: FileWatchPort;
    sameRoot: (first: string, second: string) => boolean;
    output: OutputPort & { show(): void };
    statusItem: StatusItemPort;
    openStore(projectRoot: string): Promise<RuntimeStore>;
    trust(): TrustPort;
    http: ReleaseHttpPort;
    archive: ReleaseArchivePort;
    setupTarget: SetupTargetPort;
    setupUi: SetupUiPort;
    setting(key: string): SettingPort;
    assistantHost: AssistantHostPort;
    assistantTable?: AssistantTable;
    clipboard: ClipboardPort;
    stepUi: StepUiPort;
    editor: EditorPort;
    shellActions: ShellActionsPort;
    openStudio(): Promise<void>;
    createPanel(services: PanelServices): Panel;
    earlierRunData: { files?: EarlierRunDataFilesPort; state: EarlierRunDataStatePort };
}

export interface Studio<Panel extends PanelPort = PanelPort> {
    controller: DiscoveryController;
    repository: SpecRepository;
    session: RuntimeSession;
    lifecycle: LifecycleService;
    service: ShellService;
    setup: SetupService;
    board: BoardService;
    overview: OverviewService;
    entry: StatusEntry;
    copyNextStep: CopyNextStep;
    openFile: OpenFile;
    requests: BoardRequests;
    treeService: SpecTreeService;
    treeActions: TreeActions;
    assistantHost: AssistantHostPort;
    modelSource: ReturnType<typeof createModelSource>;
    navigation: Disposable;
    feed: Disposable;
    panel: Panel;
    start(): Promise<void>;
}

export function composeStudio<Panel extends PanelPort>(ports: HostPorts<Panel>): Studio<Panel> {
    const projectLine = createProjectLine();
    const controller = createDiscoveryController({
        fileSystem: ports.fileSystem,
        statusBar: projectLine,
        output: ports.output,
        state: ports.workspaceState,
        folders: ports.folders,
        clock: ports.clock,
        ui: ports.ui,
        watch: ports.markerWatch,
        sameRoot: ports.sameRoot,
    });

    const repository = createSpecRepository({
        source: ports.specSource,
        watch: ports.fileWatch,
        clock: ports.clock,
        caseInsensitiveEvents: isCaseInsensitivePlatform(ports.platform),
    });
    const feed = connectActiveProject(controller, repository);
    const session = createRuntimeSession({
        discovery: controller,
        openStore: (projectRoot) => ports.openStore(projectRoot),
    });
    const lifecycle = createLifecycleService({ repository, session, clock: ports.clock });

    const sameRoot = ports.sameRoot;
    const handOvers = createHandOverMemory(ports.uiMemory(HAND_OVER_MEMORY_KEY), () => modelSource.current()?.project);
    const modelSource = createModelSource(repository, handOvers);
    const service = createShellService({
        discovery: controller,
        repository,
        source: modelSource,
        folders: ports.folders,
        trust: ports.trust(),
        memory: ports.uiMemory(SHELL_MEMORY_KEY),
        sideMemory: ports.uiMemory(SIDE_PANEL_MEMORY_KEY),
        actions: ports.shellActions,
        sameRoot,
    });
    const setup = createSetupService({
        trust: ports.trust(),
        folders: ports.folders,
        discovery: controller,
        http: ports.http,
        archive: ports.archive,
        target: ports.setupTarget,
        ui: ports.setupUi,
        clock: ports.clock,
        output: ports.output,
        actions: {
            manageTrust: () => ports.shellActions.manageTrust(),
            showOutput: () => ports.output.show(),
            openSetupGuide: () => ports.shellActions.openSetupGuide(),
        },
        studioVersion: ports.studioVersion,
    });
    const selection = createShellSelection(service);
    const tips = createSettingsSource([ports.setting(SHOW_STEP_TIPS_KEY), ports.setting(MODEL_HINTS_KEY)], ([show, hints]) => parseStepTipSettings(show, hints));
    const assistantHost = ports.assistantHost;
    const clipboard = ports.clipboard;
    const stepUi = ports.stepUi;
    const assistant = createAssistantWiring({ setting: ports.setting(ASSISTANT_KEY), host: assistantHost, clipboard, ui: stepUi, output: ports.output, clock: ports.clock, platform: ports.platform, source: modelSource, specs: ports.specSource, handOver: handOvers, ...(ports.assistantTable === undefined ? {} : { table: ports.assistantTable }) });
    const board = createBoardService({
        source: modelSource,
        selection,
        history: { read: () => lifecycle.history(), onDidChange: (listener) => lifecycle.onDidChange(() => listener()) },
        memory: ports.uiMemory(BOARD_MEMORY_KEY),
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
    const entry = createStatusEntry({ line: projectLine, discovery: controller, shell: service, source: modelSource, item: ports.statusItem, clock: ports.clock, sameRoot });
    const copyNextStep = createCopyNextStep({
        entry,
        clipboard,
        ui: stepUi,
        handOver: handOvers,
        actions: {
            selectProject: () => controller.selectProject(),
            openStudio: ports.openStudio,
        },
    });
    const openFile = createOpenFile({ source: modelSource, editor: ports.editor });
    const requests = createBoardRequests({ board, openFile, clipboard, send: (request) => assistant.send.send(request), handOver: handOvers });
    const navigation = service.onDidNavigate((request) => {
        if (request.target?.kind === 'boardFilter') {
            board.applyNavigationFilter(request.target.filter);
        }
    });
    const panel = ports.createPanel({
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
        output: ports.output,
    });
    const treeService = createSpecTreeService({ shell: service, source: modelSource, discovery: controller, sameRoot });
    const treeActions = createTreeActions({
        shell: service,
        panel: { isOpen: () => panel.panelCount() > 0, show: (options) => panel.show(options) },
        copy: (line) => copyNextStep.copy(line),
        openFile,
        warn: (text) => stepUi.warn(text),
    });

    return {
        controller,
        repository,
        session,
        lifecycle,
        service,
        setup,
        board,
        overview,
        entry,
        copyNextStep,
        openFile,
        requests,
        treeService,
        treeActions,
        assistantHost,
        modelSource,
        navigation,
        feed,
        panel,
        async start() {
            await removeEarlierRunData({
                files: ports.earlierRunData.files,
                state: ports.earlierRunData.state,
                output: ports.output,
            });
            await session.start();
            await controller.start();
            await session.whenIdle();
        },
    };
}
