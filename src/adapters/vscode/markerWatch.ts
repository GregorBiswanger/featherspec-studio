import * as vscode from 'vscode';
import type { MarkerWatchPort } from '../../core/ports/host';

export function createMarkerWatch(): MarkerWatchPort {
    return {
        watch(root, listener) {
            const base = vscode.Uri.parse(root);
            const agents = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(base, 'AGENTS.md'));
            const specs = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(base, '.specs'));
            const subscriptions = [
                agents.onDidCreate(() => listener()),
                agents.onDidChange(() => listener()),
                agents.onDidDelete(() => listener()),
                specs.onDidCreate(() => listener()),
                specs.onDidDelete(() => listener()),
                agents,
                specs,
            ];
            return { dispose: () => subscriptions.forEach((subscription) => subscription.dispose()) };
        },
    };
}
