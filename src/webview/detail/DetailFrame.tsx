import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { DETAIL_LABEL } from '../../shared/protocol/texts';
import { focusHeading, rescueFocus } from './focus';

type Tag = 'section' | 'div';

export function DetailFrame(props: { as: Tag; labelled: boolean; onClose?: (() => void) | undefined; fallback?: (() => void) | undefined; children: ReactNode }) {
    const { as: Wrapper } = props;
    const ref = useRef<HTMLElement>(null);
    const inside = useRef(false);
    const fallback = useRef(props.fallback);
    fallback.current = props.fallback;

    useEffect(() => {
        if (inside.current && ref.current !== null && !ref.current.contains(document.activeElement)) {
            inside.current = false;
            if (!focusHeading()) {
                fallback.current?.();
            }
        }
    });

    useLayoutEffect(
        () => () => {
            if (inside.current) {
                inside.current = false;
                rescueFocus(() => fallback.current?.());
            }
        },
        [],
    );

    function onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Escape' && !event.defaultPrevented && props.onClose !== undefined) {
            event.preventDefault();
            props.onClose();
        }
    }

    return (
        <Wrapper
            ref={ref as never}
            className="spec-detail"
            {...(props.labelled ? { 'aria-label': DETAIL_LABEL } : {})}
            onFocus={() => {
                inside.current = true;
            }}
            onBlur={(event) => {
                const next = event.relatedTarget;
                if (next instanceof Element && ref.current?.contains(next) !== true) {
                    inside.current = false;
                } else if (next === null) {
                    const element = event.target as Element;
                    queueMicrotask(() => {
                        if (element.isConnected && (document.activeElement === null || document.activeElement === document.body)) {
                            inside.current = false;
                        }
                    });
                }
            }}
            onKeyDown={onKeyDown}
        >
            {props.children}
        </Wrapper>
    );
}
