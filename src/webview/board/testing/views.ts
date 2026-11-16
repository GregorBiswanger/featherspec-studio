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
        derivedRule: undefined,
        deprecated: false,
        diagnostics: 0,
        blocked: [],
        readiness: undefined,
        summary: 'A summary.',
        tasks: { done: 3, total: 7 },
        criteria: { done: 1, total: 4 },
        lastChangeMs: Date.UTC(2026, 10, 16, 9, 30),
        run: { kind: 'none' },
        ...overrides,
    };
}

export function boardView(cards: CardView[], overrides: Partial<BoardView> = {}): BoardView {
    const columns: BoardColumn[] = BOARD_STATES.map((state) => {
        const own = cards.filter((entry) => entry.state === state);
        return { state, cards: own, hidden: 0, emptyBeforeFilter: own.length === 0 };
    });
    return { columns, banner: [], filter: {}, sort: 'number', providers: [], noSpecs: cards.length === 0, ...overrides };
}

export function boardEvent(view: BoardView): Envelope {
    return { v: PROTOCOL_VERSION, kind: 'evt', type: 'board', payload: { view } };
}
