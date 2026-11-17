import * as vscode from 'vscode';
import type { MoveMessagePort, MovePickPort } from '../../core/ports/board';
import { PICK_SPEC_PLACEHOLDER, pickTargetPlaceholder } from '../../shared/protocol/texts';

export function createMovePicks(): MovePickPort {
    return {
        async pickSpec(items) {
            const picked = await vscode.window.showQuickPick(
                items.map((item) => ({ label: `${item.number} ${item.title}`, key: item.key })),
                { placeHolder: PICK_SPEC_PLACEHOLDER },
            );
            return picked?.key;
        },
        async pickTarget(number, targets) {
            const picked = await vscode.window.showQuickPick(
                targets.map((target) => ({ label: target, target })),
                { placeHolder: pickTargetPlaceholder(number) },
            );
            return picked?.target;
        },
    };
}

export function createMoveMessages(): MoveMessagePort {
    return {
        inform: async (text, action) => (action === undefined ? await vscode.window.showInformationMessage(text) : await vscode.window.showInformationMessage(text, action)),
        warn: (text) => void vscode.window.showWarningMessage(text),
    };
}
