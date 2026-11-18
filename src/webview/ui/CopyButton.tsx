import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FocusHandoff } from './focusHandoff';
import { Glyph } from '../board/icons';
import { COPIED_LABEL, COPY_FAILED_LABEL, COPY_PROMPT_LABEL } from '../../shared/protocol/nextStepTexts';

export interface CopyResult {
    ok: boolean;
    text: string;
}

export const FEEDBACK_MS = 2000;

export type CopyLook = 'primary' | 'secondary' | 'icon';

export function CopyButton(props: { look: CopyLook; line: string; copyResult: CopyResult | undefined; onCopy(line: string): void; tabIndex?: number; handoff?: FocusHandoff }) {
    const { line, copyResult } = props;
    const [shown, setShown] = useState<CopyResult | undefined>(undefined);
    const waiting = useRef(false);
    const seen = useRef<CopyResult | undefined>(copyResult);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const button = useRef<HTMLButtonElement>(null);

    useLayoutEffect(() => {
        if (props.handoff?.take() === true) {
            button.current?.focus();
        }
    }, []);

    useEffect(() => {
        if (copyResult === undefined) {
            waiting.current = false;
            seen.current = undefined;
            setShown(undefined);
            return;
        }
        if (waiting.current && copyResult !== undefined && copyResult !== seen.current) {
            seen.current = copyResult;
            setShown(copyResult);
        }
    }, [copyResult]);

    useEffect(
        () => () => {
            if (timer.current !== undefined) {
                clearTimeout(timer.current);
            }
        },
        [],
    );

    const activate = (): void => {
        waiting.current = true;
        seen.current = copyResult;
        if (timer.current !== undefined) {
            clearTimeout(timer.current);
        }
        timer.current = setTimeout(() => {
            timer.current = undefined;
            waiting.current = false;
            setShown(undefined);
        }, FEEDBACK_MS);
        props.onCopy(line);
    };

    const label = shown === undefined ? COPY_PROMPT_LABEL : shown.ok ? COPIED_LABEL : COPY_FAILED_LABEL;
    const name = `${label}: ${line}`;
    const tab = props.tabIndex === undefined ? {} : { tabIndex: props.tabIndex };
    return (
        <>
            {props.look === 'icon' ? (
                <button ref={button} type="button" className="copy-icon next-step-copy" aria-label={name} title={shown?.text ?? name} onClick={activate} {...tab}>
                    <Glyph kind={shown === undefined ? 'copy' : shown.ok ? 'check' : 'diagnostic'} />
                </button>
            ) : (
                <button ref={button} type="button" className={props.look === 'secondary' ? 'copy-button copy-secondary next-step-copy' : 'copy-button next-step-copy'} aria-label={name} title={shown?.text} onClick={activate} {...tab}>
                    {label}
                </button>
            )}
            <span className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
                {shown === undefined ? '' : shown.text}
            </span>
        </>
    );
}
