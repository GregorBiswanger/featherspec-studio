import * as vscode from 'vscode';
import type { EditorPort } from '../../core/ports/board';

export function createEditor(): EditorPort {
    return {
        async open(root, key, line) {
            const uri = vscode.Uri.joinPath(vscode.Uri.parse(root), ...key.split('/'));
            try {
                await vscode.workspace.fs.stat(uri);
            } catch {
                return 'not-found';
            }
            const document = await vscode.workspace.openTextDocument(uri);
            const position = new vscode.Position(line === undefined ? 0 : Math.max(0, line - 1), 0);
            await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.Beside, preview: false, selection: new vscode.Range(position, position) });
            return 'opened';
        },
    };
}
