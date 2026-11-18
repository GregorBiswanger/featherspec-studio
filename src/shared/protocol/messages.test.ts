import { describe, expect, it } from 'vitest';
import { AREAS, AREA_IDS, isAreaId } from './areas';
import { RESTRICTED_TEXT } from './texts';
import { PROTOCOL_VERSION, isJsonValue, readEnvelope } from './envelope';
import {
    isHelloPayload,
    isNavigationRequest,
    isNavigationTarget,
    isPanelState,
    isRequestType,
    isRunActionPayload,
    isSelectPayload,
    isShellEventPayload,
    isShellView,
    REQUEST_GUARDS,
    isCopyResultEventPayload,
    type ShellView,
} from './messages';

const view: ShellView = {
    state: undefined,
    restricted: false,
    projectName: 'demo',
    area: 'specExplorer',
    target: undefined,
    selection: { stem: '0003-x', number: '0003' },
    notice: undefined,
    rows: [
        { stem: '0003-x', path: '.specs/active/0003-x.md', number: '0003', title: undefined, state: 'Active', derivedRule: undefined, showPath: false, selected: true },
    ],
};

describe('AC-016, AC-021: envelope', () => {
    it('reads a well-formed envelope and keeps id and seq', () => {
        const read = readEnvelope({ v: 1, kind: 'req', id: 'a1', seq: 3, type: 'hello', payload: { lastSeq: 0 } });
        expect(read).toEqual({ ok: true, envelope: { v: 1, kind: 'req', id: 'a1', seq: 3, type: 'hello', payload: { lastSeq: 0 } } });
    });

    it.each([
        ['null', null],
        ['a string', 'hello'],
        ['an array', []],
        ['no version', { kind: 'req', type: 'hello' }],
        ['a fractional version', { v: 1.5, kind: 'req', type: 'hello' }],
        ['an unknown kind', { v: 1, kind: 'cmd', type: 'hello' }],
        ['a missing type', { v: 1, kind: 'req' }],
        ['an empty type', { v: 1, kind: 'req', type: '' }],
        ['a numeric id', { v: 1, kind: 'req', type: 'hello', id: 4 }],
        ['a fractional seq', { v: 1, kind: 'req', type: 'hello', seq: 1.5 }],
    ])('rejects %s', (_name, raw) => {
        expect(readEnvelope(raw)).toEqual({ ok: false, reason: 'not a message' });
    });

    it('reads an envelope of another version (the router decides, AC-016)', () => {
        expect(readEnvelope({ v: 4, kind: 'evt', type: 'shell', payload: {} }).ok).toBe(true);
        expect(PROTOCOL_VERSION).toBe(3);
    });

    it('isJsonValue accepts nested JSON and rejects functions, undefined and NaN', () => {
        expect(isJsonValue({ a: [1, 'x', null, { b: true }] })).toBe(true);
        expect(isJsonValue({ a: undefined })).toBe(false);
        expect(isJsonValue(() => 1)).toBe(false);
        expect(isJsonValue(Number.NaN)).toBe(false);
    });
});

