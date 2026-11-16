import type { DragEvent, ReactNode } from 'react';
import type { BoardColumn, CardView } from '../../shared/protocol/board';
import { COLUMN_HINTS, hiddenByFilterText } from '../../shared/protocol/texts';
import { Card } from './Card';
import { StateIcon } from './icons';

export function Column(props: {
    column: BoardColumn;
    onOpen(card: CardView): void;
    tabIndexOf?(card: CardView): number;
    draggingKey?: string | undefined;
    onDragStart?(event: DragEvent<HTMLElement>, card: CardView): void;
    onDragEnd?(): void;
    onDragOver?(event: DragEvent<HTMLElement>, column: BoardColumn): void;
    onDrop?(event: DragEvent<HTMLElement>, column: BoardColumn): void;
    menuOf?(card: CardView): ReactNode;
}) {
    const { column } = props;
    return (
        <section
            className="column"
            data-column={column.state}
            aria-label={column.state}
            onDragOver={(event) => props.onDragOver?.(event, column)}
            onDrop={(event) => props.onDrop?.(event, column)}
        >
            <h2 className="column-heading">
                <StateIcon state={column.state} /> {column.state} <span className="column-count">{column.cards.length}</span>
            </h2>
            {column.hidden > 0 ? <p className="column-hidden">{hiddenByFilterText(column.hidden)}</p> : null}
            {column.emptyBeforeFilter ? <p className="column-hint">{COLUMN_HINTS[column.state]}</p> : null}
            <ul className="column-cards">
                {column.cards.map((card) => (
                    <Card
                        key={card.key}
                        card={card}
                        onOpen={props.onOpen}
                        dragging={props.draggingKey === card.key}
                        {...(props.tabIndexOf === undefined ? {} : { tabIndex: props.tabIndexOf(card) })}
                        {...(props.onDragStart === undefined ? {} : { onDragStart: props.onDragStart })}
                        {...(props.onDragEnd === undefined ? {} : { onDragEnd: props.onDragEnd })}
                        {...(props.menuOf === undefined ? {} : { menu: props.menuOf(card) })}
                    />
                ))}
            </ul>
        </section>
    );
}
