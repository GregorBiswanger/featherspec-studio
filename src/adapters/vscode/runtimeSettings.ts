import * as vscode from 'vscode';

export function createMaxAgeDaysSetting(): () => unknown {
    return () => vscode.workspace.getConfiguration('featherspec-studio').get<unknown>('runHistory.maxAgeDays');
}
