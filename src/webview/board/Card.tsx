import type { KeyboardEvent } from 'react';
import type { CardView } from '../../shared/protocol/board';
import { cardRunText, criteriaText, DEPRECATED_MARKER, diagnosticsBadgeText, lastChangeText, NO_SUMMARY_TEXT, tasksText } from '../../shared/protocol/texts';
import { BadgeIcon, StateIcon } from './icons';

export function Card(props: { card: CardView; onOpen(card: CardView): void; tabIndex?: number; onKeyDown?(event: KeyboardEvent<HTMLElement>, card: CardView): void; onFocus?(card: CardView): void; onBlur?(card: CardView): void }) {
    const { card } = props;
    return (
        <li
            className="card"
            data-card={card.key}
            tabIndex={props.tabIndex ?? 0}
            onClick={() => props.onOpen(card)}
            onKeyDown={(event) => {
                props.onKeyDown?.(event, card);
                if (!event.defaultPrevented && event.key === 'Enter' && event.target === event.currentTarget) {
                    event.preventDefault();
                    props.onOpen(card);
                }
            }}
            onFocus={() => props.onFocus?.(card)}
            onBlur={() => props.onBlur?.(card)}
        >
            <div className="card-head">
                <span className="card-number">{card.number}</span> <span className="card-title">{card.title}</span>
            </div>
            <div className="card-markers">
                <span className="marker state-marker">
                    <StateIcon state={card.state} /> {card.state}
                </span>
                {card.derivedLabel === undefined ? null : (
                    <span className="marker" data-marker="derived">
                        <BadgeIcon kind="derived" /> {card.derivedLabel}
                    </span>
                )}
                {card.deprecated ? (
                    <span className="marker" data-marker="deprecated">
                        <BadgeIcon kind="deprecated" /> {DEPRECATED_MARKER}
                    </span>
                ) : null}
                {card.diagnostics > 0 ? (
                    <span className="marker" data-marker="diagnostics">
                        <BadgeIcon kind="diagnostic" /> {diagnosticsBadgeText(card.diagnostics)}
                    </span>
                ) : null}
            </div>
            {card.path === undefined ? null : <div className="card-path">{card.path}</div>}
            <p className="card-summary">{card.summary ?? NO_SUMMARY_TEXT}</p>
            {card.blocked.map((line) => (
                <div key={line} className="card-blocked">
                    {line}
                </div>
            ))}
            {card.readiness === undefined ? null : <div className="card-readiness">{card.readiness}</div>}
            <div className="card-figures">
                <span>{tasksText(card.tasks)}</span> <span>{criteriaText(card.criteria)}</span> <span>{lastChangeText(card.lastChangeMs)}</span>
            </div>
            <div className="card-run">{cardRunText(card.run)}</div>
        </li>
    );
}
