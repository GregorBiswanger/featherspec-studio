import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../../shared/protocol/envelope';
import { COPIED_TEXT } from '../../../shared/protocol/nextStepTexts';
import type { OverviewView } from '../../../shared/protocol/overview';
import { sampleView } from '../../../shared/protocol/testing/overviewSample';
import { App } from '../../App';
import { createClient, type ShellClient } from '../../client';
import { baseView, click, overviewEvent, mount, pressKey, send, shellEvent, type Mounted } from '../../testing/dom';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(view: OverviewView): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'overview' }), 1));
    await send(overviewEvent(view));
    return mounted.container;
}

function section(container: HTMLElement, name: 'activity'): HTMLElement {
    return container.querySelector<HTMLElement>(`[data-${name}]`)!;
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('0015 AC-010: no run section', () => {
    it('shows no run figure, no run section and no Agent runs heading, whatever the view holds', async () => {
        const container = await open(sampleView());
        expect(container.querySelector('[data-runs]')).toBeNull();
        expect(container.querySelector('[data-running]')).toBeNull();
        expect(container.textContent).not.toMatch(/Agent runs|Running \d|No failed or interrupted runs/);
        expect([...container.querySelectorAll('h2')].map((heading) => heading.textContent)).not.toContain('Agent runs');
    });
});

describe('AC-010, AC-011: recent activity', () => {
    it('shows time, number, title and the change of each entry in the order of the view, and no control that shows more', async () => {
        const view = sampleView();
        const activity = section(await open(view), 'activity');
        expect(activity.querySelector('h2')?.textContent).toBe('Recent activity');
        const rows = [...activity.querySelectorAll('[data-activity-entry]')].map((row) => row.textContent);
        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatch(/^(Today|Yesterday) \d{2}:\d{2} · 0001 A · Backlog → Ready$|^\d{4}-\d{2}-\d{2} \d{2}:\d{2} · 0001 A · Backlog → Ready$/);
        expect(rows[1]).toMatch(/· 0009-gone — spec not found · Done → no longer in the project$/);
        expect([...activity.querySelectorAll('button')].filter((button) => !button.hasAttribute('data-drill'))).toHaveLength(0);
        expect(activity.querySelectorAll('button')).toHaveLength(rows.length);
        expect(activity.textContent).not.toMatch(/\bmore\b/i);
    });

    it('names a change that happened while Studio was not running', async () => {
        const view = sampleView();
        view.activity = {
            available: true,
            entries: [{ at: '2026-11-16T09:00:00.000Z', spec: { stem: '0001-a', number: '0001', title: 'A', found: true }, change: { kind: 'state', old: 'Ready', new: 'Active', whileClosed: true } }],
        };
        expect(section(await open(view), 'activity').textContent).toContain('Ready → Active (changed while Studio was not running)');
    });

    it('an empty list keeps its heading and says so; "not available" shows the reason and no list', async () => {
        const view = sampleView();
        view.activity = { available: true, entries: [] };
        const empty = section(await open(view), 'activity');
        expect(empty.querySelector('h2')?.textContent).toBe('Recent activity');
        expect(empty.textContent).toContain('No recent activity.');
        const unavailable = sampleView();
        unavailable.activity = { available: false, reason: 'no store' };
        await send(overviewEvent(unavailable));
        const text = section(mounted!.container, 'activity').textContent!;
        expect(text).toContain('Recent activity not available: no store');
        expect(text).not.toContain('No recent activity');
    });
});

describe('AC-026: nothing beyond the contract reaches the DOM', () => {
    it('a view with an extra field is refused as a whole; the old view stays and the text is nowhere', async () => {
        const container = await open(sampleView());
        const poisoned = sampleView();
        (poisoned.problems as unknown as Record<string, unknown>).errorMessage = 'SECRET-1';
        await send(overviewEvent(poisoned));
        expect(container.textContent).not.toContain('SECRET');
        expect(container.querySelectorAll('[data-problems] [data-spec-row]')).toHaveLength(1);
    });
});

describe('0013 AC-007: empty panels', () => {
    it('AC-007: the empty Recent activity panel shows an icon and 0006\'s sentence', async () => {
        const view = sampleView();
        view.activity = { available: true, entries: [] };
        const empty = section(await open(view), 'activity').querySelector('.ov-empty');
        expect(empty?.textContent).toBe('No recent activity.');
        expect(empty?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('0015 §3.2 (0013): Activity stands alone in the panel row below the figures line', async () => {
        const container = await open(sampleView());
        const panels = container.querySelector('.ov-panels');
        expect([...(panels?.children ?? [])].map((child) => (child.hasAttribute('data-activity') ? 'activity' : 'other'))).toEqual(['activity']);
        const figures = container.querySelector('[data-figures]')!;
        expect(figures.compareDocumentPosition(panels!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
});

function rowFor(stem: string, number: string, title: string, state: OverviewView['now'][number]['state'], extra: Partial<OverviewView['now'][number]> = {}): OverviewView['now'][number] {
    return { spec: { stem, number, title, found: true }, state, status: state, problems: 0, ...extra };
}

const STEP_PLAN = { short: '/sdd-plan', line: '/sdd-plan .specs/active/0001-a.md', lines: [{ text: '/sdd-plan .specs/active/0001-a.md' }, { text: 'continue', label: 'Then, in the same chat, if nothing blocks:' }] };

function withRows(): OverviewView {
    const view = sampleView();
    view.now = [rowFor('0001-a', '0001', 'Alpha', 'Blocked', { step: STEP_PLAN }), rowFor('0002-b', '0002', 'Beta', 'Active', { problems: 2 })];
    view.upNext = { rows: [rowFor('0003-c', '0003', 'Gamma', 'Ready'), rowFor('0004-d', '0004', 'Delta', 'Backlog', { status: 'needs a plan' })], more: 3, stems: ['0003-c', '0004-d', '0005-e', '0006-f', '0007-g'] };
    return view;
}

function nowRow(container: HTMLElement, stem: string): HTMLElement {
    return container.querySelector<HTMLElement>(`[data-row-group="now"][data-spec-row="${stem}"]`)!;
}

describe('0018 AC-006: a spec row on one line', () => {
    it('shows number, title, status text, the next step and Copy, and no second step line', async () => {
        const container = await open(withRows());
        const row = nowRow(container, '0001-a');
        const drill = row.querySelector('.ov-row')!;
        expect(drill.querySelector('.ov-number')?.textContent).toBe('0001');
        expect(drill.querySelector('.ov-title')?.textContent).toBe('Alpha');
        expect(drill.querySelector('.ov-status')?.textContent).toBe('Blocked');
        expect(drill.querySelector('.step-label')?.textContent).toBe('Next');
        expect(drill.querySelector('.step-short')?.textContent).toBe('/sdd-plan');
        expect(row.querySelector('.next-step-copy')?.getAttribute('aria-label')).toBe('Copy: /sdd-plan .specs/active/0001-a.md');
        expect(drill.textContent).not.toContain('continue');
        expect(drill.querySelector('br')).toBeNull();
    });

    it('title and status carry their full text as tooltip, the step its full lines', async () => {
        const row = nowRow(await open(withRows()), '0001-a');
        expect(row.querySelector('.ov-title')?.getAttribute('title')).toBe('Alpha');
        expect(row.querySelector('.ov-status')?.getAttribute('title')).toBe('Blocked');
        expect(row.querySelector('.step-text')?.getAttribute('title')).toBe('/sdd-plan .specs/active/0001-a.md\nThen, in the same chat, if nothing blocks: continue');
    });

    it('shows the warning icon with the problem count as text only while the spec has a Problem', async () => {
        const container = await open(withRows());
        expect(nowRow(container, '0002-b').querySelector('.ov-problem')?.getAttribute('aria-label')).toBe('2 problems');
        expect(nowRow(container, '0002-b').querySelector('.ov-problem')?.getAttribute('title')).toBe('2 problems');
        expect(nowRow(container, '0001-a').querySelector('.ov-problem')).toBeNull();
    });

    it('a row whose spec has no step shows no "Next" and no Copy; it has the one row button only', async () => {
        const row = nowRow(await open(withRows()), '0002-b');
        expect(row.querySelector('.step-text, .copy-button')).toBeNull();
        expect(row.querySelectorAll('button')).toHaveLength(1);
    });

    it('Copy sits outside the row button, is the next Tab stop after it, and posts copyText only', async () => {
        const container = await open(withRows());
        const row = nowRow(container, '0001-a');
        const copy = row.querySelector<HTMLButtonElement>('.next-step-copy')!;
        expect(row.querySelector('.ov-row')?.contains(copy)).toBe(false);
        expect(row.querySelector('.ov-row')?.nextElementSibling).toBe(copy);
        await click(copy);
        await pressKey(copy, 'Enter');
        await pressKey(copy, ' ');
        const sent = posted.filter((message) => message.type !== 'hello' && message.type !== 'ready').map((message) => message.type);
        expect(sent.filter((type) => type === 'copyText')).toHaveLength(3);
        expect(sent).not.toContain('navigate');
        expect(posted.find((message) => message.type === 'copyText')?.payload).toEqual({ text: '/sdd-plan .specs/active/0001-a.md' });
        await send({ v: 2, kind: 'evt', type: 'copyResult', payload: { ok: true, text: COPIED_TEXT } });
        expect(copy.textContent).toBe('Copied');
    });

    it('activating the row outside Copy sends the request of 0006 AC-014', async () => {
        const container = await open(withRows());
        await click(nowRow(container, '0001-a').querySelector('.ov-row')!);
        expect(posted.filter((message) => message.type === 'navigate').map((message) => message.payload)).toEqual([{ area: 'specExplorer', target: { kind: 'spec', stem: '0001-a' } }]);
    });
});

describe('0018 AC-004, AC-005, AC-012: Now and Up next', () => {
    it('Now and Up next are the first two sections, Now first, and Up next shows its rows, status texts and "+ 3 more"', async () => {
        const container = await open(withRows());
        const sections = [...container.querySelector('[data-overview]')!.children].filter((child) => child.tagName === 'SECTION').map((child) => child.getAttribute('class') ?? '');
        expect(sections[0]).toContain('ov-now');
        expect(sections[1]).toContain('ov-up-next');
        expect([...container.querySelectorAll('[data-row-group="now"] .ov-number')].map((node) => node.textContent)).toEqual(['0001', '0002']);
        expect([...container.querySelectorAll('[data-row-group="upNext"] .ov-status')].map((node) => node.textContent)).toEqual(['Ready', 'needs a plan']);
        expect(container.querySelector('[data-drill="more"]')?.textContent).toBe('+ 3 more');
    });

    it('"+ 3 more" sends one request for the Board with the named set Up next and every stem', async () => {
        const container = await open(withRows());
        await click(container.querySelector('[data-drill="more"]')!);
        expect(posted.filter((message) => message.type === 'navigate').map((message) => message.payload)).toEqual([
            { area: 'board', target: { kind: 'boardFilter', filter: { set: { label: 'Up next', stems: ['0003-c', '0004-d', '0005-e', '0006-f', '0007-g'] } } } },
        ]);
    });

    it('with nothing more there is no "+ n more" (negative control)', async () => {
        const view = withRows();
        view.upNext.more = 0;
        expect((await open(view)).querySelector('[data-drill="more"]')).toBeNull();
    });

    it('AC-012: empty Now says "Nothing in progress."; empty Up next says what to do and offers Copy of /sdd-specify', async () => {
        const container = await open(sampleView());
        expect(container.querySelector('[data-now]')?.textContent).toContain('Nothing in progress.');
        const next = container.querySelector('[data-up-next]')!;
        expect(next.textContent).toContain('Nothing up next. Start the next spec with /sdd-specify');
        const copy = next.querySelector<HTMLButtonElement>('.next-step-copy')!;
        expect(copy.getAttribute('aria-label')).toBe('Copy: /sdd-specify');
        await click(copy);
        expect(posted.find((message) => message.type === 'copyText')?.payload).toEqual({ text: '/sdd-specify' });
    });

    it('AC-011: with no spec the Overview shows the start text with Copy of /sdd-specify and no Now, Up next or figures', async () => {
        const view = sampleView();
        view.figures = { kind: 'empty' };
        const container = await open(view);
        expect(container.querySelector('[data-zero-specs]')?.textContent).toContain('No specs yet. Start with /sdd-specify');
        expect(container.querySelector('[data-now], [data-up-next], [data-total]')).toBeNull();
        await click(container.querySelector<HTMLButtonElement>('[data-zero-specs] .next-step-copy')!);
        expect(posted.find((message) => message.type === 'copyText')?.payload).toEqual({ text: '/sdd-specify' });
    });
});