describe('AC-021: request guards accept and reject', () => {
    it('hello', () => {
        expect(isHelloPayload({ lastSeq: 0 })).toBe(true);
        expect(isHelloPayload({ lastSeq: 7 })).toBe(true);
        expect(isHelloPayload({ lastSeq: -1 })).toBe(false);
        expect(isHelloPayload({ lastSeq: '0' })).toBe(false);
        expect(isHelloPayload({})).toBe(false);
        expect(isHelloPayload(undefined)).toBe(false);
    });

    it('navigate: an area with no target, or with a spec or board-filter target (PD-040)', () => {
        expect(isNavigationRequest({ area: 'overview' })).toBe(true);
        expect(isNavigationRequest({ area: 'specExplorer', target: { kind: 'spec', stem: '0003-x' } })).toBe(true);
        expect(isNavigationRequest({ area: 'specExplorer', target: { kind: 'spec', stem: '0003-x', path: 'a/b.md' } })).toBe(true);
        expect(isNavigationRequest({ area: 'board', target: { kind: 'boardFilter', filter: { states: ['Active'] } } })).toBe(true);
        expect(isNavigationRequest({ area: 'nowhere' })).toBe(false);
        expect(isNavigationRequest({ area: 'board', target: { kind: 'spec' } })).toBe(false);
        expect(isNavigationRequest({ area: 'board', target: { kind: 'spec', stem: '' } })).toBe(false);
        expect(isNavigationRequest({ area: 'board', target: { kind: 'run' } })).toBe(false);
        expect(isNavigationRequest({ area: 'board', target: { kind: 'boardFilter', filter: undefined } })).toBe(false);
        expect(isNavigationRequest({ area: 'board', target: { kind: 'other' } })).toBe(false);
        expect(isNavigationTarget('spec')).toBe(false);
    });

    it('0019 AC-003: clearSelection has an empty-payload guard, the guard of select stays strict', () => {
        expect(REQUEST_GUARDS.clearSelection({})).toBe(true);
        expect(REQUEST_GUARDS.clearSelection(undefined)).toBe(true);
        expect(REQUEST_GUARDS.clearSelection({ stem: '0003-x' })).toBe(false);
        expect(REQUEST_GUARDS.clearSelection('')).toBe(false);
        expect(REQUEST_GUARDS.select({})).toBe(false);
    });

    it('select, runAction and dismissNotice', () => {
        expect(isSelectPayload({ stem: '0003-x' })).toBe(true);
        expect(isSelectPayload({ stem: '0003-x', path: 'p' })).toBe(true);
        expect(isSelectPayload({ stem: '' })).toBe(false);
        expect(isSelectPayload({ stem: 4 })).toBe(false);
        expect(isRunActionPayload({ action: 'reload' })).toBe(true);
        expect(isRunActionPayload({ action: 'format-disk' })).toBe(false);
        expect(REQUEST_GUARDS.dismissNotice({})).toBe(true);
        expect(REQUEST_GUARDS.dismissNotice(undefined)).toBe(true);
        expect(REQUEST_GUARDS.dismissNotice({ extra: 1 })).toBe(false);
    });

    it('knows exactly the five request types', () => {
        for (const type of ['hello', 'navigate', 'select', 'runAction', 'dismissNotice']) {
            expect(isRequestType(type)).toBe(true);
        }
        for (const type of ['shell', 'toString', '__proto__', 'constructor', '']) {
            expect(isRequestType(type)).toBe(false);
        }
    });
});

describe('host messages: guards accept and reject', () => {
    it('accepts a complete shell view and rejects broken ones', () => {
        expect(isShellView(view)).toBe(true);
        expect(isShellEventPayload({ view })).toBe(true);
        expect(isShellEventPayload({})).toBe(false);
        expect(isShellView({ ...view, area: 'x' })).toBe(false);
        expect(isShellView({ ...view, rows: [{ stem: 1 }] })).toBe(false);
        expect(isShellView({ ...view, rows: [{ ...view.rows[0], derivedRule: 'S-READY' }] })).toBe(true);
        expect(isShellView({ ...view, rows: [{ ...view.rows[0], derivedRule: 'Derived (rule S-READY)' }] })).toBe(false);
        expect(isShellView({ ...view, restricted: 'no' })).toBe(false);
        expect(isShellView({ ...view, state: { id: 'S42' } })).toBe(false);
        expect(isShellView({ ...view, notice: { number: 3 } })).toBe(false);
        expect(isShellView({ ...view, selection: { stem: '0003-x' } })).toBe(false);
    });

    it('accepts every panel state with its data and rejects missing data', () => {
        for (const id of ['S1', 'S2', 'S3', 'S4', 'S6']) {
            expect(isPanelState({ id })).toBe(true);
        }
        expect(isPanelState({ id: 'S5', reason: { cause: 'discovery', message: 'x' } })).toBe(true);
        expect(isPanelState({ id: 'S5', reason: { cause: 'listing', folder: '.specs/active', reason: 'denied' } })).toBe(true);
        expect(isPanelState({ id: 'S5', reason: { cause: 'protocol' } })).toBe(true);
        expect(isPanelState({ id: 'S5', reason: { cause: 'other' } })).toBe(false);
        expect(isPanelState({ id: 'S5' })).toBe(false);
        expect(isPanelState({ id: 'S8', name: 'demo', canSelect: true })).toBe(true);
        expect(isPanelState({ id: 'S8', name: 'demo' })).toBe(false);
        expect(isPanelState({ id: 'S9', folders: [{ folder: 'a', markers: ['.specs/ directory'] }] })).toBe(true);
        expect(isPanelState({ id: 'S9', folders: [{ folder: 'a', markers: [1] }] })).toBe(false);
        expect(isPanelState({ id: 'S9', folders: [{ folder: 'a', markers: [], setupPending: true }] })).toBe(true);
        expect(isPanelState({ id: 'S9', folders: [{ folder: 'a', markers: [], setupPending: false }] })).toBe(false);
        expect(isPanelState({ id: 'S9', folders: [{ folder: 'a', markers: [], setupPending: 'yes' }] })).toBe(false);
        expect(isPanelState({ id: 'S7' })).toBe(false);
    });
});

