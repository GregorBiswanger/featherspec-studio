import type { DetailSections, DetailView, OpenTarget } from '../../shared/protocol/detail';
import {
    criteriaText,
    DEPRECATED_MARKER,
    DERIVED_SENTENCES,
    derivedTooltip,
    persistedTooltip,
    BANNER_HEADING,
    DETAIL_LABEL,
    historyEntryText,
    historyTooltip,
    HISTORY_NOT_AVAILABLE_TEXT,
    NO_DETAIL_SELECTION_TEXT,
    NO_PLAN_TEXT,
    NO_REQUIREMENTS_TEXT,
    NO_RELATED_TEXT,
    OPEN_FILE_LABEL,
    needTooltip,
    SECTION_TITLES,
    STATE_LABEL,
    STRUCK_FLAG,
    UNCERTAIN_FLAG,
} from '../../shared/protocol/texts';
import { Glyph } from '../board/icons';
import { InlineText } from '../ui/InlineText';
import { splitCells, tidy } from '../ui/inlineFormat';
import { isBoardState } from '../../shared/protocol/boardFilter';
import { isDerivedRule } from '../../shared/protocol/board';
import { EmptyState } from '../ui/EmptyState';
import { RuleText } from '../ui/RuleText';
import { FormatNotes } from '../ui/FormatNotes';
import { StateChip } from '../ui/StateChip';
import { DetailSection, OpenButton } from './DetailSection';
import { NextStep } from './NextStep';

type OpenFile = (key: string) => void;

function tickText(ticked: boolean | 'undetermined'): string {
    if (ticked === 'undetermined') {
        return 'undetermined';
    }
    return ticked ? 'done' : 'open';
}

function TickIcon(props: { ticked: boolean | 'undetermined' }) {
    return <Glyph kind={props.ticked === 'undetermined' ? 'undetermined' : props.ticked ? 'ticked' : 'unticked'} />;
}

function Quote(props: { text: string }) {
    const tidied = tidy(props.text);
    return tidied.quote ? (
        <blockquote className="illustration">
            <InlineText text={tidied.text} />
        </blockquote>
    ) : (
        <div className="illustration">
            <InlineText text={tidied.text} />
        </div>
    );
}

function keysOf(targets: (OpenTarget | undefined)[]): string[] {
    return targets.flatMap((target) => (target === undefined ? [] : [target.key]));
}

