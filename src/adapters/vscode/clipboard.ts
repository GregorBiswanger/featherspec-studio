import * as vscode from 'vscode';
import type { ClipboardPort } from '../../core/ports/board';

export function createClipboard(): ClipboardPort {
    return {
        async writeText(text) {
            await vscode.env.clipboard.writeText(text);
        },
    };
}
