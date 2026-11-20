import * as vscode from 'vscode';
import { BRIEF_WATCH_PATH, MARKER_WATCH_PATHS } from '../../core/discovery/markerWatchPaths';
import type { MarkerWatchPort } from '../../core/ports/host';

export function createMarkerWatch(): MarkerWatchPort {
    return {
        watch(root, listener) {
            const base = vscode.Uri.parse(root);
            const subscriptions: vscode.Disposable[] = [];
            for (const marker of MARKER_WATCH_PATHS) {
                const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(base, marker));
                subscriptions.push(watcher.onDidCreate(() => listener()), watcher.onDidDelete(() => listener()), watcher);
                if (marker === 'AGENTS.md' || marker === BRIEF_WATCH_PATH) {
                    subscriptions.push(watcher.onDidChange(() => listener()));
                }
            }
            return { dispose: () => subscriptions.forEach((subscription) => subscription.dispose()) };
        },
    };
}
