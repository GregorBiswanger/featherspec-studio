import * as vscode from 'vscode';
import type { NotificationAction, SelectItem, UiPort } from '../../core/ports/host';

export function createUi(): UiPort {
    return {
        async showQuickPick(items) {
            const picked = await vscode.window.showQuickPick(
                items.map((item) => ({ label: item.label, description: item.description, detail: item.detail, item })),
                { placeHolder: 'Select the FeatherSpec project' },
            );
            return picked?.item as SelectItem | undefined;
        },
        async showNotification(model) {
            const answer = await vscode.window.showInformationMessage(model.message, ...model.actions);
            return answer as NotificationAction | undefined;
        },
        async openExternal(url) {
            await vscode.env.openExternal(vscode.Uri.parse(url));
        },
    };
}
