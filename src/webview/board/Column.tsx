import { STATE_RULES, type BoardColumn, type BoardView, type CardView } from '../../shared/protocol/board';
import { STATE_LOOK } from '../../shared/protocol/stateLook';
import { columnRuleTooltip, DONE_HIDE_LABEL, DONE_SHOW_LABEL, hiddenByFilterText, narrowColumnText, withProblemCount } from '../../shared/protocol/texts';
import type { CopyResult } from '../ui/CopyButton';
import { Card } from './Card';
import { BadgeIcon, StateIcon } from './icons';

export function Column(props: {
    column: BoardColumn;
    onOpen(card: CardView, opener: HTMLElement): void;
    isSelected?(card: CardView): boolean;
    tabIndexOf?(card: CardView): number;
    copyResult: CopyResult | undefined;
    onCopy(line: string): void;
    doneToggle?: BoardView['doneToggle'];
    onToggleDone?(expanded: boolean): void;
}) {
    const { column } = props;
    const rule = STATE_RULES[column.state];
    const ruleText = rule === undefined ? undefined : columnRuleTooltip(rule);
    const narrowName = column.narrow === undefined ? undefined : withProblemCount(narrowColumnText(column.state, column.narrow, column.narrow === 'filtered' ? column.hidden : column.count), column.problems);
    const strandedProblem = column.narrow !== undefined && (column.problems ?? 0) > 0;
    const toggle = column.state === 'Done' ? props.doneToggle : undefined;
    const heading = (
        <>
            <StateIcon state={column.state} /> <span className="column-name">{column.state}</span> <span className="column-count">{column.count}</span>
            {strandedProblem ? (
                <span className="column-problem">
                    <BadgeIcon kind="diagnostic" />
                </span>
            ) : null}
        </>
    );
    const title = narrowName === undefined ? undefined : ruleText === undefined ? narrowName : `${narrowName} · ${ruleText}`;
    return (
        <section
            className="column"
            data-column={column.state}
            {...(column.narrow === undefined ? {} : { 'data-narrow': column.narrow })}
            aria-label={narrowName ?? column.state}
            {...(title === undefined ? {} : { title })}
            data-board-state={column.state}
            data-tint={STATE_LOOK[column.state].colour}
        >
            <h2 className="column-heading" {...(column.narrow === undefined && ruleText !== undefined ? { title: ruleText } : {})}>
                {toggle === undefined ? (
                    heading
                ) : (
                    <button type="button" className="done-toggle" data-done-toggle aria-expanded={toggle === 'hide'} aria-label={toggle === 'hide' ? DONE_HIDE_LABEL : DONE_SHOW_LABEL} onClick={() => props.onToggleDone?.(toggle === 'show')}>
                        {heading}
                    </button>
                )}
            </h2>
            {column.narrow !== undefined ? null : (
                <>
                    {column.hidden > 0 ? <p className="column-hidden">{hiddenByFilterText(column.hidden)}</p> : null}
                    <ul className="column-cards">
                        {column.cards.map((card) => (
                            <Card
                                key={card.key}
                                card={card}
                                onOpen={props.onOpen}
                                selected={props.isSelected?.(card) === true}
                                copyResult={props.copyResult}
                                onCopy={props.onCopy}
                                {...(props.tabIndexOf === undefined ? {} : { tabIndex: props.tabIndexOf(card), copyTabIndex: props.tabIndexOf(card) })}
                            />
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
}
