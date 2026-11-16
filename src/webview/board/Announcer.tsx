import type { MoveResult } from '../../shared/protocol/board';
import { DISMISS_LABEL, handedOffText } from '../../shared/protocol/texts';

export function announcementOf(move: MoveResult): string | undefined {
    switch (move.kind) {
        case 'none':
            return undefined;
        case 'refused':
            return move.text;
        case 'handedOff':
            return handedOffText(move.number);
    }
}

export function Announcer(props: { move: MoveResult; onDismiss(): void }) {
    const text = announcementOf(props.move);
    return (
        <div className="board-status" role="status" aria-live="polite">
            {text === undefined ? null : (
                <>
                    <span>{text}</span>{' '}
                    <button type="button" onClick={props.onDismiss}>
                        {DISMISS_LABEL}
                    </button>
                </>
            )}
        </div>
    );
}
