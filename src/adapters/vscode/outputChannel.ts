import * as vscode from 'vscode';
import type { OutputPort } from '../../core/ports/host';

export function createOutputChannel(): OutputPort & vscode.Disposable {
    const channel = vscode.window.createOutputChannel('FeatherSpec Studio');
    return {
        appendBlock(lines) {
            lines.forEach((line) => channel.appendLine(line));
            channel.appendLine('');
        },
        dispose() {
            channel.dispose();
        },
    };
}
