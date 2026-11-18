import type { CardView } from '../../shared/protocol/board';
import {
    cardName,
    cardTooltip,
    criteriaShortText,
    DEPRECATED_MARKER,
    lastChangeTooltip,
    needTooltip,
    problemsBadgeText,
    STEPS_PROGRESS_LABEL,
    stepsText,
} from '../../shared/protocol/texts';
import { ProgressBar } from '../ui/ProgressBar';
import { CopyButton, type CopyResult } from '../ui/CopyButton';
import { StepText } from '../ui/StepText';
import { BadgeIcon, Glyph } from './icons';

type StateKind = 'need' | 'blocked' | 'deprecated' | 'figures';

function stateKind(card: CardView): StateKind | undefined {
    if (card.state === 'Backlog' && card.need !== undefined) {
        return 'need';
    }
    if (card.state === 'Blocked' && card.blocked.length > 0) {
        return 'blocked';
    }
    if (card.deprecated) {
        return 'deprecated';
    }
    return card.tasks === undefined && card.criteria === undefined ? undefined : 'figures';
}

function StatePart(props: { card: CardView; kind: StateKind }) {
    const { card, kind } = props;
    switch (kind) {
        case 'need':
            return (
                <span className="card-need" title={card.need === undefined ? undefined : needTooltip(card.need.rule)}>
                    {card.need?.text}
                </span>
            );
        case 'blocked':
            return (
                <>
                    {card.blocked.map((line) => (
                        <span key={line} className="card-blocked">
                            <Glyph kind="Blocked" />
                            {line}
                        </span>
                    ))}
                </>
            );
        case 'deprecated':
            return (
                <span className="marker card-secondary" data-marker="deprecated">
                    <BadgeIcon kind="deprecated" /> {DEPRECATED_MARKER}
                </span>
            );
        case 'figures':
            return (
                <span className="card-figures">
                    {card.tasks === undefined ? null : <ProgressBar label={STEPS_PROGRESS_LABEL} done={card.tasks.done} total={card.tasks.total} text={stepsText(card.tasks)} />}
                    {card.tasks !== undefined && card.criteria !== undefined ? <span aria-hidden="true">·</span> : null}
                    {card.criteria === undefined ? null : <span className="card-criteria">{criteriaShortText(card.criteria)}</span>}
                </span>
            );
    }
}

export function Card(props: {
    card: CardView;
    onOpen(card: CardView): void;
    tabIndex?: number;
    copyResult: CopyResult | undefined;
    onCopy(line: string): void;
    copyTabIndex?: number;
}) {
    const { card } = props;
    const detailId = `card-detail-${card.key}`;
    const kind = stateKind(card);
    const hasDetail = card.problems > 0 || card.lastChange !== undefined || kind !== undefined;
    return (
        <li
            className="card"
            data-card={card.key}
            data-board-state={card.state}
            tabIndex={props.tabIndex ?? 0}
            title={cardTooltip(card)}
            aria-label={cardName(card)}
            {...(hasDetail ? { 'aria-describedby': detailId } : {})}
            onClick={() => props.onOpen(card)}
            onKeyDown={(event) => {
                if (!event.defaultPrevented && event.key === 'Enter' && event.target === event.currentTarget) {
                    event.preventDefault();
                    props.onOpen(card);
                }
            }}
        >
            <div className="card-head">
                <span className="card-number">{card.number}</span> <span className="card-title">{card.title}</span>
            </div>
            {card.path === undefined ? null : <div className="card-path">{card.path}</div>}
            {hasDetail ? (
                <div className="card-state" id={detailId}>
                    {card.problems > 0 ? (
                        <span className="marker card-problems" data-marker="problems">
                            <BadgeIcon kind="diagnostic" /> {problemsBadgeText(card.problems)}
                        </span>
                    ) : null}
                    {kind === undefined ? null : <StatePart card={card} kind={kind} />}
                    {card.lastChange === undefined ? null : (
                        <span className="card-change" title={lastChangeTooltip(card.lastChange)}>
                            {card.lastChange.day}
                        </span>
                    )}
                </div>
            ) : null}
            {card.step === undefined ? null : (
                <div className="card-step" onClick={(event) => event.stopPropagation()}>
                    <StepText step={card.step} />
                    <CopyButton line={card.step.line} copyResult={props.copyResult} onCopy={props.onCopy} {...(props.copyTabIndex === undefined ? {} : { tabIndex: props.copyTabIndex })} />
                </div>
            )}
        </li>
    );
}
