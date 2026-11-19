import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { closePopup, setPopup, useIsPopupOpen } from './popup';

export function Toggletip(props: { label: string; glyph: string; paragraphs: readonly string[] }) {
    const id = useId();
    const open = useIsPopupOpen(id);
    const button = useRef<HTMLButtonElement>(null);
    const region = useRef<HTMLDivElement>(null);
    const content = props.paragraphs.join('\n');
    const lastContent = useRef(content);

    const close = (): void => {
        closePopup(id);
    };

    useEffect(() => {
        if (lastContent.current !== content) {
            lastContent.current = content;
            close();
        }
    }, [content]);

    useEffect(() => close, []);

    useEffect(() => {
        if (!open) {
            return;
        }
        const onPointerDown = (event: Event): void => {
            const target = event.target;
            if (target instanceof Node && (button.current?.contains(target) === true || region.current?.contains(target) === true)) {
                return;
            }
            close();
        };
        const onEscape = (event: Event): void => {
            if (event instanceof globalThis.KeyboardEvent && event.key === 'Escape') {
                event.preventDefault();
                close();
                button.current?.focus();
            }
        };
        const onFocusIn = (event: Event): void => {
            const target = event.target;
            if (target instanceof Node && button.current?.contains(target) !== true && region.current?.contains(target) !== true) {
                close();
            }
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('focusin', onFocusIn, true);
        document.addEventListener('keydown', onEscape, true);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('focusin', onFocusIn, true);
            document.removeEventListener('keydown', onEscape, true);
        };
    }, [open]);

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
        if (event.key === 'Escape' && open) {
            event.preventDefault();
            close();
            button.current?.focus();
        }
    };

    const onBlur = (event: { relatedTarget: EventTarget | null }): void => {
        const next = event.relatedTarget;
        if (open && next instanceof Element && next !== button.current && region.current?.contains(next) !== true) {
            close();
        }
    };

    const onClick = (): void => {
        if (open) {
            close();
            button.current?.focus();
        } else {
            setPopup(id);
        }
    };

    return (
        <>
            <button ref={button} type="button" className="toggletip" aria-label={props.label} title={props.label} aria-expanded={open} onClick={onClick} onKeyDown={onKeyDown} onBlur={onBlur}>
                {props.glyph}
            </button>
            <div ref={region} className="toggletip-region" role="status">
                {open ? props.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>) : null}
            </div>
        </>
    );
}
