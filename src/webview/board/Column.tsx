import type { BoardColumn, CardView } from '../../shared/protocol/board';
import { COLUMN_HINTS, hiddenByFilterText } from '../../shared/protocol/texts';
import { Card } from './Card';
import { StateIcon } from './icons';

export function Column(props: {
    column: BoardColumn;
    onOpen(card: CardView): void;
    tabIndexOf?(card: CardView): number;
}) {
    const { column } = props;
    return (
        <section
            className="column"
            data-column={column.state}
            aria-label={column.state}
            data-board-state={column.state}
        >
            <h2 className="column-heading">
                <StateIcon state={column.state} /> <span className="column-name">{column.state}</span> <span className="column-count">{column.cards.length}</span>
            </h2>
            {column.hidden > 0 ? <p className="column-hidden">{hiddenByFilterText(column.hidden)}</p> : null}
            {column.emptyBeforeFilter ? <p className="column-hint">{COLUMN_HINTS[column.state]}</p> : null}
            <ul className="column-cards">
                {column.cards.map((card) => (
                    <Card
                        key={card.key}
                        card={card}
                        onOpen={props.onOpen}
                        {...(props.tabIndexOf === undefined ? {} : { tabIndex: props.tabIndexOf(card) })}
                    />
                ))}
            </ul>
        </section>
    );
}
