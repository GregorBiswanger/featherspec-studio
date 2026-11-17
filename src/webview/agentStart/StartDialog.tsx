import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { StartConfirmation } from '../../shared/protocol/agentStart';
import {
    CANCEL_LABEL,
    FIELD_LABELS,
    HIDE_PROMPT_LABEL,
    MODEL_FALLBACK,
    SHOW_PROMPT_LABEL,
    START_LABEL,
    capabilityLine,
    dialogTitle,
    previousRunText,
} from './texts';
import { useAgentStart } from './useAgentStart';

function Dialog(props: { confirmation: StartConfirmation; onStart(): void; onCancel(): void }) {
    const { confirmation } = props;
    const root = useRef<HTMLDivElement>(null);
    const cancel = useRef<HTMLButtonElement>(null);
    const opener = useRef<Element | null>(typeof document === 'undefined' ? null : document.activeElement);
    const [expanded, setExpanded] = useState(false);
    const titleId = useId();
    const promptId = useId();

    useEffect(() => {
        cancel.current?.focus();
        const previous = opener.current;
        return () => {
            if (previous instanceof HTMLElement && previous.isConnected) {
                previous.focus();
            }
        };
    }, []);

    function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            if (!confirmation.starting) {
                props.onCancel();
            }
            return;
        }
        if (event.key !== 'Tab') {
            return;
        }
        const controls = [...(root.current?.querySelectorAll('button:not([disabled])') ?? [])] as HTMLElement[];
        const first = controls[0];
        const last = controls.at(-1);
        if (first === undefined || last === undefined) {
            return;
        }
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    return (
        <div className="start-dialog-backdrop">
            <div ref={root} role="dialog" aria-modal="true" aria-labelledby={titleId} className="start-dialog" onKeyDown={onKeyDown}>
                <h2 id={titleId}>{dialogTitle(confirmation.spec.number)}</h2>
                <dl className="start-dialog-fields">
                    <dt>{FIELD_LABELS.spec}</dt>
                    <dd>
                        {confirmation.spec.number} {confirmation.spec.title} ({confirmation.spec.stem})
                    </dd>
                    <dt>{FIELD_LABELS.provider}</dt>
                    <dd>{confirmation.provider.displayName}</dd>
                    <dt>{FIELD_LABELS.model}</dt>
                    <dd>{confirmation.model ?? MODEL_FALLBACK}</dd>
                    <dt>{FIELD_LABELS.permissionMode}</dt>
                    <dd>{confirmation.permissionMode}</dd>
                    <dt>{FIELD_LABELS.previousRun}</dt>
                    <dd>{previousRunText(confirmation.previousRun)}</dd>
                </dl>
                {confirmation.disclosure === undefined ? null : <p data-start-disclosure>{confirmation.disclosure}</p>}
                {confirmation.missing.map((gap) => (
                    <p key={gap} data-start-capability={gap}>
                        {capabilityLine(gap)}
                    </p>
                ))}
                <button type="button" className="start-dialog-toggle" aria-expanded={expanded} aria-controls={promptId} onClick={() => setExpanded(!expanded)}>
                    {expanded ? HIDE_PROMPT_LABEL : SHOW_PROMPT_LABEL}
                </button>
                <pre id={promptId} hidden={!expanded} className="start-dialog-prompt" aria-label={FIELD_LABELS.prompt}>
                    {confirmation.prompt}
                </pre>
                <div className="actions">
                    <button type="button" disabled={confirmation.starting} onClick={props.onStart}>
                        {START_LABEL}
                    </button>
                    <button type="button" ref={cancel} onClick={props.onCancel}>
                        {CANCEL_LABEL}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function StartDialog() {
    const start = useAgentStart();
    const confirmation = start.view.confirmation;
    if (confirmation === undefined) {
        return null;
    }
    return <Dialog key={confirmation.token} confirmation={confirmation} onStart={() => start.confirm(confirmation.token)} onCancel={() => start.cancel(confirmation.token)} />;
}
