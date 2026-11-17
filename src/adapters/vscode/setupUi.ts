import * as vscode from 'vscode';
import type { SetupUiPort } from '../../core/ports/setupUi';

export function createSetupUi(): SetupUiPort {
    return {
        async pickTarget(items, placeholder) {
            const picked = await vscode.window.showQuickPick(
                items.map((item) => ({ label: item.label, description: item.description, detail: item.detail, root: item.root })),
                { placeHolder: placeholder },
            );
            return picked?.root;
        },
        async confirm(model) {
            const answer = await vscode.window.showInformationMessage(model.message, { modal: true, detail: model.detail }, model.confirmLabel);
            return answer === model.confirmLabel;
        },
        withProgress(title, task) {
            return Promise.resolve(
                vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title, cancellable: true }, (_progress, token) => {
                    const controller = new AbortController();
                    const subscription = token.onCancellationRequested(() => controller.abort());
                    if (token.isCancellationRequested) {
                        controller.abort();
                    }
                    return task(controller.signal).finally(() => subscription.dispose());
                }),
            );
        },
        async notify(message, actions) {
            return vscode.window.showInformationMessage(message, ...actions);
        },
        async copy(text) {
            await vscode.env.clipboard.writeText(text);
        },
    };
}
