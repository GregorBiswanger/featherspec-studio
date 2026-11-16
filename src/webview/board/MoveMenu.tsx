import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { CardView } from '../../shared/protocol/board';
import { BOARD_STATES, type BoardState } from '../../shared/protocol/boardFilter';
import { MOVE_MENU_LABEL, moveMenuAriaLabel } from '../../shared/protocol/texts';

export function MoveMenu(props: { card: CardView; tabStop: boolean; open: boolean; onToggle(): void; onChoose(target: BoardState): void; onClose(): void }) {
    const { card } = props;
    const items = useRef<(HTMLButtonElement | null)[]>([]);
    const targets = BOARD_STATES.filter((state) => state !== card.state);

    useEffect(() => {
        if (props.open) {
            items.current[0]?.focus();
        }
    }, [props.open]);

    function onKeyDown(event: KeyboardEvent<HTMLElement>): void {
        const current = items.current.findIndex((item) => item === document.activeElement);
        let next: number | undefined;
        if (event.key === 'ArrowDown') {
            next = (current + 1) % targets.length;
        } else if (event.key === 'ArrowUp') {
            next = (current - 1 + targets.length) % targets.length;
        } else if (event.key === 'Home') {
            next = 0;
        } else if (event.key === 'End') {
            next = targets.length - 1;
        } else if (event.key === 'Escape' || event.key === 'Tab') {
            event.preventDefault();
            props.onClose();
        } else {
            return;
        }
        event.stopPropagation();
        if (next !== undefined) {
            event.preventDefault();
            items.current[next]?.focus();
        }
    }

    return (
        <div className="move-menu" onClick={(event) => event.stopPropagation()} onKeyDown={onKeyDown}>
            <button type="button" className="move-button" tabIndex={props.tabStop ? 0 : -1} aria-haspopup="menu" aria-expanded={props.open} aria-label={moveMenuAriaLabel(card.number)} onClick={props.onToggle}>
                {MOVE_MENU_LABEL}
            </button>
            {props.open ? (
                <div role="menu" className="move-items" aria-label={moveMenuAriaLabel(card.number)}>
                    {targets.map((state, index) => (
                        <button
                            key={state}
                            type="button"
                            role="menuitem"
                            tabIndex={-1}
                            ref={(element) => {
                                items.current[index] = element;
                            }}
                            onClick={() => props.onChoose(state)}
                        >
                            {state}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
