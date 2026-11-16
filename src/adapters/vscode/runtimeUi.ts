import * as vscode from 'vscode';
import { clearConfirmation } from '../../core/runtime/notices';
import { CLEAR_BUTTON, type RuntimeUiPort } from '../../core/runtime/runtimeSession';

export function createRuntimeUi(): RuntimeUiPort {
    return {
        async confirmClear(project) {
            const answer = await vscode.window.showWarningMessage(clearConfirmation(project), { modal: true }, CLEAR_BUTTON);
            return answer === CLEAR_BUTTON;
        },
        info(message) {
            void vscode.window.showInformationMessage(message);
        },
        warn(message) {
            void vscode.window.showWarningMessage(message);
        },
    };
}
