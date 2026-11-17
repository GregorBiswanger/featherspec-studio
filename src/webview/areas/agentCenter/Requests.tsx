import { useState } from 'react';
import type { ControlsView, RequestView } from '../../../shared/protocol/agentCenter';
import {
    AC_APPROVE_ONCE,
    AC_OUTSIDE_PROJECT,
    AC_REASON_OPTIONAL,
    AC_REJECT,
    AC_SEND,
    AC_WAITING_FOR_YOU,
    AC_YOUR_ANSWER,
} from '../../../shared/protocol/agentCenterTexts';
import type { AgentCenterAnswer } from '../../../shared/protocol/messages';
import { Glyph } from '../../board/icons';

function Request(props: { request: RequestView; controls: ControlsView; onAnswer: (requestId: string, answer: AgentCenterAnswer) => void }) {
    const { request, controls } = props;
    const [reason, setReason] = useState('');
    const [text, setText] = useState('');
    const disabled = controls.kind === 'disabled' || request.pending;
    return (
        <div className="ac-request" data-request={request.requestId}>
            <div className="ac-request-head">
                <Glyph kind="waiting" />
                <strong>{AC_WAITING_FOR_YOU}</strong>
            </div>
            {request.kind === 'approval' ? (
                <p className="ac-request-text">
                    <code>{request.actionKind}</code> <span>{request.summary}</span>
                    {request.outsideProject ? <span className="ac-flag ac-flag-warn">{AC_OUTSIDE_PROJECT}</span> : null}
                </p>
            ) : (
                <p className="ac-request-text">{request.question}</p>
            )}
            {controls.kind === 'none' ? null : request.kind === 'approval' ? (
                <div className="ac-request-controls">
                    <button type="button" className="ac-button ac-primary" disabled={disabled} onClick={() => props.onAnswer(request.requestId, { kind: 'approval', decision: 'approve-once' })}>
                        {AC_APPROVE_ONCE}
                    </button>
                    <button
                        type="button"
                        className="ac-button"
                        disabled={disabled}
                        onClick={() => props.onAnswer(request.requestId, reason === '' ? { kind: 'approval', decision: 'reject' } : { kind: 'approval', decision: 'reject', reason })}
                    >
                        {AC_REJECT}
                    </button>
                    <input className="ac-field" type="text" aria-label={AC_REASON_OPTIONAL} placeholder={AC_REASON_OPTIONAL} value={reason} disabled={disabled} onChange={(event) => setReason(event.target.value)} />
                </div>
            ) : (
                <div className="ac-request-controls">
                    <input className="ac-field" type="text" aria-label={AC_YOUR_ANSWER} placeholder={AC_YOUR_ANSWER} value={text} disabled={disabled} onChange={(event) => setText(event.target.value)} />
                    <button type="button" className="ac-button ac-primary" disabled={disabled || text.trim() === ''} onClick={() => props.onAnswer(request.requestId, { kind: 'input', text })}>
                        {AC_SEND}
                    </button>
                </div>
            )}
            {request.refusal === undefined ? null : (
                <p className="ac-refusal" role="alert">
                    {request.refusal}
                </p>
            )}
        </div>
    );
}

export function Requests(props: { requests: readonly RequestView[]; controls: ControlsView; onAnswer: (requestId: string, answer: AgentCenterAnswer) => void }) {
    if (props.requests.length === 0) {
        return null;
    }
    return (
        <section className="ac-section ac-requests" data-requests>
            {props.requests.map((request) => (
                <Request key={request.requestId} request={request} controls={props.controls} onAnswer={props.onAnswer} />
            ))}
        </section>
    );
}
