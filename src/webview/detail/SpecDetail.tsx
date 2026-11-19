import { useEffect, useRef } from 'react';
import type { SendPromptPayload, SendResultEventPayload } from '../../shared/protocol/assistant';
import type { DetailView, DiagnosticLine, SpecDetailView } from '../../shared/protocol/detail';
import {
    BANNER_HEADING,
    columnRuleTooltip,
    DEPRECATED_MARKER,
    DERIVED_SENTENCES,
    DETAIL_LABEL,
    FILES_HEADING,
    historyEntryText,
    historyTooltip,
    HISTORY_NOT_AVAILABLE_TEXT,
    persistedTooltip,
    HISTORY_HEADING,
    historyHeading,
} from '../../shared/protocol/texts';
import { isDerivedRule } from '../../shared/protocol/board';
import { isBoardState } from '../../shared/protocol/boardFilter';
import { Glyph } from '../board/icons';
import { EmptyState } from '../ui/EmptyState';
import { FileLink, type FileResult } from '../ui/FileLink';
import { PathText } from '../ui/PathText';
import { FormatNotes } from '../ui/FormatNotes';
import { InlineText } from '../ui/InlineText';
import { StateChip } from '../ui/StateChip';
import type { DetailAreaId } from '../../shared/protocol/areas';
import { BackButton } from './BackButton';
import { CloseButton } from './CloseButton';
import { DetailFrame } from './DetailFrame';
import { DetailSection, PlainSection } from './DetailSection';
import { takePendingHeadingFocus } from './focus';
import { identityKeys } from './identityKeys';
import { NextStep } from './NextStep';
import { PlanSection } from './PlanSection';
import { Progress } from './Progress';

type OpenAt = (key: string, line?: number) => void;

function noop(): void {
    return undefined;
}

function stateTooltip(detail: SpecDetailView): string {
    return detail.persistence === 'derived' && isDerivedRule(detail.rule) ? columnRuleTooltip(detail.rule) : persistedTooltip(detail.rule);
}

