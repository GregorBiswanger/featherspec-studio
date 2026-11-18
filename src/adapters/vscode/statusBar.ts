import * as vscode from 'vscode';
import type { StatusEntryCommand, StatusEntryView, StatusItemPort } from '../../core/ports/copyNextStep';
import { OPEN_STUDIO_COMMAND_ID, SELECT_PROJECT_COMMAND_ID } from '../../shared/protocol/texts';
import { COPY_NEXT_STEP_COMMAND } from './commands';

export const SELECT_PROJECT_COMMAND = SELECT_PROJECT_COMMAND_ID;

const COMMANDS: Record<StatusEntryCommand, string> = {
    copyNextStep: COPY_NEXT_STEP_COMMAND,
    selectProject: SELECT_PROJECT_COMMAND_ID,
};

export interface StatusItemInspection {
    visible: boolean;
    text: string;
    tooltip: string;
    command: string;
    accessibleLabel: string | undefined;
}

export interface StatusItem extends StatusItemPort, vscode.Disposable {
    inspect(): StatusItemInspection;
}

export function createStatusItem(): StatusItem {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    let visible = false;
    return {
        show(view: StatusEntryView) {
            item.text = view.text;
            if ('markdown' in view.tooltip) {
                const markdown = new vscode.MarkdownString(view.tooltip.markdown);
                markdown.isTrusted = { enabledCommands: [OPEN_STUDIO_COMMAND_ID, SELECT_PROJECT_COMMAND_ID] };
                markdown.supportHtml = false;
                item.tooltip = markdown;
            } else {
                item.tooltip = view.tooltip.plain;
            }
            item.accessibilityInformation = view.accessibleLabel === undefined ? undefined : { label: view.accessibleLabel };
            item.command = COMMANDS[view.command];
            item.show();
            visible = true;
        },
        hide() {
            item.hide();
            visible = false;
        },
        inspect() {
            const tooltip = item.tooltip;
            return {
                visible,
                text: item.text,
                tooltip: typeof tooltip === 'string' ? tooltip : tooltip instanceof vscode.MarkdownString ? tooltip.value : '',
                command: typeof item.command === 'string' ? item.command : (item.command?.command ?? ''),
                accessibleLabel: item.accessibilityInformation?.label,
            };
        },
        dispose() {
            item.dispose();
        },
    };
}
