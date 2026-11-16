import * as vscode from 'vscode';
import type { WorkspaceFoldersPort } from '../../core/ports/host';

export function createWorkspaceFolders(): WorkspaceFoldersPort {
    return {
        list() {
            return (vscode.workspace.workspaceFolders ?? []).map((folder) => ({
                root: folder.uri.toString(),
                name: folder.name,
                displayPath: folder.uri.scheme === 'file' ? folder.uri.fsPath : folder.uri.toString(),
            }));
        },
        onDidChange(listener) {
            return vscode.workspace.onDidChangeWorkspaceFolders(() => listener());
        },
    };
}