function Sections(props: { detailKey: string; sections: DetailSections; fileResult: { key: string; text: string } | undefined; onOpen: OpenFile }) {
    const { sections, fileResult, onOpen } = props;
    const { overview, requirements, criteria, plan, verification, related, history } = sections;
    const now = new Date();
    return (
        <>
            <DetailSection title={SECTION_TITLES.overview} open={overview.open} keys={keysOf(overview.notes.map((line) => line.open))} fileResult={fileResult} onOpen={onOpen}>
                <div className="detail-grid">
                <dl className="detail-header">
                    {overview.headerLines.map((line) => (
                        <div key={line.label}>
                            <dt>{line.label}</dt> <dd>
                                <InlineText text={line.value} />
                            </dd>
                        </div>
                    ))}
                </dl>
                <dl className="detail-facts">
                    <div>
                        <dt>{STATE_LABEL}</dt>{' '}
                        <dd className="detail-state">
                            {isBoardState(overview.state) ? (
                                <StateChip state={overview.state} tooltip={overview.persistence === 'persisted' ? persistedTooltip(overview.rule) : undefined} />
                            ) : (
                                <span title={overview.persistence === 'persisted' ? persistedTooltip(overview.rule) : undefined}>{overview.state}</span>
                            )}{' '}
                            {overview.persistence === 'derived' && isDerivedRule(overview.rule) ? (
                                <RuleText text={DERIVED_SENTENCES[overview.rule]} tooltip={derivedTooltip(overview.rule)} />
                            ) : null}
                            {overview.deprecated ? <span className="detail-flag"> · {DEPRECATED_MARKER}</span> : null}
                        </dd>
                    </div>
                </dl>
                </div>
                {overview.successor === undefined ? null : <p>{overview.successor}</p>}
                {overview.needs.length === 0 ? null : (
                    <ul className="detail-needs">
                        {overview.needs.map((need) => (
                            <li key={need.rule} title={needTooltip(need.rule)}>
                                {need.text}
                            </li>
                        ))}
                    </ul>
                )}
                <FormatNotes key={props.detailKey} notes={overview.notes} />
            </DetailSection>
            <DetailSection title={SECTION_TITLES.requirements} open={requirements.open} keys={keysOf(requirements.items.map((item) => item.open))} fileResult={fileResult} onOpen={onOpen}>
                {requirements.items.length === 0 ? (
                    <p>{NO_REQUIREMENTS_TEXT}</p>
                ) : (
                    <ul>
                        {requirements.items.map((item) => {
                            const cells = splitCells(tidy(item.text, { id: item.id, listItem: true }).text);
                            return (
                            <li key={item.id}>
                                <strong className="item-id">{item.id}</strong> <InlineText text={cells.primary} />
                                {cells.secondary === undefined ? null : (
                                    <span className="item-secondary">
                                        {' '}
                                        <InlineText text={cells.secondary} />
                                    </span>
                                )}
                            </li>
                            );
                        })}
                    </ul>
                )}
            </DetailSection>
            <DetailSection title={SECTION_TITLES.criteria} open={criteria.open} keys={keysOf(criteria.items.map((item) => item.open))} fileResult={fileResult} onOpen={onOpen}>
                <ul>
                    {criteria.items.map((item) => (
                        <li key={item.id}>
                            <strong className="item-id">{item.id}</strong> <InlineText text={tidy(item.text, { id: item.id, listItem: true }).text} />
                            {item.uncertain ? <span className="flag"> {UNCERTAIN_FLAG}</span> : null}
                            {item.struck ? <span className="flag"> {STRUCK_FLAG}</span> : null}
                            {item.illustration === undefined ? null : <Quote text={item.illustration} />}
                        </li>
                    ))}
                </ul>
            </DetailSection>
            <DetailSection title={SECTION_TITLES.plan} open={plan.open} keys={[]} fileResult={fileResult} onOpen={onOpen}>
                {plan.open === undefined ? (
                    <p>{NO_PLAN_TEXT}</p>
                ) : (
                    <>
                        {plan.stages.length === 0 ? null : (
                            <ol className="detail-stages">
                                {plan.stages.map((stage) => (
                                    <li key={stage}>
                                        <InlineText text={stage} />
                                    </li>
                                ))}
                            </ol>
                        )}
                        <ul className="detail-steps">
                            {plan.steps.map((step) => (
                                <li key={step.id}>
                                    <span className="step-head">
                                        <span className="step-tick" data-ticked={String(step.ticked)}>
                                            <TickIcon ticked={step.ticked} />
                                            <span className="step-tick-label">{tickText(step.ticked)}</span>
                                        </span>{' '}
                                        <strong className="item-id">{step.id}</strong> <InlineText text={tidy(step.title, { id: step.id }).text} />
                                        {step.struck ? ` · ${STRUCK_FLAG}` : ''}
                                    </span>
                                    {step.verified === undefined ? null : (
                                        <span className="step-verified">
                                            {' · '}
                                            <InlineText text={step.verified} />
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </DetailSection>
            <DetailSection title={SECTION_TITLES.verification} open={verification.open} keys={[]} fileResult={fileResult} onOpen={onOpen}>
                <p>
                    <InlineText text={verification.summary} />
                </p>
                <p>
                    open {verification.openRows} · built {verification.built} · verified {verification.verified} · other {verification.other}
                </p>
                <p>{criteriaText(verification.criteria)}</p>
            </DetailSection>
            <DetailSection title={SECTION_TITLES.related} keys={keysOf(related.map((item) => item.open))} fileResult={fileResult} onOpen={onOpen}>
                {related.length === 0 ? (
                    <p>{NO_RELATED_TEXT}</p>
                ) : (
                    <ul>
                        {related.map((item) => (
                            <li key={item.open.key}>
                                <button type="button" className="related-link" aria-label={`${OPEN_FILE_LABEL}: ${item.label}`} onClick={() => onOpen(item.open.key)}>
                                    {item.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </DetailSection>
            <DetailSection title={SECTION_TITLES.history} keys={[]} fileResult={fileResult} onOpen={onOpen}>
                {history.statusHistory === undefined ? (
                    <p>{history.notAvailable ?? HISTORY_NOT_AVAILABLE_TEXT}</p>
                ) : (
                    <>
                        <p>{history.label}</p>
                        <ul className="detail-history">
                            {history.statusHistory.map((item, index) => (
                                <li key={`${index}|${item.observedAt}`} title={historyTooltip(item)}>
                                    {historyEntryText(item, now)}
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </DetailSection>
        </>
    );
}

export function SpecDetail(props: {
    detail: DetailView | undefined;
    fileResult: { key: string; text: string } | undefined;
    copyResult: { ok: boolean; text: string } | undefined;
    onOpen: OpenFile;
    onCopy(text: string): void;
}) {
    const { detail } = props;
    if (detail === undefined || detail.kind === 'none') {
        return (
            <section className="spec-detail" aria-label={DETAIL_LABEL}>
                <EmptyState icon="info">{NO_DETAIL_SELECTION_TEXT}</EmptyState>
            </section>
        );
    }
    return (
        <section className="spec-detail" aria-label={DETAIL_LABEL}>
            <div className="detail-title">
                <span className="detail-number">{detail.number}</span>
                <h2>
                    <span className="sr-number">{detail.number} </span>
                    {detail.title}
                </h2>
                {isBoardState(detail.sections.overview.state) ? <StateChip state={detail.sections.overview.state} /> : null}
                <OpenButton target={detail.sections.overview.open} onOpen={props.onOpen} label={detail.number} />
            </div>
            <NextStep nextStep={detail.nextStep} copyResult={props.copyResult} onCopy={props.onCopy} />
            {detail.problems.length === 0 ? null : (
                <ul className="detail-problems" aria-label={BANNER_HEADING}>
                    {detail.problems.map((line, index) => (
                        <li key={`${index}|${line.reason}`}>
                            <Glyph kind="diagnostic" />
                            <span>
                                <InlineText text={line.reason} />
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            <Sections detailKey={detail.key} sections={detail.sections} fileResult={props.fileResult} onOpen={props.onOpen} />
        </section>
    );
}
