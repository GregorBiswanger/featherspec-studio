import type { DragEvent, ReactNode } from 'react';
import type { CardView, Progress } from '../../shared/protocol/board';
import {
    cardRunText,
    CRITERIA_PROGRESS_LABEL,
    criteriaText,
    DEPRECATED_MARKER,
    DERIVED_SENTENCES,
    diagnosticsBadgeText,
    lastChangeText,
    NO_SUMMARY_TEXT,
    TASKS_PROGRESS_LABEL,
    tasksText,
} from '../../shared/protocol/texts';
import { ProgressBar } from '../ui/ProgressBar';
import { RuleText } from '../ui/RuleText';
import { StateChip } from '../ui/StateChip';
import { BadgeIcon, Glyph } from './icons';

function Figure(props: { label: string; progress: Progress | undefined; text: string }) {
    return props.progress === undefined ? <div className="progress progress-na">{props.text}</div> : <ProgressBar label={props.label} done={props.progress.done} total={props.progress.total} text={props.text} />;
}

export function Card(props: {
    card: CardView;
    onOpen(card: CardView): void;
    tabIndex?: number;
    dragging?: boolean;
    onDragStart?(event: DragEvent<HTMLElement>, card: CardView): void;
    onDragEnd?(): void;
    menu?: ReactNode;
}) {
    const { card } = props;
    return (
        <li
            className="card"
            data-card={card.key}
            data-board-state={card.state}
            tabIndex={props.tabIndex ?? 0}
            draggable={props.onDragStart !== undefined}
            data-dragging={props.dragging === true ? 'true' : undefined}
            onDragStart={(event) => props.onDragStart?.(event, card)}
            onDragEnd={() => props.onDragEnd?.()}
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
            <div className="card-state">
                <span className="marker state-marker">
                    <StateChip state={card.state} />
                </span>
                {card.derivedRule === undefined ? null : (
                    <span className="marker card-secondary" data-marker="derived">
                        <BadgeIcon kind="derived" /> <RuleText text={DERIVED_SENTENCES[card.derivedRule]} id={card.derivedRule} />
                    </span>
                )}
                {card.deprecated ? (
                    <span className="marker card-secondary" data-marker="deprecated">
                        <BadgeIcon kind="deprecated" /> {DEPRECATED_MARKER}
                    </span>
                ) : null}
            </div>
            {card.path === undefined ? null : <div className="card-path">{card.path}</div>}
            <p className="card-summary">{card.summary ?? NO_SUMMARY_TEXT}</p>
            {card.blocked.map((line) => (
                <div key={line} className="card-blocked">
                    <Glyph kind="Blocked" />
                    {line}
                </div>
            ))}
            {card.readiness === undefined ? null : (
                <div className="card-readiness">
                    <RuleText text={card.readiness.reason} id={card.readiness.id} />
                </div>
            )}
            <div className="card-figures">
                <Figure label={TASKS_PROGRESS_LABEL} progress={card.tasks} text={tasksText(card.tasks)} />
                <Figure label={CRITERIA_PROGRESS_LABEL} progress={card.criteria} text={criteriaText(card.criteria)} />
            </div>
            <div className="card-foot">
                {card.diagnostics > 0 ? (
                    <span className="marker card-diagnostics" data-marker="diagnostics">
                        <BadgeIcon kind="diagnostic" /> {diagnosticsBadgeText(card.diagnostics)}
                    </span>
                ) : null}
                <span className="card-run">{cardRunText(card.run)}</span>
                <span className="card-change">{lastChangeText(card.lastChangeMs)}</span>
            </div>
            {props.menu}
        </li>
    );
}
