import { useEffect, useRef, useState } from 'react';
import { COPIED_LABEL, COPY_FAILED_LABEL, NEXT_STEP_COPY_LABEL } from '../../shared/protocol/nextStepTexts';

export interface CopyResult {
    ok: boolean;
    text: string;
}

const FEEDBACK_MS = 2000;

export function CopyButton(props: { line: string; copyResult: CopyResult | undefined; onCopy(line: string): void }) {
    const { line, copyResult } = props;
    const [shown, setShown] = useState<CopyResult | undefined>(undefined);
    const waiting = useRef(false);
    const seen = useRef<CopyResult | undefined>(copyResult);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

    const label = shown === undefined ? NEXT_STEP_COPY_LABEL : shown.ok ? COPIED_LABEL : COPY_FAILED_LABEL;
    return (
        <>
            <button type="button" className="copy-button next-step-copy" aria-label={`${label}: ${line}`} title={shown?.text} onClick={activate}>
                {label}
            </button>
            <span className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
                {shown === undefined ? '' : shown.text}
            </span>
        </>
    );
}
