import * as vscode from 'vscode';
import type { SettingPort } from '../../core/ports/host';

const SECTION = 'featherspec-studio';
const ENABLED_KEY = 'fakeProvider.enabled';
const SCENARIO_KEY = 'fakeProvider.scenario';

export function createFakeProviderEnabledSetting(): SettingPort {
    return {
        read: () => vscode.workspace.getConfiguration(SECTION).get<unknown>(ENABLED_KEY),
        onDidChange(listener) {
            return vscode.workspace.onDidChangeConfiguration((event) => {
                if (event.affectsConfiguration(`${SECTION}.${ENABLED_KEY}`)) {
                    listener();
                }
            });
        },
    };
}

export function createFakeProviderScenarioSetting(): () => unknown {
    return () => vscode.workspace.getConfiguration(SECTION).get<unknown>(SCENARIO_KEY);
}
