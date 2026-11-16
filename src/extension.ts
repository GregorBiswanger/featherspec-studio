import * as vscode from 'vscode';
import { createSystemClock } from './adapters/node/systemClock';
import { createMarkerWatch } from './adapters/vscode/markerWatch';
import { createOutputChannel } from './adapters/vscode/outputChannel';
import { sameRootFor } from './adapters/vscode/sameRoot';
import { createStatusBar } from './adapters/vscode/statusBar';
import { createFileWatch } from './adapters/vscode/fileWatch';
import { createUi } from './adapters/vscode/ui';
import { createVscodeSpecSource } from './adapters/vscode/vscodeSpecSource';
import { createVscodeFileSystem } from './adapters/vscode/vscodeFileSystem';
import { createWorkspaceFolders } from './adapters/vscode/workspaceFolders';
import { createWorkspaceState } from './adapters/vscode/workspaceState';
import { createDiscoveryController, type DiscoverySnapshot } from './core/discovery/discoveryController';
import { connectActiveProject } from './core/specs/activeProjectFeed';
import { isCaseInsensitivePlatform } from './core/specs/eventPath';
import { createSpecRepository, type SpecRepository } from './core/specs/specRepository';

export interface StudioApi {
    snapshot(): DiscoverySnapshot;
    whenIdle(): Promise<void>;
    specs(): SpecRepository;
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

    const repository = createSpecRepository({
        source: createVscodeSpecSource(),
        watch: createFileWatch(process.platform),
        clock: createSystemClock(),
        caseInsensitiveEvents: isCaseInsensitivePlatform(process.platform),
    });
    const feed = connectActiveProject(controller, repository);

    context.subscriptions.push(
        statusBar,
        output,
        { dispose: () => controller.dispose() },
        feed,
        { dispose: () => repository.dispose() },
        vscode.commands.registerCommand('featherspec-studio.selectProject', () => controller.selectProject()),
        vscode.commands.registerCommand('featherspec-studio.refreshDiscovery', () => controller.refresh()),
    );

    await controller.start();
    return {
        snapshot: () => controller.snapshot(),
        whenIdle: async () => {
            await controller.whenIdle();
            await repository.whenIdle();
        },
        specs: () => repository,
    };
}

export function deactivate(): void {}
