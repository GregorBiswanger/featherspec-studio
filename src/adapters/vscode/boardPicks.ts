import * as vscode from 'vscode';
import type { MovePickPort, MoveResultSink } from '../../core/ports/board';
import type { MoveResult } from '../../shared/protocol/board';
import { moveNextStepText, NEXT_STEP_COPY_LABEL } from '../../shared/protocol/nextStepTexts';
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

export function createMoveResultSink(boardShown: (result: MoveResult) => boolean): MoveResultSink {
    return {
        show(result) {
            if (result.kind === 'none' || boardShown(result)) {
                return;
            }
            if (result.kind === 'refused') {
                void vscode.window.showWarningMessage(result.text);
            } else {
                void vscode.window
                    .showInformationMessage(`${moveNextStepText(result.number)} ${result.line}`, NEXT_STEP_COPY_LABEL)
                    .then((choice) => (choice === NEXT_STEP_COPY_LABEL ? vscode.env.clipboard.writeText(result.line) : undefined));
            }
        },
    };
}
