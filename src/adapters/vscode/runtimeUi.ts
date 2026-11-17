import * as vscode from 'vscode';
import type { RuntimeUiPort } from '../../core/runtime/runtimeSession';

export function createRuntimeUi(): RuntimeUiPort {
    return {
        warn(message) {
            void vscode.window.showWarningMessage(message);
        },
    };
}
