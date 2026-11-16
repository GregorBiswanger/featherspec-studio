import { describe, expect, it } from 'vitest';
import { SORT_KEYS } from '../../shared/protocol/board';
import { BOARD_STATES } from '../../shared/protocol/boardFilter';
import { LIFECYCLE_STATES } from '../lifecycle/model';
import { arrangeBoard } from './filters';
import { card } from './testing/cards';

function numbers(columns: ReturnType<typeof arrangeBoard>, state: string): string[] {
    return columns.find((column) => column.state === state)?.cards.map((entry) => entry.number) ?? [];
}

const NINE = [
    card('0001', { state: 'Backlog', run: { kind: 'none' } }),
    card('0002', { state: 'Ready', run: { kind: 'none' } }),
    card('0003', { state: 'Active', run: { kind: 'run', provider: 'copilot', status: 'Running' } }),
    card('0004', { state: 'Active', run: { kind: 'run', provider: 'fake', status: 'Completed' } }),
    card('0005', { state: 'Review', run: { kind: 'unreadable', provider: 'copilot' } }),
    card('0006', { state: 'Done', run: { kind: 'unavailable' } }),
    card('0007', { state: 'Done', run: { kind: 'none' } }),
    card('0008', { state: 'Blocked', run: { kind: 'run', provider: 'copilot', status: 'Failed' } }),
    card('0009', { state: 'Active', run: { kind: 'none' } }),
];

describe('board contract', () => {
    it('AC-002: the board states are exactly the six lifecycle states of 0003, in column order', () => {
        expect([...BOARD_STATES]).toEqual([...LIFECYCLE_STATES]);
    });

    it('AC-005: no sort key and no filter key names a priority', () => {
        expect([...SORT_KEYS]).toEqual(['number', 'title', 'lastChange']);
        expect(JSON.stringify([...SORT_KEYS])).not.toMatch(/priorit/i);
    });
});

describe('filters', () => {
    it('AC-022: with no filter every card is shown in the column of its state, six columns in order', () => {
        const columns = arrangeBoard(NINE, {}, 'number');
        expect(columns.map((column) => column.state)).toEqual([...BOARD_STATES]);
        expect(columns.flatMap((column) => column.cards)).toHaveLength(9);
        expect(columns.map((column) => column.hidden)).toEqual([0, 0, 0, 0, 0, 0]);
    });

    it('AC-022: a state filter and a provider filter combine with AND; several values of one filter combine with OR', () => {
        const states = arrangeBoard(NINE, { states: ['Active', 'Blocked'] }, 'number');
        expect(states.flatMap((column) => column.cards.map((entry) => entry.number))).toEqual(['0003', '0004', '0009', '0008']);
        const both = arrangeBoard(NINE, { states: ['Active', 'Blocked'], providers: ['copilot'] }, 'number');
        expect(both.flatMap((column) => column.cards.map((entry) => entry.number))).toEqual(['0003', '0008']);
    });

    it('AC-022: "No run" (null) matches a card with no run; a card whose runs are not available matches no provider value', () => {
        const none = arrangeBoard(NINE, { providers: [null] }, 'number');
        expect(none.flatMap((column) => column.cards.map((entry) => entry.number)).sort()).toEqual(['0001', '0002', '0007', '0009']);
        const everything = arrangeBoard(NINE, { providers: [null, 'copilot', 'fake'] }, 'number');
        expect(everything.flatMap((column) => column.cards.map((entry) => entry.number))).not.toContain('0006');
    });

    it('AC-022: a history-unreadable run still matches its provider', () => {
        const copilot = arrangeBoard(NINE, { providers: ['copilot'] }, 'number');
        expect(numbers(copilot, 'Review')).toEqual(['0005']);
    });

    it('AC-022: a named set shows exactly its stems; a stem not in the project matches no card', () => {
        const set = arrangeBoard(NINE, { set: { label: 'Needs attention', stems: ['0003-thing', '0008-thing', '0042-gone'] } }, 'number');
        expect(set.flatMap((column) => column.cards.map((entry) => entry.number))).toEqual(['0003', '0008']);
        const empty = arrangeBoard(NINE, { set: { label: 'Nothing', stems: ['0042-gone'] } }, 'number');
        expect(empty.flatMap((column) => column.cards)).toEqual([]);
    });

    it('AC-022: a set and a state filter combine with AND', () => {
        const columns = arrangeBoard(NINE, { states: ['Active'], set: { label: 'Needs attention', stems: ['0003-thing', '0008-thing'] } }, 'number');
        expect(columns.flatMap((column) => column.cards.map((entry) => entry.number))).toEqual(['0003']);
    });

    it('AC-012: a column shows how many of its cards the filter hides, and a column that never had cards has none to hide', () => {
        const columns = arrangeBoard(NINE, { providers: ['copilot'] }, 'number');
        expect(columns.map((column) => [column.state, column.cards.length, column.hidden])).toEqual([
            ['Backlog', 0, 1],
            ['Ready', 0, 1],
            ['Active', 1, 2],
            ['Review', 1, 0],
            ['Done', 0, 2],
            ['Blocked', 1, 0],
        ]);
        expect(columns.map((column) => column.emptyBeforeFilter)).toEqual([false, false, false, false, false, false]);
    });

    it('AC-021: a column with no card before filtering is marked, a column emptied by a filter is not', () => {
        const columns = arrangeBoard([card('0001', { state: 'Active' })], { states: ['Done'] }, 'number');
        expect(columns.map((column) => [column.state, column.emptyBeforeFilter, column.hidden])).toEqual([
            ['Backlog', true, 0],
            ['Ready', true, 0],
            ['Active', false, 1],
            ['Review', true, 0],
            ['Done', true, 0],
            ['Blocked', true, 0],
        ]);
    });

    it('AC-011: the inputs are left unchanged (frozen cards and filter)', () => {
        const frozen = NINE.map((entry) => Object.freeze({ ...entry, blocked: Object.freeze([...entry.blocked]) as string[] }));
        const filter = Object.freeze({ states: Object.freeze(['Active']) as unknown as ['Active'], set: Object.freeze({ label: 'x', stems: Object.freeze(['0003-thing']) as unknown as string[] }) });
        const before = JSON.stringify([frozen, filter]);
        expect(() => arrangeBoard(Object.freeze(frozen), filter, 'title')).not.toThrow();
        expect(JSON.stringify([frozen, filter])).toBe(before);
    });
});

