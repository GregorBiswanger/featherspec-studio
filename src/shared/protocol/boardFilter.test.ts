import { describe, expect, it } from 'vitest';
import { isBoardFilter, isFilterSet } from './boardFilter';
import { isBoardView, isCardView, isSortKey } from './board';
import {
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
                'boardSetDone',
                'boardSetSort',
                'clearSelection',
                'copyText',
                'dismissNotice',
                'hello',
                'navigate',
                'openFile',
                'overviewSetActivity',
                'resetSideWidth',
                'runAction',
                'select',
                'setSideWidth',
            ].sort(),
        );
    });

    it('guards accept the payloads the webview sends and reject the rest', () => {
        expect(Object.keys(REQUEST_GUARDS)).not.toContain('boardSetFilter');
        expect(REQUEST_GUARDS.boardSetDone({ expanded: true })).toBe(true);
        expect(REQUEST_GUARDS.boardSetDone({ expanded: 'yes' })).toBe(false);
        expect(REQUEST_GUARDS.boardSetDone({ expanded: true, extra: 1 })).toBe(false);
        expect(REQUEST_GUARDS.boardSetDone({})).toBe(false);
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
            key: 'k', stem: '0001-a', number: '0001', title: 'A', titleIsStem: false, path: undefined, state: 'Active', deprecated: false,
            problems: 0, blocked: [], need: undefined, summary: undefined, tasks: { done: 1, total: 2 }, criteria: undefined, lastChange: { day: '2026-11-16', source: 'plan' },
        };
        expect(isCardView(card)).toBe(true);
        expect(isCardView({ ...card, state: 'Doing' })).toBe(false);
        expect(isCardView({ ...card, need: { text: 'needs a plan', rule: 'R-3' } })).toBe(true);
        expect(isCardView({ ...card, lastChange: { day: '16.11.2026', source: 'plan' } })).toBe(false);
        expect(isCardView({ ...card, lastChange: { day: '2026-11-16', source: 'git' } })).toBe(false);
        expect(isCardView({ ...card, lastChange: 5 })).toBe(false);
        expect(isCardView({ ...card, need: 'needs a plan' })).toBe(false);
        expect(isCardView({ ...card, need: { text: 'x' } })).toBe(false);
        const view = { columns: [{ state: 'Active', cards: [card], hidden: 0, emptyBeforeFilter: false, count: 1 }], banner: { problems: [{ where: 'project', reason: 'x' }], notes: [] }, filter: {}, sort: 'number', sortKeys: ['number', 'title'], noSpecs: false, planSpecs: [] };
        expect(isBoardView(view)).toBe(true);
        expect(isBoardView({ ...view, columns: [{ ...view.columns[0], narrow: 'empty' }] })).toBe(true);
        expect(isBoardView({ ...view, columns: [{ ...view.columns[0], narrow: 'wide' }] })).toBe(false);
        expect(isBoardView({ ...view, columns: [{ state: 'Active', cards: [], hidden: 0, emptyBeforeFilter: false }] })).toBe(false);
        expect(isBoardView({ ...view, columns: [{ ...view.columns[0], narrow: 'collapsed', problems: 2 }] })).toBe(true);
        expect(isBoardView({ ...view, columns: [{ ...view.columns[0], narrow: 'collapsed', problems: '2' }] })).toBe(false);
        expect(isBoardView({ ...view, doneToggle: 'show' })).toBe(true);
        expect(isBoardView({ ...view, doneToggle: 'open' })).toBe(false);
        expect(isBoardView({ ...view, sortKeys: [] })).toBe(false);
        expect(isBoardView({ ...view, sortKeys: ['lastChange'] })).toBe(false);
        expect(isBoardView({ ...view, sortKeys: ['number', 'priority'] })).toBe(false);
        expect(isBoardView({ ...view, sort: 'priority' })).toBe(false);
        expect(isBoardView({ ...view, banner: [{ where: 'project', reason: 'x' }] })).toBe(false);
        expect(isBoardView({ ...view, banner: { problems: [], notes: [{ where: 'project' }] } })).toBe(false);
        expect(isBoardView({ ...view, filter: { states: ['x'] } })).toBe(false);
    });
});
