import * as vscode from 'vscode';
import type { OrchestratorUiPort } from '../../core/ports/orchestrator';

export function createOrchestratorUi(): OrchestratorUiPort {
    return {
        async confirm(message, button) {
            const answer = await vscode.window.showWarningMessage(message, { modal: true }, button);
            return answer === button;
        },
        async pick(items, placeholder) {
            const chosen = await vscode.window.showQuickPick(
                items.map((item) => ({ label: item.label, description: item.description, id: item.id })),
                { placeHolder: placeholder },
            );
            return chosen?.id;
        },
        info(message) {
            void vscode.window.showInformationMessage(message);
        },
    };
}
