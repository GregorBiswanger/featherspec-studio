import * as vscode from 'vscode';
import { createFileRuntimeMedium, projectStoreDirectory } from './adapters/node/fileRuntimeMedium';
import { createRandomIds } from './adapters/node/randomIds';
import { createSystemClock } from './adapters/node/systemClock';
import { createSystemRuntimeClock } from './adapters/node/systemRuntimeClock';
import { createMarkerWatch } from './adapters/vscode/markerWatch';
import { createOutputChannel } from './adapters/vscode/outputChannel';
import { sameRootFor } from './adapters/vscode/sameRoot';
import { createStatusBar } from './adapters/vscode/statusBar';
import { createRuntimeUi } from './adapters/vscode/runtimeUi';
import { createMaxAgeDaysSetting } from './adapters/vscode/runtimeSettings';
import { createUi } from './adapters/vscode/ui';
import { createVscodeFileSystem } from './adapters/vscode/vscodeFileSystem';
import { createWorkspaceFolders } from './adapters/vscode/workspaceFolders';
import { createWorkspaceState } from './adapters/vscode/workspaceState';
import { createDiscoveryController, type DiscoverySnapshot } from './core/discovery/discoveryController';
import type { StoreState } from './core/runtime/model';
import { createRuntimeSession, type RuntimeSession } from './core/runtime/runtimeSession';
import { openRuntimeStore, type RuntimeStore } from './core/runtime/runtimeStore';
import { createUnavailableMedium } from './core/runtime/unavailableMedium';

export interface StudioApi {
    snapshot(): DiscoverySnapshot;
    whenIdle(): Promise<void>;
    runtimeState(): StoreState;
    runtimeStore(): RuntimeStore | undefined;
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

    const runtimeUi = createRuntimeUi();
    const storage = context.globalStorageUri;
    const clock = createSystemRuntimeClock();
    const ids = createRandomIds();
    const maxAgeDays = createMaxAgeDaysSetting();
    const session = createRuntimeSession({
        discovery: controller,
        ui: runtimeUi,
        openStore: (projectRoot) =>
            openRuntimeStore({
                medium:
                    storage.scheme === 'file'
                        ? createFileRuntimeMedium(
                              projectStoreDirectory(storage.fsPath, process.platform === 'win32' ? projectRoot.toLowerCase() : projectRoot),
                          )
                        : createUnavailableMedium('storage location is not on the local file system'),
                ids,
                clock,
                notices: { show: (message) => runtimeUi.warn(message) },
                credentials: { values: () => [] },
                projectRoot,
                maxAgeDays,
            }),
    });
    runtimeSession = session;

    context.subscriptions.push(
        statusBar,
        output,
        { dispose: () => controller.dispose() },
        vscode.commands.registerCommand('featherspec-studio.selectProject', () => controller.selectProject()),
        vscode.commands.registerCommand('featherspec-studio.refreshDiscovery', () => controller.refresh()),
        vscode.commands.registerCommand('featherspec-studio.clearRunHistory', () => session.clearRunHistory()),
    );

    await session.start();
    await controller.start();
    await session.whenIdle();
    return {
        snapshot: () => controller.snapshot(),
        whenIdle: async () => {
            await controller.whenIdle();
            await session.whenIdle();
        },
        runtimeState: () => session.state(),
        runtimeStore: () => session.current(),
    };
}

export async function deactivate(): Promise<void> {
    const closing = runtimeSession;
    runtimeSession = undefined;
    await closing?.dispose();
}