describe('sorting', () => {
    const SET = [
        card('0003', { title: 'Mango', lastChangeMs: 300 }),
        card('0001', { title: 'cherry', lastChangeMs: 100 }),
        card('0002', { title: 'Banana', lastChangeMs: 200 }),
        card('0004', { title: '0004-thing', titleIsStem: true, lastChangeMs: undefined }),
        card('0010', { title: 'Apple', lastChangeMs: 200 }),
    ];

    it('AC-013: by number ascending is the order of the numbers, whatever the input order', () => {
        expect(numbers(arrangeBoard(SET, {}, 'number'), 'Active')).toEqual(['0001', '0002', '0003', '0004', '0010']);
    });

    it('AC-013: by title A-Z ignores case, and a card without a title (shown by its stem) comes last', () => {
        expect(numbers(arrangeBoard(SET, {}, 'title'), 'Active')).toEqual(['0010', '0002', '0001', '0003', '0004']);
    });

    it('AC-013: by last change newest first, ties by stem, a card without the value last', () => {
        expect(numbers(arrangeBoard(SET, {}, 'lastChange'), 'Active')).toEqual(['0003', '0002', '0010', '0001', '0004']);
    });

    it('AC-013: equal sort values are ordered by stem, then by path', () => {
        const twins = [
            card('0005', { stem: '0005-x', key: '.specs/backlog/0005-x.md', title: 'Same' }),
            card('0005', { stem: '0005-x', key: '.specs/active/0005-x.md', title: 'Same' }),
            card('0004', { stem: '0004-y', key: '.specs/active/0004-y.md', title: 'Same' }),
        ];
        const order = arrangeBoard(twins, {}, 'title')[2]!.cards.map((entry) => entry.key);
        expect(order).toEqual(['.specs/active/0004-y.md', '.specs/active/0005-x.md', '.specs/backlog/0005-x.md']);
    });

    it('AC-013: sorting applies inside each column, and the filter keeps its order', () => {
        const columns = arrangeBoard(NINE, { states: ['Active'] }, 'lastChange');
        expect(numbers(columns, 'Active')).toEqual(['0003', '0004', '0009']);
    });
});
