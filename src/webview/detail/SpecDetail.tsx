import { useEffect, useRef } from 'react';
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
import { FormatNotes } from '../ui/FormatNotes';
import { InlineText } from '../ui/InlineText';
import { StateChip } from '../ui/StateChip';
import { CloseButton } from './CloseButton';
import { DetailFrame } from './DetailFrame';
import { DetailSection, PlainSection } from './DetailSection';
import { takePendingHeadingFocus } from './focus';
import { identityKeys } from './identityKeys';
import { NextStep } from './NextStep';
import { Progress } from './Progress';

type OpenAt = (key: string, line?: number) => void;

function stateTooltip(detail: SpecDetailView): string {
    return detail.persistence === 'derived' && isDerivedRule(detail.rule) ? columnRuleTooltip(detail.rule) : persistedTooltip(detail.rule);
}

function Header(props: { detail: SpecDetailView; onClose: (() => void) | undefined; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
    const { detail } = props;
    const tooltip = stateTooltip(detail);
    return (
        <>
            <div className="detail-title">
                <span className="detail-number">{detail.number}</span>
                <h2 ref={props.headingRef} tabIndex={-1} data-detail-heading data-detail-stem={detail.stem}>
                    <span className="sr-number">{detail.number} </span>
                    {detail.title}
                </h2>
                {isBoardState(detail.state) ? <StateChip state={detail.state} tooltip={tooltip} /> : <span title={tooltip}>{detail.state}</span>}
                {detail.persistence === 'derived' && isDerivedRule(detail.rule) ? <span className="visually-hidden">{DERIVED_SENTENCES[detail.rule]}</span> : null}
                {detail.successor === undefined ? null : <span className="detail-flag">{DEPRECATED_MARKER}</span>}
                {props.onClose === undefined ? null : <CloseButton onClose={props.onClose} />}
            </div>
            {detail.path === undefined ? null : <p className="detail-path">{detail.path}</p>}
            {detail.successor === undefined ? null : <p className="detail-successor">{detail.successor}</p>}
        </>
    );
}

function Reason(props: { line: DiagnosticLine; fileResult: FileResult | undefined; onOpen: OpenAt }) {
    const { line } = props;
    return line.open === undefined ? (
        <InlineText text={line.reason} />
    ) : (
        <FileLink target={line.open} fileResult={props.fileResult} onOpen={props.onOpen}>
            <InlineText text={line.reason} />
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

function Picture(props: { detail: SpecDetailView; fileResult: FileResult | undefined; copyResult: { ok: boolean; text: string } | undefined; onOpen: OpenAt; onCopy(text: string): void; onClose: (() => void) | undefined }) {
    const { detail, fileResult, onOpen } = props;
    const now = new Date();
    const headingRef = useRef<HTMLHeadingElement>(null);
    const problemKeys = identityKeys(detail.problems, (line) => `${line.reason}|${line.open?.key ?? ''}|${line.open?.line ?? ''}`);
    useEffect(() => {
        if (takePendingHeadingFocus(detail.stem)) {
            headingRef.current?.focus();
        }
    }, [detail.stem]);
    return (
        <>
            <Header detail={detail} onClose={props.onClose} headingRef={headingRef} />
            <NextStep nextStep={detail.nextStep} copyResult={props.copyResult} onCopy={props.onCopy} />
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
            {detail.progress === undefined ? null : <Progress progress={detail.progress} fileResult={fileResult} onOpen={onOpen} />}
            <PlainSection title={FILES_HEADING}>
                <ul className="detail-files">
                    {detail.files.map((file) => (
                        <li key={`${file.label}|${file.open.key}`}>
                            <span className="file-label">{file.label}</span>{' '}
                            <FileLink target={file.open} fileResult={fileResult} onOpen={onOpen}>
                                {file.name}
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
    onOpen: OpenAt;
    onCopy(text: string): void;
    onClose?: () => void;
    fallback?: () => void;
}) {
    const { detail } = props;
    return (
        <DetailFrame as="div" labelled={false} onClose={props.onClose} fallback={props.fallback}>
            <Picture key={detail.key} detail={detail} fileResult={props.fileResult} copyResult={props.copyResult} onOpen={props.onOpen} onCopy={props.onCopy} onClose={props.onClose} />
        </DetailFrame>
    );
}
