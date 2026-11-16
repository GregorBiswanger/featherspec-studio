import * as vscode from 'vscode';
import type { FileWatchPort } from '../../core/ports/fileWatch';
import { eventRelativePath } from '../../core/specs/eventPath';

const PATTERN = '{.specs/**/*.md,.memory-bank/activeContext.*.md}';

export function createFileWatch(platform: string): FileWatchPort {
    return {
        watch(root, listener) {
            const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.Uri.parse(root), PATTERN));
            const forward = (uri: vscode.Uri): void => {
                const relativePath = eventRelativePath(root, uri.toString(), platform);
                if (relativePath !== undefined) {
                    listener(relativePath);
                }
            };
            const subscriptions = [watcher.onDidCreate(forward), watcher.onDidChange(forward), watcher.onDidDelete(forward), watcher];
            return { dispose: () => subscriptions.forEach((subscription) => subscription.dispose()) };
        },
    };
}
