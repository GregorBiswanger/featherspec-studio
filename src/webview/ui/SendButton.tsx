import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { SendPromptPayload, SendResultEventPayload, SendView } from '../../shared/protocol/assistant';
import { ASSISTANT_NAMES, MORE_ACTIONS_TITLE, moreActionsName, SEND_ITEM_TEXT, sendMainLabel, sendMainName, sendOpenedLabel, sendOpenedName } from '../../shared/protocol/assistantTexts';
import { COPIED_LABEL, COPY_FAILED_LABEL, COPY_PROMPT_LABEL } from '../../shared/protocol/nextStepTexts';
import { Glyph } from '../board/icons';
import { FEEDBACK_MS, type CopyResult } from './CopyButton';
import { closePopup, setPopup, useIsPopupOpen } from './popup';

export interface SendButtonProps {
    send: SendView;
    line: string;
    sendResult: SendResultEventPayload | undefined;
    onSend(request: SendPromptPayload): void;
    copyResult: CopyResult | undefined;
    onCopy(line: string): void;
    onLeaveWithFocus?: () => void;
    look?: 'primary' | 'secondary';
}

interface Activation {
    line: string;
    name: string;
}

let activations = 0;
const session = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function nextToken(): string {
    activations += 1;
    return `${session}-${activations}`;
}

interface Shown {
    label: string;
    name: string;
    text: string;
}