function Header(props: { detail: SpecDetailView; onClose: (() => void) | undefined; back: DetailAreaId | undefined; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
    const { detail } = props;
    const tooltip = stateTooltip(detail);
    return (
        <>
            {props.back === undefined || props.onClose === undefined ? null : <BackButton area={props.back} onBack={props.onClose} />}
            <div className="detail-title">
                <span className="detail-number">{detail.number}</span>
                <h2 ref={props.headingRef} tabIndex={-1} data-detail-heading data-detail-stem={detail.stem}>
                    <span className="sr-number">{detail.number} </span>
                    {detail.title}
                </h2>
                {isBoardState(detail.state) ? <StateChip state={detail.state} tooltip={tooltip} /> : <span title={tooltip}>{detail.state}</span>}
                {detail.persistence === 'derived' && isDerivedRule(detail.rule) ? <span className="visually-hidden">{DERIVED_SENTENCES[detail.rule]}</span> : null}
                {detail.successor === undefined ? null : <span className="detail-flag">{DEPRECATED_MARKER}</span>}
                {props.onClose === undefined || props.back !== undefined ? null : <CloseButton onClose={props.onClose} />}
            </div>
            {detail.path === undefined ? null : (
                <p className="detail-path">
                    <PathText path={detail.path} />
                </p>
            )}
            {detail.successor === undefined ? null : <p className="detail-successor">{detail.successor}</p>}
        </>
    );
}

function Reason(props: { line: DiagnosticLine; fileResult: FileResult | undefined; onOpen: OpenAt }) {
    const { line } = props;
    const text = line.sentence ?? line.reason;
    const reason = line.sentence === undefined ? undefined : line.reason;
    return line.open === undefined ? (
        <span {...(reason === undefined ? {} : { title: reason })}>
            <InlineText text={text} />
        </span>
    ) : (
        <FileLink target={line.open} fileResult={props.fileResult} onOpen={props.onOpen} {...(reason === undefined ? {} : { reason })}>
            <InlineText text={text} />
        </FileLink>
    );
}

function History(props: { history: SpecDetailView['history']; now: Date }) {
    const { history } = props;
    if (history.statusHistory === undefined) {
        return (
            <PlainSection title={HISTORY_HEADING}>
                <p>{history.notAvailable ?? HISTORY_NOT_AVAILABLE_TEXT}</p>
            </PlainSection>
        );
    }
    if (history.statusHistory.length === 0) {
        return null;
    }
    return (
        <DetailSection title={historyHeading(history.statusHistory.length)} memoryKey={HISTORY_HEADING}>
            <p>{history.label}</p>
            <ul className="detail-history">
                {history.statusHistory.map((item, index) => (
                    <li key={`${index}|${item.observedAt}`} title={historyTooltip(item)}>
                        {historyEntryText(item, props.now)}
                    </li>
                ))}
            </ul>
        </DetailSection>
    );
}

function Picture(props: {
    detail: SpecDetailView;
    fileResult: FileResult | undefined;
    copyResult: { ok: boolean; text: string } | undefined;
    sendResult: SendResultEventPayload | undefined;
    onOpen: OpenAt;
    onCopy(text: string): void;
    onSend(request: SendPromptPayload): void;
    onClose: (() => void) | undefined;
    back: DetailAreaId | undefined;
    onOpenMap: (() => void) | undefined;
}) {
    const { detail, fileResult, onOpen } = props;
    const now = new Date();
    const headingRef = useRef<HTMLHeadingElement>(null);
    const plan = props.onOpenMap !== undefined && detail.plan?.kind === 'plan' ? detail.plan : undefined;
    const problemKeys = identityKeys(detail.problems, (line) => `${line.reason}|${line.open?.key ?? ''}|${line.open?.line ?? ''}`);
    useEffect(() => {
        if (takePendingHeadingFocus(detail.stem)) {
            headingRef.current?.focus();
        }
    }, [detail.stem]);
    return (
        <>
            <Header detail={detail} onClose={props.onClose} back={props.back} headingRef={headingRef} />
            <NextStep nextStep={detail.nextStep} fileResult={fileResult} onOpen={onOpen} copyResult={props.copyResult} onCopy={props.onCopy} sendResult={props.sendResult} onSend={props.onSend} />
            {detail.problems.length === 0 ? null : (
                <ul className="detail-problems" aria-label={BANNER_HEADING}>
                    {detail.problems.map((line, index) => (
                        <li key={problemKeys[index]}>
                            <Glyph kind="diagnostic" />
                            <span>
                                <Reason line={line} fileResult={fileResult} onOpen={onOpen} />
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {plan === undefined ? null : <PlanSection plan={plan} fileResult={fileResult} onOpen={onOpen} onOpenMap={props.onOpenMap ?? noop} />}
            {detail.progress === undefined ? null : <Progress progress={detail.progress} fileResult={fileResult} onOpen={onOpen} withSteps={plan === undefined} mapable={detail.plan?.kind === 'plan' && detail.state !== 'Done'} />}
            <PlainSection title={FILES_HEADING}>
                <ul className="detail-files">
                    {detail.files.map((file) => (
                        <li key={`${file.label}|${file.open.key}`}>
                            <span className="file-label">{file.label}</span>{' '}
                            <FileLink target={file.open} fileResult={fileResult} onOpen={onOpen}>
                                <PathText path={file.name} />
                            </FileLink>
                        </li>
                    ))}
                </ul>
            </PlainSection>
            <FormatNotes key={detail.key} notes={detail.notes} renderNote={(note) => <Reason line={note} fileResult={fileResult} onOpen={onOpen} />} />
            <History history={detail.history} now={now} />
            <span className="visually-hidden detail-open-status" role="status" aria-live="polite" aria-atomic="true">
                {fileResult === undefined ? '' : fileResult.text}
            </span>
        </>
    );
}

export function SpecDetail(props: {
    detail: SpecDetailView;
    fileResult: FileResult | undefined;
    copyResult: { ok: boolean; text: string } | undefined;
    sendResult: SendResultEventPayload | undefined;
    onOpen: OpenAt;
    onCopy(text: string): void;
    onSend(request: SendPromptPayload): void;
    onClose?: () => void;
    back?: DetailAreaId;
    fallback?: () => void;
    onOpenMap?: () => void;
}) {
    const { detail } = props;
    return (
        <DetailFrame as="div" labelled={false} onClose={props.onClose} fallback={props.fallback}>
            <Picture key={detail.key} detail={detail} fileResult={props.fileResult} copyResult={props.copyResult} sendResult={props.sendResult} onOpen={props.onOpen} onCopy={props.onCopy} onSend={props.onSend} onClose={props.onClose} back={props.back} onOpenMap={props.onOpenMap} />
        </DetailFrame>
    );
}
