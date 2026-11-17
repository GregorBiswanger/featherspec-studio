import * as vscode from 'vscode';
import type { ShellActionsPort } from '../../core/ports/shell';
import { SETUP_GUIDE_URL } from '../../core/discovery/report';
import { COPY_MERGE_PROMPT_COMMAND_ID, SETUP_COMMAND_ID } from '../../shared/protocol/texts';

export const MANAGE_TRUST_COMMAND = 'workbench.trust.manage';

export interface ShellActionsDeps {
    showOutput: () => void;
    reloadPanel: () => void;
}

export function createShellActions(deps: ShellActionsDeps): ShellActionsPort {
    return {
        async openFolder() {
            await vscode.commands.executeCommand('vscode.openFolder');
        },
        async openSetupGuide() {
            await vscode.env.openExternal(vscode.Uri.parse(SETUP_GUIDE_URL));
        },
        showOutput: () => deps.showOutput(),
        async manageTrust() {
            await vscode.commands.executeCommand(MANAGE_TRUST_COMMAND);
        },
        reloadPanel: () => deps.reloadPanel(),
        async setUp() {
            await vscode.commands.executeCommand(SETUP_COMMAND_ID);
        },
        async copyMergePrompt() {
            await vscode.commands.executeCommand(COPY_MERGE_PROMPT_COMMAND_ID);
        },
    };
}
