import * as vscode from 'vscode';
import type { StatusBarPort } from '../../core/ports/host';

export const SELECT_PROJECT_COMMAND = 'featherspec-studio.selectProject';

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