describe('0015 AC-005, AC-009: copy request and result', () => {
    it('copyText takes one non-empty text and nothing else', () => {
        expect(REQUEST_GUARDS.copyText({ text: '/sdd-plan .specs/active/0001-a.md' })).toBe(true);
        expect(REQUEST_GUARDS.copyText({ text: '' })).toBe(false);
        expect(REQUEST_GUARDS.copyText({ text: 4 })).toBe(false);
        expect(REQUEST_GUARDS.copyText({ text: 'a', extra: 1 })).toBe(false);
        expect(REQUEST_GUARDS.copyText({})).toBe(false);
    });

    it('copyResult carries the outcome and its text', () => {
        expect(isCopyResultEventPayload({ ok: true, text: 'Copied to the clipboard.' })).toBe(true);
        expect(isCopyResultEventPayload({ ok: false, text: 'Could not copy to the clipboard.' })).toBe(true);
        expect(isCopyResultEventPayload({ ok: 'yes', text: 'x' })).toBe(false);
        expect(isCopyResultEventPayload({ ok: true })).toBe(false);
        expect(isCopyResultEventPayload(undefined)).toBe(false);
    });
});

describe('0018 AC-010: the request overviewSetActivity', () => {
    it('is a known request with a boolean open and nothing else', () => {
        expect(isRequestType('overviewSetActivity')).toBe(true);
        expect(REQUEST_GUARDS.overviewSetActivity({ open: true })).toBe(true);
        expect(REQUEST_GUARDS.overviewSetActivity({ open: false })).toBe(true);
        expect(REQUEST_GUARDS.overviewSetActivity({ open: 'yes' })).toBe(false);
        expect(REQUEST_GUARDS.overviewSetActivity({})).toBe(false);
        expect(REQUEST_GUARDS.overviewSetActivity({ open: true, extra: 1 })).toBe(false);
        expect(REQUEST_GUARDS.overviewSetActivity(undefined)).toBe(false);
    });
});

describe('0015 AC-026: the Overview purpose and the Restricted Mode note', () => {
    it('read as the product texts of the spec', () => {
        expect(AREAS.find((area) => area.id === 'overview')?.purpose).toBe('See what is in progress, what comes next and what needs fixing.');
        expect(RESTRICTED_TEXT).toBe('This workspace is in Restricted Mode. Setting up FeatherSpec needs a trusted workspace.');
    });
});

describe('0015 AC-001, AC-002: three areas', () => {
    it('lists exactly Overview, Board and Spec Explorer, in this order', () => {
        expect(AREAS.map((area) => area.title)).toEqual(['Overview', 'Board', 'Spec Explorer']);
        expect(AREA_IDS).toEqual(['overview', 'board', 'specExplorer']);
    });

    it('0018 AC-001: missionControl and specBoard are no area and no navigation request', () => {
        for (const old of ['missionControl', 'specBoard']) {
            expect(isAreaId(old)).toBe(false);
            expect(isNavigationRequest({ area: old })).toBe(false);
            expect(isShellView({ ...view, area: old })).toBe(false);
        }
    });

    it('agentCenter is no area, no navigation target area and no shell view area', () => {
        expect(isAreaId('agentCenter')).toBe(false);
        expect(isNavigationRequest({ area: 'agentCenter' })).toBe(false);
        expect(isShellView({ ...view, area: 'agentCenter' })).toBe(false);
        expect(isNavigationRequest({ area: 'board' })).toBe(true);
    });

    it('there is no run navigation target', () => {
        expect(isNavigationTarget({ kind: 'run', id: 'r-1' })).toBe(false);
        expect(isNavigationTarget({ kind: 'spec', stem: '0001-a' })).toBe(true);
    });
});
