import { useEffect, useId, useRef, useState } from 'react';
import type { SendPromptPayload, SendResultEventPayload, SendView } from '../../shared/protocol/assistant';
import { ASSISTANT_NAMES, MORE_ACTIONS_TITLE, moreActionsName, SEND_ITEM_TEXT, sendMainLabel, sendMainName, sendOpenedLabel, sendOpenedName } from '../../shared/protocol/assistantTexts';
import { COPIED_LABEL, COPY_FAILED_LABEL, COPY_PROMPT_LABEL } from '../../shared/protocol/nextStepTexts';
import { Glyph } from '../board/icons';
import { FEEDBACK_MS, type CopyResult } from './CopyButton';

export interface SendButtonProps {
    send: SendView;
    line: string;
    sendResult: SendResultEventPayload | undefined;
    onSend(request: SendPromptPayload): void;
    copyResult: CopyResult | undefined;
    onCopy(line: string): void;
}

interface Shown {
    label: string;
    name: string;
    text: string;
}

export function SendButton(props: SendButtonProps) {
    const { send, line, sendResult, copyResult } = props;
    const name = ASSISTANT_NAMES[send.assistant];
    const arrowId = useId();
    const [open, setOpen] = useState(false);
    const [shown, setShown] = useState<Shown | undefined>(undefined);
    const pendingSend = useRef(0);
    const pendingCopy = useRef(0);
    const seenSend = useRef<SendResultEventPayload | undefined>(sendResult);
    const seenCopy = useRef<CopyResult | undefined>(copyResult);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
            pendingSend.current = 0;
            seenSend.current = undefined;
            stopTimer();
            setShown(undefined);
            return;
        }
        if (sendResult !== seenSend.current) {
            seenSend.current = sendResult;
            if (pendingSend.current > 0) {
                pendingSend.current -= 1;
                if (sendResult.outcome === 'opened') {
                    show({ label: sendOpenedLabel(name), name: sendOpenedName(name, line), text: sendResult.text });
                } else {
                    const label = sendResult.outcome === 'copied' ? COPIED_LABEL : COPY_FAILED_LABEL;
                    show({ label, name: `${label}: ${line}`, text: sendResult.text });
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

    const activateSend = (target: SendView['target']): void => {
        pendingSend.current += 1;
        setOpen(false);
        props.onSend({ assistant: send.assistant, target, line });
    };

    const activateCopy = (): void => {
        pendingCopy.current += 1;
        setOpen(false);
        props.onCopy(line);
    };

    const idleName = sendMainName(name, send.target, line);
    return (
        <span className="send-split next-step-copy">
            <button type="button" className="copy-button send-main" aria-label={shown?.name ?? idleName} title={shown?.text ?? idleName} onClick={() => activateSend(send.target)}>
                {shown?.label ?? sendMainLabel(name)}
            </button>
            <button type="button" id={arrowId} className="send-arrow" aria-label={moreActionsName(line)} title={MORE_ACTIONS_TITLE} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
                <Glyph kind="chevronDown" />
            </button>
            {open ? (
                <div role="menu" aria-labelledby={arrowId} className="send-menu">
                    {send.targets.map((target) => (
                        <button key={target} type="button" role="menuitem" onClick={() => activateSend(target)}>
                            {SEND_ITEM_TEXT[target]}
                        </button>
                    ))}
                    <button type="button" role="menuitem" onClick={activateCopy}>
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
