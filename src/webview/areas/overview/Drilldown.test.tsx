import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../../shared/protocol/envelope';
import { isNavigationRequest } from '../../../shared/protocol/messages';
import type { OverviewView } from '../../../shared/protocol/overview';
import { sampleView } from '../../../shared/protocol/testing/overviewSample';
import { App } from '../../App';
import { createClient, type ShellClient } from '../../client';
import { baseView, click, isKeyboardReachable, overviewEvent, mount, pressKey, send, shellEvent, type Mounted } from '../../testing/dom';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

function drillView(): OverviewView {
    const view = sampleView();
    view.attention = {
        rows: [
            { spec: { stem: '0001-a', number: '0001', title: 'A', found: true }, reasons: ['Blocked'] },
            { spec: { stem: '0004-dup', number: '0004', title: 'D', path: '.specs/active/0004-dup.md', found: true }, reasons: ['Review pending'] },
            { spec: { stem: '0004-dup', number: '0004', title: 'D', path: '.specs/done/0004-dup.md', found: true }, reasons: ['Problem'] },
        ],
    };
    return view;
}

async function open(view: OverviewView): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'overview' }), 1));
    await send(overviewEvent(view));
    return mounted.container;
}

function drill(container: HTMLElement, id: string): HTMLButtonElement {
    const found = container.querySelector<HTMLButtonElement>(`[data-drill="${id}"]`);
    if (found === null) {
        throw new Error(`no drill-down element ${id}`);
    }
    return found;
}

async function clickAndReturn(container: HTMLElement, id: string): Promise<void> {
    const before = posted.length;
    await click(drill(container, id));
    const request = posted.slice(before).find((message) => message.type === 'navigate');
    if (request?.id !== undefined) {
        await send({ v: 2, kind: 'res', id: request.id, type: 'navigate', payload: { ok: true } });
    }
}

