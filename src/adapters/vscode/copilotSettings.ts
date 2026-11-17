import * as vscode from 'vscode';
import type { SettingPort } from '../../core/ports/host';
import { globalOnlyString, trimmedString } from '../providers/copilot/copilotSettingValues';

const SECTION = 'featherspec-studio';

function watch(key: string): SettingPort['onDidChange'] {
    return (listener) =>
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration(`${SECTION}.${key}`)) {
                listener();
            }
        });
}

export function createCopilotCliPathSetting(): SettingPort {
    return {
        read: () => globalOnlyString(vscode.workspace.getConfiguration(SECTION).inspect<string>('copilot.cliPath')),
        onDidChange: watch('copilot.cliPath'),
    };
}

export function createCopilotModelSetting(): SettingPort {
    return {
        read: () => trimmedString(vscode.workspace.getConfiguration(SECTION).get<unknown>('copilot.model')),
        onDidChange: watch('copilot.model'),
    };
}
