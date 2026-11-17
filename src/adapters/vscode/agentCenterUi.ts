import * as vscode from 'vscode';
import type { AgentCenterUiPort } from '../../core/ports/agentCenter';

export function createAgentCenterUi(): AgentCenterUiPort {
    return {
        async notify(text, action) {
            const answer = await vscode.window.showInformationMessage(text, action);
            return answer === action;
        },
        async confirm(text, button) {
            const answer = await vscode.window.showWarningMessage(text, { modal: true }, button);
            return answer === button;
        },
    };
}