export function SendButton(props: SendButtonProps) {
    const { send, line, sendResult, copyResult } = props;
    const secondary = props.look === 'secondary';
    const name = ASSISTANT_NAMES[send.assistant];
    const arrowId = useId();
    const open = useIsPopupOpen(arrowId);
    const root = useRef<HTMLSpanElement>(null);
    const arrow = useRef<HTMLButtonElement>(null);
    const menu = useRef<HTMLDivElement>(null);
    const menuWasOpen = useRef(false);
    const leave = useRef(props.onLeaveWithFocus);
    leave.current = props.onLeaveWithFocus;
    const focusOnOpen = useRef<'first' | 'last' | undefined>(undefined);
    const [shown, setShown] = useState<Shown | undefined>(undefined);
    const pendingSend = useRef(new Map<string, Activation>());
    const pendingCopy = useRef(0);
    const seenSend = useRef<SendResultEventPayload | undefined>(sendResult);
    const seenCopy = useRef<CopyResult | undefined>(copyResult);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const focusIsInside = (): boolean => {
        const active = document.activeElement;
        return root.current?.contains(active) === true || (menuWasOpen.current && (active === null || active === document.body));
    };

    const stopTimer = (): void => {
        if (timer.current !== undefined) {
            clearTimeout(timer.current);
            timer.current = undefined;
        }
    };

    const show = (next: Shown): void => {
        stopTimer();
        setShown(next);
        timer.current = setTimeout(() => {
            timer.current = undefined;
            setShown(undefined);
        }, FEEDBACK_MS);
    };

    useEffect(() => {
        if (sendResult === undefined) {
            pendingSend.current.clear();
            seenSend.current = undefined;
            stopTimer();
            setShown(undefined);
            return;
        }
        if (sendResult !== seenSend.current) {
            seenSend.current = sendResult;
            const own = pendingSend.current.get(sendResult.token);
            if (own !== undefined) {
                pendingSend.current.delete(sendResult.token);
                if (own.line === line && own.name === name) {
                    if (sendResult.outcome === 'opened') {
                        show({ label: sendOpenedLabel(name), name: sendOpenedName(name, line), text: sendResult.text });
                    } else {
                        const label = sendResult.outcome === 'copied' ? COPIED_LABEL : COPY_FAILED_LABEL;
                        show({ label, name: `${label}: ${line}`, text: sendResult.text });
                    }
                }
            }
        }
    }, [sendResult]);

    useEffect(() => {
        if (copyResult === undefined) {
            pendingCopy.current = 0;
            seenCopy.current = undefined;
            stopTimer();
            setShown(undefined);
            return;
        }
        if (copyResult !== seenCopy.current) {
            seenCopy.current = copyResult;
            if (pendingCopy.current > 0) {
                pendingCopy.current -= 1;
                const label = copyResult.ok ? COPIED_LABEL : COPY_FAILED_LABEL;
                show({ label, name: `${label}: ${line}`, text: copyResult.text });
            }
        }
    }, [copyResult]);

    useEffect(() => stopTimer, []);

    useLayoutEffect(
        () => () => {
            closePopup(arrowId);
            if (focusIsInside()) {
                leave.current?.();
            }
        },
        [],
    );

    const offerKey = `${send.assistant}|${send.targets.join(',')}`;
    const lastOffer = useRef(offerKey);
    useLayoutEffect(() => {
        if (lastOffer.current !== offerKey) {
            lastOffer.current = offerKey;
            closePopup(arrowId);
            if (focusIsInside()) {
                arrow.current?.focus();
            }
        }
    }, [offerKey]);

    useLayoutEffect(() => {
        menuWasOpen.current = menu.current !== null;
    });

    const itemButtons = (): HTMLElement[] => [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemradio"]') ?? [])];

    useLayoutEffect(() => {
        if (open && focusOnOpen.current !== undefined) {
            const all = itemButtons();
            (focusOnOpen.current === 'first' ? all[0] : all[all.length - 1])?.focus();
        }
        focusOnOpen.current = undefined;
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }
        const onPointerDown = (event: Event): void => {
            const target = event.target;
            if (target instanceof Node && (arrow.current?.contains(target) === true || menu.current?.contains(target) === true)) {
                return;
            }
            closePopup(arrowId);
        };
        const onEscape = (event: Event): void => {
            if (event instanceof globalThis.KeyboardEvent && event.key === 'Escape') {
                event.preventDefault();
                closePopup(arrowId);
                arrow.current?.focus();
            }
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onEscape, true);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onEscape, true);
        };
    }, [open]);

    const openMenu = (where: 'first' | 'last'): void => {
        focusOnOpen.current = where;
        setPopup(arrowId);
    };

    const closeToArrow = (): void => {
        closePopup(arrowId);
        arrow.current?.focus();
    };

    const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
        const { key } = event;
        if (!open) {
            if (event.target === arrow.current && (key === 'ArrowDown' || key === 'ArrowUp')) {
                event.preventDefault();
                openMenu(key === 'ArrowDown' ? 'first' : 'last');
            }
            return;
        }
        const all = itemButtons();
        const index = all.indexOf(document.activeElement as HTMLElement);
        const go = (to: number): void => {
            event.preventDefault();
            all[to]?.focus();
        };
        if (key === 'ArrowDown') {
            go(index < 0 ? 0 : (index + 1) % all.length);
        } else if (key === 'ArrowUp') {
            go(index < 0 ? all.length - 1 : (index - 1 + all.length) % all.length);
        } else if (key === 'Home') {
            go(0);
        } else if (key === 'End') {
            go(all.length - 1);
        } else if (key === 'Tab') {
            closeToArrow();
        }
    };

    const activateSend = (target: SendView['target'], fromMenu = false): void => {
        const token = nextToken();
        pendingSend.current.set(token, { line, name });
        if (fromMenu) {
            closeToArrow();
        }
        props.onSend({ assistant: send.assistant, target, line, ...(send.attach === undefined ? {} : { attach: send.attach.path }), token });
    };

    const activateCopy = (): void => {
        pendingCopy.current += 1;
        closeToArrow();
        props.onCopy(line);
    };

    const idleName = sendMainName(name, send.target, line, send.attach?.name);
    return (
        <span ref={root} className="send-split next-step-copy" onKeyDown={onKeyDown}>
            <button type="button" className={secondary ? 'copy-button copy-secondary send-main' : 'copy-button send-main'} aria-label={shown?.name ?? idleName} title={shown?.text ?? idleName} onClick={() => activateSend(send.target)}>
                {shown?.label ?? sendMainLabel(name)}
            </button>
            <button ref={arrow} type="button" id={arrowId} className={secondary ? 'send-arrow send-arrow-secondary' : 'send-arrow'} aria-label={moreActionsName(line)} title={MORE_ACTIONS_TITLE} aria-haspopup="menu" aria-expanded={open} onClick={() => (open ? closeToArrow() : openMenu('first'))}>
                <Glyph kind="chevronDown" />
            </button>
            {open ? (
                <div ref={menu} role="menu" aria-labelledby={arrowId} className="send-menu">
                    {send.targets.map((target) => (
                        <button key={target} type="button" role="menuitemradio" aria-checked={target === send.target} tabIndex={-1} onClick={() => activateSend(target, true)}>
                            <span className="send-check">{target === send.target ? <Glyph kind="check" /> : null}</span>
                            {SEND_ITEM_TEXT[target]}
                        </button>
                    ))}
                    <button type="button" role="menuitem" tabIndex={-1} onClick={activateCopy}>
                        <span className="send-check" />
                        {COPY_PROMPT_LABEL}
                    </button>
                </div>
            ) : null}
            <span className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
                {shown === undefined ? '' : shown.text}
            </span>
        </span>
    );
}