function sent(): { type: string; payload: unknown }[] {
    return posted.filter((message) => message.type === 'navigate' || message.type === 'runAction').map((message) => ({ type: message.type, payload: message.payload }));
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('AC-012: the total, a state count and Needs attention', () => {
    it('the total sends the Board without a target', async () => {
        await click(drill(await open(drillView()), 'total'));
        expect(sent()).toEqual([{ type: 'navigate', payload: { area: 'board' } }]);
    });

    it('a state count sends the Board filtered to that state, once', async () => {
        await click(drill(await open(drillView()), 'state:Done'));
        expect(sent()).toEqual([{ type: 'navigate', payload: { area: 'board', target: { kind: 'boardFilter', filter: { states: ['Done'] } } } }]);
    });

    it('OP-9: a count that reads 0 sends its request like any other count', async () => {
        await click(drill(await open(drillView()), 'state:Ready'));
        expect(sent()).toEqual([{ type: 'navigate', payload: { area: 'board', target: { kind: 'boardFilter', filter: { states: ['Ready'] } } } }]);
    });

    it('the Needs attention heading sends the named set "Needs attention" with the stems of exactly the listed rows, a duplicated stem once', async () => {
        await click(drill(await open(drillView()), 'attention'));
        expect(sent()).toEqual([
            { type: 'navigate', payload: { area: 'board', target: { kind: 'boardFilter', filter: { set: { label: 'Needs attention', stems: ['0001-a', '0004-dup'] } } } } },
        ]);
    });
});

describe('0015 AC-010: no drill-down for runs', () => {
    it('the view holds no run drill-down, and every request it can send names one of the three areas', async () => {
        const container = await open(drillView());
        const ids = [...container.querySelectorAll('[data-drill]')].map((button) => button.getAttribute('data-drill') ?? '');
        expect(ids.some((id) => id === 'running' || id.startsWith('run:'))).toBe(false);
        for (const id of ids) {
            await clickAndReturn(container, id);
        }
        const areas = sent().map((message) => (message.payload as { area: string }).area);
        expect(areas.length).toBeGreaterThan(5);
        expect(areas.every((area) => ['overview', 'board', 'specExplorer'].includes(area))).toBe(true);
    });
});

describe('AC-014: attention rows and activity entries', () => {
    it('an attention row sends Spec Explorer with that spec; a row of a duplicated stem carries its path', async () => {
        const container = await open(drillView());
        await clickAndReturn(container, 'row:0');
        await clickAndReturn(container, 'row:1');
        expect(sent()).toEqual([
            { type: 'navigate', payload: { area: 'specExplorer', target: { kind: 'spec', stem: '0001-a' } } },
            { type: 'navigate', payload: { area: 'specExplorer', target: { kind: 'spec', stem: '0004-dup', path: '.specs/active/0004-dup.md' } } },
        ]);
    });

    it('an activity entry of a current spec sends Spec Explorer with that spec', async () => {
        await click(drill(await open(drillView()), 'activity:0'));
        expect(sent()).toEqual([{ type: 'navigate', payload: { area: 'specExplorer', target: { kind: 'spec', stem: '0001-a' } } }]);
    });

    it('an activity entry of a vanished stem sends no request and shows "Spec 0009 is no longer in the project"; Dismiss removes it', async () => {
        const container = await open(drillView());
        await click(drill(container, 'activity:1'));
        expect(sent()).toEqual([]);
        const notice = container.querySelector('[data-ov-notice]');
        expect(notice?.textContent).toContain('Spec 0009 is no longer in the project');
        expect(notice?.getAttribute('role')).toBe('status');
        await click(notice!.querySelector('button')!);
        expect(container.querySelector('[data-ov-notice]')).toBeNull();
        expect(sent()).toEqual([]);
    });
});

describe('AC-017: the diagnostics count', () => {
    it('AC-008: sends one request for the Board with the named set "Problems" and the stems that carry a Problem, and no runAction', async () => {
        await click(drill(await open(drillView()), 'problems'));
        expect(sent()).toEqual([
            { type: 'navigate', payload: { area: 'board', target: { kind: 'boardFilter', filter: { set: { label: 'Problems', stems: ['0002-x'] } } } } },
        ]);
        expect(posted.some((message) => message.type === 'runAction')).toBe(false);
    });

    it('AC-008: Problems at project level only open the Board without a filter, where its banner lists them', async () => {
        const view = drillView();
        view.header.problems = 1;
        view.header.problemStems = [];
        await click(drill(await open(view), 'problems'));
        expect(sent()).toEqual([{ type: 'navigate', payload: { area: 'board' } }]);
    });

    it('AC-008: while no Problem exists the header shows no problem element at all', async () => {
        const view = drillView();
        view.header.problems = 0;
        view.header.problemStems = [];
        const container = await open(view);
        expect(container.querySelector('[data-drill="problems"]')).toBeNull();
        expect(container.querySelector('[data-header]')!.textContent).not.toMatch(/problem|diagnostic/i);
    });
});

describe('every request is one the shell accepts', () => {
    it('all payloads pass the shared navigation guard', async () => {
        const container = await open(drillView());
        const ids = [...container.querySelectorAll('[data-drill]')].map((element) => element.getAttribute('data-drill')!);
        for (const id of ids) {
            if (id !== 'activity:1') {
                await clickAndReturn(container, id);
            }
        }
        const requests = posted.filter((message) => message.type === 'navigate');
        expect(requests.length).toBeGreaterThan(10);
        for (const request of requests) {
            expect(isNavigationRequest(request.payload)).toBe(true);
        }
    });
});

describe('AC-022: keyboard', () => {
    it('every drill-down element is a native enabled button in the tab order, in the order of the layout', async () => {
        const container = await open(drillView());
        const buttons = [...container.querySelectorAll<HTMLButtonElement>('[data-drill]')];
        expect(buttons.map((button) => button.getAttribute('data-drill'))).toEqual([
            'problems',
            'total',
            'state:Backlog',
            'state:Ready',
            'state:Active',
            'state:Review',
            'state:Done',
            'state:Blocked',
            'attention',
            'row:0',
            'row:1',
            'row:2',
            'activity:0',
            'activity:1',
        ]);
        for (const button of buttons) {
            expect(button.tagName).toBe('BUTTON');
            expect(button.getAttribute('type')).toBe('button');
            expect(button.hasAttribute('tabindex') && button.tabIndex < 0).toBe(false);
            expect(isKeyboardReachable(button)).toBe(true);
        }
    });

    it('Enter and Space activate a drill-down element and send its request', async () => {
        const container = await open(drillView());
        await pressKey(drill(container, 'total'), 'Enter');
        await send({ v: 2, kind: 'res', id: posted.find((message) => message.type === 'navigate')!.id, type: 'navigate', payload: { ok: true } });
        await pressKey(drill(container, 'state:Done'), ' ');
        expect(sent().map((message) => message.payload)).toEqual([
            { area: 'board' },
            { area: 'board', target: { kind: 'boardFilter', filter: { states: ['Done'] } } },
        ]);
    });
});

describe('OP-9: a value that is "not available" cannot be activated', () => {
    it('with the activity and the progress not available the view holds no control for them', async () => {
        const view = drillView();
        view.activity = { available: false, reason: 'disk is full' };
        if (view.specs.kind === 'counts') {
            view.specs.progress = { kind: 'not available' };
        }
        const container = await open(view);
        const ids = [...container.querySelectorAll('[data-drill]')].map((button) => button.getAttribute('data-drill'));
        expect(ids.some((id) => id?.startsWith('activity:'))).toBe(false);
        expect(container.querySelector('[data-progress] button')).toBeNull();
        expect(ids).toContain('total');
    });
});
