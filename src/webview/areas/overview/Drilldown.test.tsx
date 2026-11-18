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

function row(stem: string, number: string, state: OverviewView['now'][number]['state'], path?: string, problems = 0): OverviewView['now'][number] {
    return { spec: { stem, number, title: stem.slice(5), ...(path === undefined ? {} : { path }), found: true }, state, status: state, problems };
}

function drillView(): OverviewView {
    const view = sampleView();
    view.now = [row('0001-a', '0001', 'Blocked'), row('0004-dup', '0004', 'Review', '.specs/active/0004-dup.md')];
    view.upNext = { rows: [row('0003-c', '0003', 'Ready')], more: 2, stems: ['0003-c', '0005-e', '0006-f'] };
    if (view.activity.available) {
        view.activity = { ...view.activity, open: true };
    }
    view.problems = { rows: [row('0002-x', '0002', 'Backlog', undefined, 1), row('0004-dup', '0004', 'Done', '.specs/done/0004-dup.md', 1), row('0004-dup', '0004', 'Review', '.specs/active/0004-dup.md', 1)], lines: [{ where: 'project', reason: 'orphan' }] };
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
        await send({ v: 3, kind: 'res', id: request.id, type: 'navigate', payload: { ok: true } });
    }
}

function sent(): { type: string; payload: unknown }[] {
    return posted.filter((message) => message.type === 'navigate' || message.type === 'select' || message.type === 'runAction').map((message) => ({ type: message.type, payload: message.payload }));
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('AC-012: the total, a state count and the named sets', () => {
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

    it('0018 AC-005: "+ 2 more" sends the named set "Up next" with every stem of Up next', async () => {
        await click(drill(await open(drillView()), 'more'));
        expect(sent()).toEqual([
            { type: 'navigate', payload: { area: 'board', target: { kind: 'boardFilter', filter: { set: { label: 'Up next', stems: ['0003-c', '0005-e', '0006-f'] } } } } },
        ]);
    });

    it('0018 AC-007: the Problems heading sends the named set "Problems" with the stems of the listed spec rows, a duplicated stem once', async () => {
        await click(drill(await open(drillView()), 'problems'));
        expect(sent()).toEqual([
            { type: 'navigate', payload: { area: 'board', target: { kind: 'boardFilter', filter: { set: { label: 'Problems', stems: ['0002-x', '0004-dup'] } } } } },
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
        const areas = sent().filter((message) => message.type === 'navigate').map((message) => (message.payload as { area: string }).area);
        expect(areas.length).toBeGreaterThan(5);
        expect(areas.every((area) => ['overview', 'board', 'specExplorer'].includes(area))).toBe(true);
    });

    it('all payloads pass the shared navigation guard', async () => {
        const container = await open(drillView());
        const ids = [...container.querySelectorAll('[data-drill]')].map((element) => element.getAttribute('data-drill')!).filter((id) => id !== 'activity');
        for (const id of ids) {
            await clickAndReturn(container, id);
        }
        const requests = posted.filter((message) => message.type === 'navigate');
        expect(requests.length).toBeGreaterThan(5);
        for (const request of requests) {
            expect(isNavigationRequest(request.payload)).toBe(true);
        }
    });
});

describe('AC-014: rows and activity entries', () => {
    it('AC-001: a Now row sends select with that spec; a row of a duplicated stem carries its path', async () => {
        const container = await open(drillView());
        await clickAndReturn(container, 'row:now:0001-a');
        await clickAndReturn(container, 'row:now:0004-dup');
        expect(sent()).toEqual([
            { type: 'select', payload: { stem: '0001-a' } },
            { type: 'select', payload: { stem: '0004-dup', path: '.specs/active/0004-dup.md' } },
        ]);
    });

    it('AC-001: an activity entry of a current spec sends select with that spec', async () => {
        await click(drill(await open(drillView()), 'activity:0'));
        expect(sent()).toEqual([{ type: 'select', payload: { stem: '0001-a' } }]);
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

describe('AC-022: keyboard', () => {
    it('every drill-down element is a native enabled button in the tab order, in the order of the layout', async () => {
        const container = await open(drillView());
        const buttons = [...container.querySelectorAll<HTMLButtonElement>('[data-drill]')];
        expect(buttons.map((button) => button.getAttribute('data-drill'))).toEqual([
            'row:now:0001-a',
            'row:now:0004-dup',
            'row:upNext:0003-c',
            'more',
            'problems',
            'row:problems:0002-x',
            'row:problems:0004-dup',
            'row:problems:0004-dup',
            'total',
            'state:Backlog',
            'state:Ready',
            'state:Active',
            'state:Review',
            'state:Done',
            'state:Blocked',
            'activity',
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
        await send({ v: 3, kind: 'res', id: posted.find((message) => message.type === 'navigate')!.id, type: 'navigate', payload: { ok: true } });
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
        if (view.figures.kind === 'counts') {
            view.figures.progress = { kind: 'not available' };
        }
        const container = await open(view);
        const ids = [...container.querySelectorAll('[data-drill]')].map((button) => button.getAttribute('data-drill'));
        expect(ids.some((id) => id?.startsWith('activity:'))).toBe(false);
        expect(container.querySelector('[data-figures] [title^="Progress"]:not([data-drill="total"]):not([data-figures])')).toBeNull();
        expect(ids).toContain('total');
    });
});
