import * as vscode from 'vscode';
import type { OutputPort } from '../../core/ports/host';

export interface ShowableOutput extends OutputPort, vscode.Disposable {
    show(): void;
}

export function createOutputChannel(): ShowableOutput {
    const channel = vscode.window.createOutputChannel('FeatherSpec Studio');
    return {
        appendBlock(lines) {
            lines.forEach((line) => channel.appendLine(line));
            channel.appendLine('');
        },
        show() {
            channel.show(true);
        },
        dispose() {
            channel.dispose();
        },
    };
}
