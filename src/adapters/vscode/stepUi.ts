import * as vscode from 'vscode';
import type { StepUiPort } from '../../core/ports/copyNextStep';

export function createStepUi(): StepUiPort {
    return {
        async pick(items, placeholder) {
            const picked = await vscode.window.showQuickPick(
                items.map((item) => ({ label: item.label, description: item.description, item })),
                { placeHolder: placeholder },
            );
            return picked?.item;
        },
        async inform(text, action) {
            return vscode.window.showInformationMessage(text, action);
        },
        warn(text) {
            void vscode.window.showWarningMessage(text);
        },
    };
}
