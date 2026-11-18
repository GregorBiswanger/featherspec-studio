import * as vscode from 'vscode';
import type { StatusBarPort } from '../../core/ports/host';
import { SELECT_PROJECT_COMMAND_ID } from '../../shared/protocol/texts';

export const SELECT_PROJECT_COMMAND = SELECT_PROJECT_COMMAND_ID;

export function createStatusBar(): StatusBarPort & vscode.Disposable {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    item.command = SELECT_PROJECT_COMMAND;
    return {
        show(text) {
            item.text = text;
            item.tooltip = 'FeatherSpec Studio: select the active project';
            item.show();
        },
        hide() {
            item.hide();
        },
        dispose() {
            item.dispose();
        },
    };
}
