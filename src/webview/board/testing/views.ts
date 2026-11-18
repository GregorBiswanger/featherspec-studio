import type { BoardColumn, BoardView, CardView } from '../../../shared/protocol/board';
import { BOARD_STATES } from '../../../shared/protocol/boardFilter';
import { PROTOCOL_VERSION, type Envelope } from '../../../shared/protocol/envelope';

export function card(number: string, overrides: Partial<CardView> = {}): CardView {
    return {
        key: `.specs/active/${number}-thing.md`,
        stem: `${number}-thing`,
        number,
        title: `Thing ${number}`,
        titleIsStem: false,
        path: undefined,
        state: 'Active',
        deprecated: false,
        problems: 0,
        blocked: [],
        need: undefined,
        step: undefined,
        summary: 'A summary.',
        tasks: { done: 3, total: 7 },
        criteria: { done: 1, total: 4 },
        lastChange: { day: '2026-11-16', source: 'file' },
        ...overrides,
    };
}

export function boardView(cards: CardView[], overrides: Partial<BoardView> = {}): BoardView {
    const columns: BoardColumn[] = BOARD_STATES.map((state) => {
        const own = cards.filter((entry) => entry.state === state);
        const column: BoardColumn = { state, cards: own, hidden: 0, emptyBeforeFilter: own.length === 0, count: own.length };
        return own.length === 0 ? { ...column, narrow: 'empty' } : column;
    });
    return { columns, banner: { problems: [], notes: [] }, filter: {}, sort: 'number', sortKeys: ['number', 'title', 'lastChange'], noSpecs: cards.length === 0, ...overrides };
}

export function boardEvent(view: BoardView): Envelope {
    return { v: PROTOCOL_VERSION, kind: 'evt', type: 'board', payload: { view } };
}
