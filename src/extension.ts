import * as vscode from 'vscode';
import { createSystemClock } from './adapters/node/systemClock';
import { createMarkerWatch } from './adapters/vscode/markerWatch';
import { createOutputChannel } from './adapters/vscode/outputChannel';
import { sameRootFor } from './adapters/vscode/sameRoot';
import { createStatusBar } from './adapters/vscode/statusBar';
import { createUi } from './adapters/vscode/ui';
import { createVscodeFileSystem } from './adapters/vscode/vscodeFileSystem';
import { createWorkspaceFolders } from './adapters/vscode/workspaceFolders';
import { createWorkspaceState } from './adapters/vscode/workspaceState';
import { createDiscoveryController, type DiscoverySnapshot } from './core/discovery/discoveryController';

export interface StudioApi {
    snapshot(): DiscoverySnapshot;
    whenIdle(): Promise<void>;
}

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

    context.subscriptions.push(
        statusBar,
        output,
        { dispose: () => controller.dispose() },
        vscode.commands.registerCommand('featherspec-studio.selectProject', () => controller.selectProject()),
        vscode.commands.registerCommand('featherspec-studio.refreshDiscovery', () => controller.refresh()),
    );

    await controller.start();
    return { snapshot: () => controller.snapshot(), whenIdle: () => controller.whenIdle() };
}

export function deactivate(): void {}
