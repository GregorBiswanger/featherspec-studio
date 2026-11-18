import { STATE_RULES, type BoardColumn, type CardView } from '../../shared/protocol/board';
import { columnRuleTooltip, hiddenByFilterText, narrowColumnText } from '../../shared/protocol/texts';
import type { CopyResult } from '../ui/CopyButton';
import { Card } from './Card';
import { StateIcon } from './icons';

export function Column(props: {
    column: BoardColumn;
    onOpen(card: CardView): void;
    tabIndexOf?(card: CardView): number;
    copyResult: CopyResult | undefined;
    onCopy(line: string): void;
}) {
    const { column } = props;
    const rule = STATE_RULES[column.state];
    const ruleText = rule === undefined ? undefined : columnRuleTooltip(rule);
    if (column.narrow !== undefined) {
        const name = narrowColumnText(column.state, column.narrow, column.count);
        return (
            <section
                className="column"
                data-column={column.state}
                data-narrow={column.narrow}
                aria-label={name}
                title={ruleText === undefined ? name : `${name} · ${ruleText}`}
                data-board-state={column.state}
            >
                <h2 className="column-heading">
                    <StateIcon state={column.state} /> <span className="column-name">{column.state}</span> <span className="column-count">{column.count}</span>
                </h2>
            </section>
        );
    }
    return (
        <section
            className="column"
            data-column={column.state}
            aria-label={column.state}
            data-board-state={column.state}
        >
            <h2 className="column-heading" {...(ruleText === undefined ? {} : { title: ruleText })}>
                <StateIcon state={column.state} /> <span className="column-name">{column.state}</span> <span className="column-count">{column.count}</span>
            </h2>
            {column.hidden > 0 ? <p className="column-hidden">{hiddenByFilterText(column.hidden)}</p> : null}
            <ul className="column-cards">
                {column.cards.map((card) => (
                    <Card
                        key={card.key}
                        card={card}
                        onOpen={props.onOpen}
                        copyResult={props.copyResult}
                        onCopy={props.onCopy}
                        {...(props.tabIndexOf === undefined ? {} : { tabIndex: props.tabIndexOf(card), copyTabIndex: props.tabIndexOf(card) })}
                    />
                ))}
            </ul>
        </section>
    );
}
