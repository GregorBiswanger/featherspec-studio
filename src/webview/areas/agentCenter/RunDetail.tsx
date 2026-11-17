import type { ControlsView, DetailView } from '../../../shared/protocol/agentCenter';
import { runDuration } from '../../../shared/protocol/agentCenterDuration';
import { isOpenStatusKey } from '../../../shared/protocol/agentCenter';
import {
    AC_ACTION_CANCEL,
    AC_ACTION_OPEN_SPEC,
    AC_ACTION_RESUME,
    AC_CURRENT_ACTIVITY,
    AC_ERROR,
    AC_ERROR_CLASS,
    AC_ERROR_MESSAGE,
    AC_FAILED_AT,
    AC_FILE_CHANGES,
    AC_HISTORY_UNREADABLE,
    AC_LABEL_DURATION,
    AC_LABEL_MODEL,
    AC_LABEL_PROVIDER,
    AC_LABEL_RUN_ID,
    AC_LABEL_SESSION,
    AC_LABEL_SPEC,
    AC_LABEL_STARTED,
    AC_LABEL_STATUS,
    AC_LAST_EVENT,
    AC_LAST_STATUS,
    AC_NOT_AVAILABLE,
    AC_OPEN_FILE,
    AC_OUTSIDE_PROJECT,
    AC_RESULT,
    AC_SPEC_NOT_FOUND,
    acStatusWithCause,
} from '../../../shared/protocol/agentCenterTexts';
import type { AgentCenterAnswer } from '../../../shared/protocol/messages';
import { RunStatusChip } from '../../ui/RunStatusChip';
import { formatTime } from '../missionControl/format';
import { Requests } from './Requests';
import { SpecText } from './RunList';
import { useNow } from './store';

export interface DetailHandlers {
    onAnswer(requestId: string, answer: AgentCenterAnswer): void;
    onCancel(): void;
    onResume(): void;
    onOpenSpec(): void;
    onOpenFile(path: string): void;
}

function Pair(props: { label: string; children: React.ReactNode; data?: string }) {
    return (
        <div>
            <dt>{props.label}</dt>
            <dd data-duration={props.data === 'duration' ? '' : undefined}>{props.children}</dd>
        </div>
    );
}

function Actions(props: { detail: DetailView; controls: ControlsView; handlers: DetailHandlers }) {
    const { detail, controls } = props;
    const { actions } = detail;
    const disabled = controls.kind === 'disabled';
    const offered = controls.kind !== 'none';
    return (
        <div className="ac-actions" data-actions>
            {actions.openSpec ? (
                <button type="button" className="ac-button" onClick={props.handlers.onOpenSpec}>
                    {AC_ACTION_OPEN_SPEC}
                </button>
            ) : null}
            {offered && actions.cancel === 'offer' ? (
                <button type="button" className="ac-button" disabled={disabled} onClick={props.handlers.onCancel}>
                    {AC_ACTION_CANCEL}
                </button>
            ) : null}
            {offered && actions.cancel === 'unsupported' && actions.cancelNote !== undefined ? <span className="ac-note">{actions.cancelNote}</span> : null}
            {offered && actions.resume ? (
                <button type="button" className="ac-button ac-primary" disabled={disabled} onClick={props.handlers.onResume}>
                    {AC_ACTION_RESUME}
                </button>
            ) : null}
            {actions.refusal === undefined ? null : (
                <span className="ac-refusal" role="alert">
                    {actions.refusal}
                </span>
            )}
        </div>
    );
}

