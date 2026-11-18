import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import type { KeyboardEvent } from 'react';

let openId: string | undefined;
const listeners = new Set<() => void>();

function setOpen(next: string | undefined): void {
    if (openId === next) {
        return;
    }
    openId = next;
    for (const listener of [...listeners]) {
        listener();
    }
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function snapshot(): string | undefined {
    return openId;
}

export function Toggletip(props: { label: string; glyph: string; paragraphs: readonly string[] }) {
    const id = useId();
    const open = useSyncExternalStore(subscribe, snapshot) === id;
    const button = useRef<HTMLButtonElement>(null);
    const region = useRef<HTMLDivElement>(null);
    const content = props.paragraphs.join('\n');
    const lastContent = useRef(content);

    const close = (): void => {
        if (openId === id) {
            setOpen(undefined);
        }
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
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => document.removeEventListener('pointerdown', onPointerDown, true);
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
            setOpen(id);
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
