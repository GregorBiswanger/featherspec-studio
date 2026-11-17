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
        expect(readEnvelope({ v: 2, kind: 'evt', type: 'shell', payload: {} }).ok).toBe(true);
        expect(PROTOCOL_VERSION).toBe(1);
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

    it('navigate: an area with no target, or with a spec, run or board-filter target (PD-040)', () => {
        expect(isNavigationRequest({ area: 'missionControl' })).toBe(true);
        expect(isNavigationRequest({ area: 'specExplorer', target: { kind: 'spec', stem: '0003-x' } })).toBe(true);
        expect(isNavigationRequest({ area: 'specExplorer', target: { kind: 'spec', stem: '0003-x', path: 'a/b.md' } })).toBe(true);
        expect(isNavigationRequest({ area: 'agentCenter', target: { kind: 'run', id: 'r1' } })).toBe(true);
        expect(isNavigationRequest({ area: 'specBoard', target: { kind: 'boardFilter', filter: { states: ['Active'] } } })).toBe(true);
        expect(isNavigationRequest({ area: 'nowhere' })).toBe(false);
        expect(isNavigationRequest({ area: 'specBoard', target: { kind: 'spec' } })).toBe(false);
        expect(isNavigationRequest({ area: 'specBoard', target: { kind: 'spec', stem: '' } })).toBe(false);
        expect(isNavigationRequest({ area: 'specBoard', target: { kind: 'run' } })).toBe(false);
        expect(isNavigationRequest({ area: 'specBoard', target: { kind: 'boardFilter', filter: undefined } })).toBe(false);
        expect(isNavigationRequest({ area: 'specBoard', target: { kind: 'other' } })).toBe(false);
        expect(isNavigationTarget('spec')).toBe(false);
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

describe('areas', () => {
    it('lists the four areas in order; all four have content in this version', () => {
        expect(AREAS.map((area) => area.title)).toEqual(['Mission Control', 'Spec Board', 'Spec Explorer', 'Agent Center']);
        expect(AREAS.filter((area) => !area.placeholder).map((area) => area.id)).toEqual(['missionControl', 'specBoard', 'specExplorer', 'agentCenter']);
        expect(AREA_IDS.every(isAreaId)).toBe(true);
        expect(isAreaId('settings')).toBe(false);
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

describe('0015 AC-026: the Mission Control purpose and the Restricted Mode note', () => {
    it('read as the product texts of the spec', () => {
        expect(AREAS.find((area) => area.id === 'missionControl')?.purpose).toBe('See the project at a glance: spec counts, progress, what needs attention and recent activity.');
        expect(RESTRICTED_TEXT).toBe('This workspace is in Restricted Mode. Setting up FeatherSpec needs a trusted workspace.');
    });
});