export function RunDetail(props: { detail: DetailView; controls: ControlsView; handlers: DetailHandlers; children?: React.ReactNode }) {
    const { detail, controls, handlers } = props;
    const header = detail.header;
    const now = useNow(isOpenStatusKey(header.status));
    return (
        <section className="ac-detail" data-run-detail aria-label={header.runId}>
            <div className="ac-detail-top">
                <h2 className="ac-detail-title">
                    <SpecText spec={header.spec} />
                </h2>
                <RunStatusChip status={header.status} />
            </div>
            <Actions detail={detail} controls={controls} handlers={handlers} />
            {controls.kind === 'disabled' ? (
                <p className="ac-note" data-controls-reason>
                    {controls.reason}
                </p>
            ) : null}
            {detail.unreadable ? <p className="ac-flag-line">{AC_HISTORY_UNREADABLE}</p> : null}
            <dl className="ac-header" data-run-header>
                <Pair label={AC_LABEL_RUN_ID}>
                    <code>{header.runId}</code>
                </Pair>
                <Pair label={AC_LABEL_PROVIDER}>{header.provider}</Pair>
                <Pair label={AC_LABEL_MODEL}>{header.model}</Pair>
                <Pair label={AC_LABEL_SESSION}>{header.session}</Pair>
                <Pair label={AC_LABEL_SPEC}>{header.spec.found ? <SpecText spec={header.spec} /> : `${AC_SPEC_NOT_FOUND} ${header.spec.stem}`}</Pair>
                <Pair label={AC_LABEL_STATUS}>{acStatusWithCause(header.status, header.cause)}</Pair>
                <Pair label={AC_LABEL_STARTED}>{header.started === undefined ? AC_NOT_AVAILABLE : formatTime(header.started)}</Pair>
                <Pair label={AC_LABEL_DURATION} data="duration">
                    {runDuration(header, now)}
                </Pair>
            </dl>
            {detail.activity === undefined ? null : (
                <section className="ac-section ac-activity" data-activity>
                    <h3>{AC_CURRENT_ACTIVITY}</h3>
                    <p>{detail.activity}</p>
                </section>
            )}
            <Requests requests={detail.requests} controls={controls} onAnswer={handlers.onAnswer} />
            {detail.error === undefined ? null : (
                <section className="ac-section ac-error" data-error>
                    <h3>{AC_ERROR}</h3>
                    <dl className="ac-header">
                        <Pair label={AC_ERROR_CLASS}>{detail.error.errorClass}</Pair>
                        <Pair label={AC_ERROR_MESSAGE}>{detail.error.message}</Pair>
                        <Pair label={AC_FAILED_AT}>{detail.error.failedAt === AC_NOT_AVAILABLE ? AC_NOT_AVAILABLE : formatTime(detail.error.failedAt)}</Pair>
                        <Pair label={AC_LAST_STATUS}>{detail.error.lastStatus}</Pair>
                        <Pair label={AC_LAST_EVENT}>{detail.error.lastEvent}</Pair>
                    </dl>
                </section>
            )}
            {detail.result === undefined ? null : (
                <section className="ac-section ac-result" data-result>
                    <h3>{AC_RESULT}</h3>
                    <p className="ac-result-text">{detail.result.text}</p>
                    <p className="ac-note">{detail.result.notDone}</p>
                </section>
            )}
            {detail.notes.length === 0 ? null : (
                <ul className="ac-notes" data-notes>
                    {detail.notes.map((note) => (
                        <li key={note} className="ac-note">
                            {note}
                        </li>
                    ))}
                </ul>
            )}
            {detail.files.length === 0 ? null : (
                <section className="ac-section" data-file-changes>
                    <h3>{AC_FILE_CHANGES}</h3>
                    <ul className="ac-files">
                        {detail.files.map((file, index) => (
                            <li key={`${file.path}:${index}`} className="ac-file" data-file-change>
                                <code>{file.path}</code>
                                <span className="ac-file-meta">
                                    {file.operation} · {file.basis}
                                    {file.outsideProject ? ` · ${AC_OUTSIDE_PROJECT}` : ''}
                                </span>
                                {file.canOpen ? (
                                    <button type="button" className="ac-button" onClick={() => handlers.onOpenFile(file.path)}>
                                        {AC_OPEN_FILE}
                                    </button>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
            {props.children}
        </section>
    );
}
