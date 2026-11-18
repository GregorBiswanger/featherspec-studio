import type { BoardColumn, CardView, SortKey } from '../../shared/protocol/board';
import { BOARD_STATES, isFilterSet, type BoardFilter } from '../../shared/protocol/boardFilter';

function matches(card: CardView, filter: BoardFilter): boolean {
    if (filter.states !== undefined && !filter.states.includes(card.state)) {
        return false;
    }
    return filter.set === undefined || filter.set.stems.includes(card.stem);
}

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function tieBreak(left: CardView, right: CardView): number {
    return compareText(left.stem, right.stem) || compareText(left.key, right.key);
}

function compareBy(sort: SortKey): (left: CardView, right: CardView) => number {
    switch (sort) {
        case 'number':
            return (left, right) => Number(left.number) - Number(right.number) || compareText(left.number, right.number) || tieBreak(left, right);
        case 'title':
            return (left, right) => {
                if (left.titleIsStem !== right.titleIsStem) {
                    return left.titleIsStem ? 1 : -1;
                }
                return left.title.localeCompare(right.title, 'en', { sensitivity: 'base' }) || tieBreak(left, right);
            };
        case 'lastChange':
            return (left, right) => {
                const leftDay = left.lastChange?.day;
                const rightDay = right.lastChange?.day;
                if (leftDay === undefined || rightDay === undefined) {
                    return leftDay === rightDay ? tieBreak(left, right) : leftDay === undefined ? 1 : -1;
                }
                return compareText(rightDay, leftDay) || tieBreak(left, right);
            };
    }
}

export function arrangeBoard(cards: readonly CardView[], filter: BoardFilter, sort: SortKey, doneExpanded = true): BoardColumn[] {
    const compare = compareBy(sort);
    return BOARD_STATES.map((state) => {
        const own = cards.filter((card) => card.state === state);
        const shown = own.filter((card) => matches(card, filter)).sort(compare);
        if (state === 'Done' && !doneExpanded && !isFilterSet(filter) && own.length > 0) {
            return { state, cards: [], hidden: 0, emptyBeforeFilter: false, count: own.length, narrow: 'collapsed' };
        }
        const column: BoardColumn = { state, cards: shown, hidden: own.length - shown.length, emptyBeforeFilter: own.length === 0, count: shown.length };
        if (shown.length > 0) {
            return column;
        }
        return own.length === 0 ? { ...column, narrow: 'empty' } : { ...column, count: own.length, narrow: 'filtered' };
    });
}
