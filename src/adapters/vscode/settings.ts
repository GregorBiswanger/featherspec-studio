import * as vscode from 'vscode';
import type { SettingPort } from '../../core/ports/host';

const SECTION = 'featherspec-studio';

export function createSettingPort(key: string): SettingPort {
    return {
        read: () => vscode.workspace.getConfiguration(SECTION).get(key),
        onDidChange: (listener) =>
            vscode.workspace.onDidChangeConfiguration((event) => {
                if (event.affectsConfiguration(`${SECTION}.${key}`)) {
                    listener();
                }
            }),
    };
}
