import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { SIDE_MIN, SIDE_STEP, SIDE_STEP_LARGE, clampSideWidth } from '../../shared/protocol/layout';
import { DIVIDER_LABEL, DIVIDER_TOOLTIP } from '../../shared/protocol/texts';
import type { SideWidth } from './sideWidth';

export function Divider(props: { side: SideWidth; panelId: string; onLeaveWithFocus?: () => void }) {
    const { side } = props;
    const self = useRef<HTMLDivElement>(null);
    const leave = useRef(props.onLeaveWithFocus);
    leave.current = props.onLeaveWithFocus;
    useLayoutEffect(
        () => () => {
            if (self.current !== null && document.activeElement === self.current) {
                leave.current?.();
            }
        },
        [],
    );
    const [dragging, setDragging] = useState(false);
    const drag = useRef<{ start: number; last: number } | undefined>(undefined);

    function change(next: number): void {
        const clamped = clampSideWidth(next, side.frame);
        if (clamped !== side.width) {
            side.commit(clamped);
        }
    }

    function onKeyDown(event: KeyboardEvent<HTMLElement>): void {
        const step = event.shiftKey ? SIDE_STEP_LARGE : SIDE_STEP;
        switch (event.key) {
            case 'ArrowLeft':
                change(side.width + step);
                break;
            case 'ArrowRight':
                change(side.width - step);
                break;
            case 'Home':
                change(SIDE_MIN);
                break;
            case 'End':
                change(side.max);
                break;
            case 'Enter':
                side.reset();
                break;
            default:
                return;
        }
        event.preventDefault();
    }

    function finish(): void {
        const current = drag.current;
        if (current === undefined) {
            return;
        }
        drag.current = undefined;
        setDragging(false);
        if (current.last !== current.start) {
            side.commit(current.last);
        }
    }

    function onPointerDown(event: PointerEvent<HTMLElement>): void {
        if (event.button !== 0) {
            return;
        }
        if (typeof event.currentTarget.setPointerCapture === 'function') {
            event.currentTarget.setPointerCapture(event.pointerId);
        }
        drag.current = { start: side.width, last: side.width };
        setDragging(true);
    }

    function onPointerMove(event: PointerEvent<HTMLElement>): void {
        if (drag.current === undefined) {
            return;
        }
        const next = clampSideWidth(side.right() - event.clientX, side.frame);
        drag.current.last = next;
        side.preview(next);
    }

    return (
        <div
            ref={self}
            className="divider"
            role="separator"
            tabIndex={0}
            aria-orientation="vertical"
            aria-controls={props.panelId}
            aria-valuemin={SIDE_MIN}
            aria-valuemax={side.max}
            aria-valuenow={side.width}
            aria-label={DIVIDER_LABEL}
            title={DIVIDER_TOOLTIP}
            {...(dragging ? { 'data-dragging': '' } : {})}
            onKeyDown={onKeyDown}
            onDoubleClick={side.reset}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={finish}
            onLostPointerCapture={finish}
        />
    );
}
