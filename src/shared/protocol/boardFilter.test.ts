import { describe, expect, it } from 'vitest';
import { isBoardFilter, isFilterSet } from './boardFilter';
import { isBoardView, isCardView, isSortKey } from './board';
import {
    isBoardSetFilterPayload,
    isNavigationRequest,
    isOpenFilePayload,
    REQUEST_GUARDS,
} from './messages';

describe('board filter encoding v1 (PD-041, shared with 0006)', () => {
    it.each([
        ['empty (no filter)', {}],
        ['one state', { states: ['Active'] }],
        ['states and a set', { states: ['Ready', 'Blocked'], set: { label: 'Needs attention', stems: ['0003-x', '0004-y'] } }],
        ['a set with no stem', { set: { label: 'Needs attention', stems: [] } }],
    ])('AC-022: accepts %s', (_name, value) => {
        expect(isBoardFilter(value)).toBe(true);
    });

    it.each([
        ['null', null],
        ['a string', 'Active'],
        ['an array', []],
        ['an unknown state', { states: ['Doing'] }],
        ['an empty state list', { states: [] }],
        ['a non-string state', { states: [3] }],
        ['a provider list (0015 AC-011)', { providers: ['some-agent'] }],
        ['a provider list with "No run" (0015 AC-011)', { states: ['Ready'], providers: [null] }],
        ['a set without label', { set: { stems: ['0003-x'] } }],
        ['a set with an empty label', { set: { label: '', stems: [] } }],
        ['a set with a non-string stem', { set: { label: 'x', stems: ['0003-x', 4] } }],
        ['a set with an extra key', { set: { label: 'x', stems: [], extra: 1 } }],
        ['an extra kind', { kind: 'state', state: 'Active' }],
        ['a priority', { priority: ['high'] }],
    ])('AC-022: rejects %s', (_name, value) => {
        expect(isBoardFilter(value)).toBe(false);
    });

    it('a filter is set exactly when one of its keys is present', () => {
        expect(isFilterSet({})).toBe(false);
        expect(isFilterSet({ states: ['Done'] })).toBe(true);
        expect(isBoardFilter({ providers: [null] })).toBe(false);
        expect(isBoardFilter({ states: ['Done'], providers: ['some-agent'] })).toBe(false);
        expect(isFilterSet({ set: { label: 'x', stems: [] } })).toBe(true);
    });

    it('AC-022: a navigation request carries a valid filter, and the whole request is rejected for an invalid one', () => {
        expect(isNavigationRequest({ area: 'board', target: { kind: 'boardFilter', filter: { states: ['Active'] } } })).toBe(true);
        expect(isNavigationRequest({ area: 'board', target: { kind: 'boardFilter', filter: { states: ['Nope'] } } })).toBe(false);
        expect(isNavigationRequest({ area: 'board', target: { kind: 'boardFilter', filter: 'Active' } })).toBe(false);
    });
});

describe('board requests', () => {
    it('every board request has a guard', () => {
        expect(Object.keys(REQUEST_GUARDS).sort()).toEqual(
            [
                'boardClearFilters',
                'boardSetFilter',
                'boardSetSort',
                'copyText',
                'dismissNotice',
                'hello',
                'navigate',
                'openFile',
                'overviewSetActivity',
                'runAction',
                'select',
            ].sort(),
        );
    });

    it('guards accept the payloads the webview sends and reject the rest', () => {
        expect(isBoardSetFilterPayload({ filter: {} })).toBe(true);
        expect(isBoardSetFilterPayload({ filter: { states: ['x'] } })).toBe(false);
        expect(REQUEST_GUARDS.boardSetSort({ sort: 'title' })).toBe(true);
        expect(REQUEST_GUARDS.boardSetSort({ sort: 'priority' })).toBe(false);
        expect(isOpenFilePayload({ key: 'k' })).toBe(true);
        expect(isOpenFilePayload({ key: 'k', line: 12 })).toBe(true);
        expect(isOpenFilePayload({ key: 'k', line: 0 })).toBe(false);
        expect(isOpenFilePayload({ key: 'k', line: 1.5 })).toBe(false);
        expect(REQUEST_GUARDS.boardClearFilters({})).toBe(true);
        expect(REQUEST_GUARDS.boardClearFilters({ x: 1 })).toBe(false);
    });

    it('sort keys are guarded', () => {
        expect(isSortKey('lastChange')).toBe(true);
        expect(isSortKey('priority')).toBe(false);
    });

    it('card and board views are guarded', () => {
        const card = {
            key: 'k', stem: '0001-a', number: '0001', title: 'A', titleIsStem: false, path: undefined, state: 'Active', derivedRule: undefined, deprecated: false,
            problems: 0, blocked: [], need: undefined, summary: undefined, tasks: { done: 1, total: 2 }, criteria: undefined, lastChangeMs: 5,
        };
        expect(isCardView(card)).toBe(true);
        expect(isCardView({ ...card, state: 'Doing' })).toBe(false);
        expect(isCardView({ ...card, derivedRule: 'S-REVIEW', need: { text: 'needs a plan', rule: 'R-3' } })).toBe(true);
        expect(isCardView({ ...card, derivedRule: 'Derived (rule S-REVIEW)' })).toBe(false);
        expect(isCardView({ ...card, need: 'needs a plan' })).toBe(false);
        expect(isCardView({ ...card, need: { text: 'x' } })).toBe(false);
        const view = { columns: [{ state: 'Active', cards: [card], hidden: 0, emptyBeforeFilter: false }], banner: { problems: [{ where: 'project', reason: 'x' }], notes: [] }, filter: {}, sort: 'number', noSpecs: false };
        expect(isBoardView(view)).toBe(true);
        expect(isBoardView({ ...view, sort: 'priority' })).toBe(false);
        expect(isBoardView({ ...view, banner: [{ where: 'project', reason: 'x' }] })).toBe(false);
        expect(isBoardView({ ...view, banner: { problems: [], notes: [{ where: 'project' }] } })).toBe(false);
        expect(isBoardView({ ...view, filter: { states: ['x'] } })).toBe(false);
    });
});
