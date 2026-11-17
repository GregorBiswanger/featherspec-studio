import type { MoveResult } from '../../shared/protocol/board';
import { moveNextStepText, NEXT_STEP_COPY_LABEL } from '../../shared/protocol/nextStepTexts';
import { DISMISS_LABEL } from '../../shared/protocol/texts';

export function announcementOf(move: MoveResult): string | undefined {
    switch (move.kind) {
        case 'none':
            return undefined;
        case 'refused':
            return move.text;
        case 'nextStep':
            return `${moveNextStepText(move.number)} ${move.line}`;
    }
}

export function Announcer(props: { move: MoveResult; copyResult: { ok: boolean; text: string } | undefined; onCopy(text: string): void; onDismiss(): void }) {
    const text = announcementOf(props.move);
    const move = props.move;
    return (
        <div className="board-status" role="status" aria-live="polite">
            {text === undefined || move.kind === 'none' ? null : (
                <>
                    {move.kind === 'nextStep' ? (
                        <span>
                            {moveNextStepText(move.number)} <code>{move.line}</code>{' '}
                            <button type="button" className="copy-button next-step-copy" aria-label={`${NEXT_STEP_COPY_LABEL}: ${move.line}`} onClick={() => props.onCopy(move.line)}>
                                {NEXT_STEP_COPY_LABEL}
                            </button>
                            {props.copyResult === undefined ? null : <span> {props.copyResult.text}</span>}
                        </span>
                    ) : (
                        <span>{text}</span>
                    )}{' '}
                    <button type="button" className="secondary-button" onClick={props.onDismiss}>
                        {DISMISS_LABEL}
                    </button>
                </>
            )}
        </div>
    );
}
