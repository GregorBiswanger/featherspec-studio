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

function activityView(open: boolean): OverviewView {
    const view = sampleView();
    if (view.activity.available) {
        view.activity = { ...view.activity, open };
    }
    return view;
}

describe('0018 AC-010: Activity, collapsed by default', () => {
    it('shows the heading "Activity (2)" as a button with aria-expanded="false" and no entries', async () => {
        const activity = section(await open(activityView(false)), 'activity');
        const toggle = activity.querySelector<HTMLButtonElement>('h2 button')!;
        expect(toggle.textContent).toBe('Activity (2)');
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(activity.querySelectorAll('[data-activity-entry]')).toHaveLength(0);
    });

    it('activating the heading sends one overviewSetActivity request and changes nothing itself; the entries follow the view', async () => {
        const container = await open(activityView(false));
        await click(section(container, 'activity').querySelector('h2 button')!);
        expect(posted.filter((message) => message.type === 'overviewSetActivity').map((message) => message.payload)).toEqual([{ open: true }]);
        expect(section(container, 'activity').querySelectorAll('[data-activity-entry]')).toHaveLength(0);
        await send(overviewEvent(activityView(true)));
        const activity = section(container, 'activity');
        expect(activity.querySelector('h2 button')?.getAttribute('aria-expanded')).toBe('true');
        expect(activity.querySelectorAll('[data-activity-entry]')).toHaveLength(2);
        await click(activity.querySelector('h2 button')!);
        expect(posted.filter((message) => message.type === 'overviewSetActivity').map((message) => message.payload)).toEqual([{ open: true }, { open: false }]);
    });

    it.each(['Enter', ' '] as const)('the key %j on the heading sends the request', async (key) => {
        const container = await open(activityView(false));
        await pressKey(section(container, 'activity').querySelector('h2 button')!, key);
        expect(posted.filter((message) => message.type === 'overviewSetActivity')).toHaveLength(1);
    });

    it('the heading is a Tab stop', async () => {
        const toggle = section(await open(activityView(false)), 'activity').querySelector<HTMLElement>('h2 button')!;
        expect(toggle.tabIndex).toBe(0);
    });

    it('while open it shows time, number, title and the change of each entry in the order of the view, and no control that shows more (0006 AC-010)', async () => {
        const activity = section(await open(activityView(true)), 'activity');
        const rows = [...activity.querySelectorAll('[data-activity-entry]')].map((row) => row.textContent);
        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatch(/^(Today|Yesterday) \d{2}:\d{2} · 0001 A · Backlog → Ready$|^\d{4}-\d{2}-\d{2} \d{2}:\d{2} · 0001 A · Backlog → Ready$/);
        expect(rows[1]).toMatch(/· 0009-gone — spec not found · Done → no longer in the project$/);
        expect([...activity.querySelectorAll('button')].filter((button) => !button.hasAttribute('data-drill'))).toHaveLength(0);
        expect(activity.querySelectorAll('button')).toHaveLength(rows.length + 1);
        expect(activity.textContent).not.toMatch(/\bmore\b/i);
    });

    it('names a change that happened while Studio was not running', async () => {
        const view = sampleView();
        view.activity = {
            available: true,
            open: true,
            entries: [{ at: '2026-11-16T09:00:00.000Z', spec: { stem: '0001-a', number: '0001', title: 'A', found: true }, change: { kind: 'state', old: 'Ready', new: 'Active', whileClosed: true } }],
        };
        expect(section(await open(view), 'activity').textContent).toContain('Ready → Active (changed while Studio was not running)');
    });

    it('without entries there is no Activity section at all', async () => {
        const view = sampleView();
        view.activity = { available: true, open: false, entries: [] };
        const container = await open(view);
        expect(container.querySelector('[data-activity]')).toBeNull();
        expect(container.textContent).not.toMatch(/Activity|No recent activity/);
    });

    it('while the status history is not available it shows the heading "Activity", the reason and no toggle', async () => {
        const view = sampleView();
        view.activity = { available: false, reason: 'no store' };
        const activity = section(await open(view), 'activity');
        expect(activity.querySelector('h2')?.textContent).toBe('Activity');
        expect(activity.textContent).toContain('Activity not available: no store');
        expect(activity.querySelector('button')).toBeNull();
        expect(activity.hasAttribute('aria-expanded')).toBe(false);
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

describe('0013 §3.2: the panel row', () => {
    it('0015 §3.2 (0013): Activity stands alone in the panel row below the figures line', async () => {
        const container = await open(sampleView());
        const panels = container.querySelector('.ov-panels');
        expect([...(panels?.children ?? [])].map((child) => (child.hasAttribute('data-activity') ? 'activity' : 'other'))).toEqual(['activity']);
        const figures = container.querySelector('[data-figures]')!;
        expect(figures.compareDocumentPosition(panels!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
});

function rowFor(stem: string, number: string, title: string, state: OverviewView['now']['rows'][number]['state'], extra: Partial<OverviewView['now']['rows'][number]> = {}): OverviewView['now']['rows'][number] {
    return { spec: { stem, number, title, found: true }, state, status: state, problems: 0, ...extra };
}

const STEP_PLAN = { intent: 'Continue', short: 'Implement T-003', line: 'Implement T-003 of .specs/active/0001-a.plan.md', lines: [{ text: 'Implement T-003 of .specs/active/0001-a.plan.md', intent: 'Continue with T-003 Reject money values' }, { text: '/sdd-plan .specs/active/0001-a.md', intent: 'Or: not sure where it stands? Let the agent report first' }] };

function withRows(): OverviewView {
    const view = sampleView();
    view.now = { rows: [rowFor('0001-a', '0001', 'Alpha', 'Blocked', { step: STEP_PLAN }), rowFor('0002-b', '0002', 'Beta', 'Active', { problems: 2 })], more: 0, stems: [] };
    view.upNext = { rows: [rowFor('0003-c', '0003', 'Gamma', 'Ready'), rowFor('0004-d', '0004', 'Delta', 'Backlog', { status: 'needs a plan' })], more: 3, stems: ['0003-c', '0004-d', '0005-e', '0006-f', '0007-g'] };
    return view;
}

function nowRow(container: HTMLElement, stem: string): HTMLElement {
    return container.querySelector<HTMLElement>(`[data-row-group="now"][data-spec-row="${stem}"]`)!;
}

describe('0022 AC-008 (X-07): the Up next note', () => {
    it('shows "Ready first, then backlog" after the Up next heading while rows are listed', async () => {
        const container = await open(withRows());
        const panel = container.querySelector('[data-up-next]')!;
        const note = panel.querySelector('p.ov-note')!;
        expect(note.textContent).toBe('Ready first, then backlog');
        expect(panel.querySelector('h2')?.nextElementSibling).toBe(note);
    });

    it('shows no note while the section lists no row', async () => {
        const view = withRows();
        view.upNext = { rows: [], more: 0, stems: [] };
        const panel = (await open(view)).querySelector('[data-up-next]')!;
        expect(panel.querySelector('.ov-note')).toBeNull();
        expect(panel.textContent).toContain('Nothing up next');
    });
});

describe('0018 AC-006: a spec row on one line', () => {
    it('shows number, title, status text, the next step and Copy, and no second step line', async () => {
        const container = await open(withRows());
        const row = nowRow(container, '0001-a');
        const drill = row.querySelector('.ov-row')!;
        expect(drill.querySelector('.ov-number')?.textContent).toBe('0001');
        expect(drill.querySelector('.ov-title')?.textContent).toBe('Alpha');
        expect(drill.querySelector('.ov-status')?.textContent).toBe('Blocked');
        expect(row.querySelector('.step-text > .visually-hidden')?.textContent).toBe('Next step: ');
        expect(row.querySelector('.step-short')?.textContent).toBe('Implement T-003');
        expect(row.querySelector('.step-intent')?.textContent).toBe('Continue');
        expect(row.querySelector('.step-text')?.textContent).toBe('Next step: Continue · Implement T-003');
        expect(drill.querySelector('.step-text')).toBeNull();
        expect(row.querySelector('.next-step-copy')?.getAttribute('aria-label')).toBe('Copy prompt: Implement T-003 of .specs/active/0001-a.plan.md');
        expect(drill.textContent).not.toContain('continue');
        expect(drill.querySelector('br')).toBeNull();
    });

    it('0022 AC-027: every row shows its state icon before its text, the state as tooltip, and the state name once in the row name', async () => {
        const container = await open(withRows());
        const row = nowRow(container, '0001-a');
        const icon = row.querySelector('.ov-state-icon')!;
        const status = row.querySelector('.ov-status')!;
        expect(icon.getAttribute('title')).toBe('Blocked');
        expect(icon.querySelector('svg')?.getAttribute('data-icon')).toBe('Blocked');
        expect(icon.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(status.classList.contains('ov-state-name')).toBe(true);
        expect(icon.getAttribute('role')).toBeNull();
        expect(icon.getAttribute('aria-label')).toBeNull();
    });

    it('0022 AC-027: a row whose text is a need or a sentence names its state on the icon and hides nothing', async () => {
        const container = await open(withRows());
        const rows = [...container.querySelectorAll('[data-row-group="upNext"]')];
        const needs = rows.find((row) => row.querySelector('.ov-status')?.textContent === 'needs a plan')!;
        expect(needs.querySelector('.ov-status')?.classList.contains('ov-state-name')).toBe(false);
        expect(needs.querySelector('.ov-state-icon')?.getAttribute('role')).toBe('img');
        expect(needs.querySelector('.ov-state-icon')?.getAttribute('aria-label')).toBe(needs.querySelector('.ov-state-icon')?.getAttribute('title'));
        const name = needs.querySelector('.ov-row')!.textContent!;
        expect(name.split(needs.querySelector('.ov-state-icon')!.getAttribute('title')!).length - 1).toBe(0);
    });

    it('title and status carry their full text as tooltip, the step its full lines', async () => {
        const row = nowRow(await open(withRows()), '0001-a');
        expect(row.querySelector('.ov-title')?.getAttribute('title')).toBe('Alpha');
        expect(row.querySelector('.ov-status')?.getAttribute('title')).toBe('Blocked');
        expect(row.querySelector('.step-text')?.getAttribute('title')).toBe('Continue with T-003 Reject money values\nImplement T-003 of .specs/active/0001-a.plan.md\nOr: not sure where it stands? Let the agent report first\n/sdd-plan .specs/active/0001-a.md');
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
        expect(row.querySelector('.ov-row')?.nextElementSibling).toBe(row.querySelector('.step-text'));
        expect(row.querySelector('.step-text')?.nextElementSibling).toBe(copy);
        await click(copy);
        await pressKey(copy, 'Enter');
        await pressKey(copy, ' ');
        const sent = posted.filter((message) => message.type !== 'hello' && message.type !== 'ready').map((message) => message.type);
        expect(sent.filter((type) => type === 'copyText')).toHaveLength(3);
        expect(sent).not.toContain('navigate');
        expect(posted.find((message) => message.type === 'copyText')?.payload).toEqual({ text: 'Implement T-003 of .specs/active/0001-a.plan.md' });
        await send({ v: 13, kind: 'evt', type: 'copyResult', payload: { ok: true, text: COPIED_TEXT } });
        expect(copy.textContent).toBe('Copied');
    });

    it('AC-001: activating the row outside Copy sends select, not navigate', async () => {
        const container = await open(withRows());
        await click(nowRow(container, '0001-a').querySelector('.ov-row')!);
        expect(posted.filter((message) => message.type === 'select').map((message) => message.payload)).toEqual([{ stem: '0001-a' }]);
        expect(posted.some((message) => message.type === 'navigate')).toBe(false);
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

    it('0018 AC-005, boundary: one more entry shows "+ 1 more" and sends the request with every stem', async () => {
        const view = withRows();
        view.upNext.more = 1;
        view.upNext.stems = ['0003-c', '0004-d', '0005-e'];
        const container = await open(view);
        expect(container.querySelector('[data-drill="more"]')?.textContent).toBe('+ 1 more');
        await click(container.querySelector('[data-drill="more"]')!);
        expect(posted.filter((message) => message.type === 'navigate').map((message) => message.payload)).toEqual([
            { area: 'board', target: { kind: 'boardFilter', filter: { set: { label: 'Up next', stems: ['0003-c', '0004-d', '0005-e'] } } } },
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
        expect(copy.getAttribute('aria-label')).toBe('Copy prompt: /sdd-specify');
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

describe('0021 AC-009, AC-010: the coach line of the first Now row', () => {
    const TIPS = { coach: 'Tip: Use any chat with a fast model.', about: ['one', 'two', 'three', 'four'] };

    function withTips(): OverviewView {
        const view = withRows();
        view.now.rows[0] = { ...view.now.rows[0]!, tips: TIPS };
        return view;
    }

    it('shows one coach line, in the first Now row, after its Copy; no other row, no Up next row shows one', async () => {
        const container = await open(withTips());
        const coaches = container.querySelectorAll('.ov-coach');
        expect(coaches).toHaveLength(1);
        const item = nowRow(container, '0001-a');
        const coach = item.querySelector('div.ov-coach')!;
        expect(coach.parentElement).toBe(item);
        expect(coach.querySelector('.ov-coach-text')!.textContent).toBe('Tip: Use any chat with a fast model.');
        const copy = item.querySelector('button.next-step-copy')!;
        expect(copy.nextElementSibling?.getAttribute('role')).toBe('status');
        expect(copy.nextElementSibling?.nextElementSibling).toBe(coach);
        expect(nowRow(container, '0002-b').querySelector('.ov-coach')).toBeNull();
        expect(container.querySelector('[data-up-next] .ov-coach')).toBeNull();
    });

    it('shows no coach line without tips, and the row is the same otherwise', async () => {
        const without = await open(withRows());
        expect(without.querySelector('.ov-coach')).toBeNull();
        const withoutHtml = nowRow(without, '0001-a').innerHTML;
        const withHtml = nowRow(await open(withTips()), '0001-a').innerHTML.replace(/<div class="ov-coach">.*<\/div>/, '');
        expect(withoutHtml).toBe(withHtml);
    });
});

describe('0021 AC-014, AC-009: the About this step toggletip of the first Now row', () => {
    const ABOUT = ['It builds one step.', 'Same chat: it continues.', 'A fast model is enough.', 'Nothing changes on disk.'];
    const TIPS = { coach: 'Tip: Use any chat with a fast model.', about: ABOUT };

    function withTips(): OverviewView {
        const view = withRows();
        view.now.rows[0] = { ...view.now.rows[0]!, tips: TIPS };
        return view;
    }

    it('shows one question-mark button in the coach line, after the coach text, and no other row, card or Up next row shows one', async () => {
        const container = await open(withTips());
        const toggles = container.querySelectorAll('button.toggletip');
        expect(toggles).toHaveLength(1);
        const coach = nowRow(container, '0001-a').querySelector('.ov-coach')!;
        const toggle = coach.querySelector<HTMLButtonElement>('button.toggletip')!;
        expect(toggle.previousElementSibling?.textContent).toBe('Tip: Use any chat with a fast model.');
        expect(toggle.getAttribute('aria-label')).toBe('About this step');
        expect(nowRow(container, '0002-b').querySelector('.toggletip')).toBeNull();
        expect(container.querySelector('[data-up-next] .toggletip')).toBeNull();
    });

    it('opens the four paragraphs in the coach line and a second activation empties them', async () => {
        const container = await open(withTips());
        const toggle = container.querySelector<HTMLButtonElement>('button.toggletip')!;
        await click(toggle);
        expect([...toggle.nextElementSibling!.querySelectorAll('p')].map((paragraph) => paragraph.textContent)).toEqual(ABOUT);
        await click(toggle);
        expect(toggle.nextElementSibling!.textContent).toBe('');
    });

    it('shows no question-mark button without tips', async () => {
        const container = await open(withRows());
        expect(container.querySelector('.toggletip')).toBeNull();
    });
});

describe('0026 AC-005: every Overview row with a step hides its Next step: label', () => {
    it('Now, Up next and Problems rows: the step text starts with the visually hidden label and shows no Next', async () => {
        const view = withRows();
        view.upNext = { rows: [rowFor('0003-c', '0003', 'Gamma', 'Ready', { step: STEP_PLAN })], more: 0, stems: ['0003-c'] };
        const container = await open(view);
        const texts = [...container.querySelectorAll<HTMLElement>('.step-text')];
        expect(texts.length).toBeGreaterThanOrEqual(2);
        for (const text of texts) {
            expect(text.firstElementChild?.className).toBe('visually-hidden');
            expect(text.firstElementChild?.textContent).toBe('Next step: ');
            const visible = text.cloneNode(true) as HTMLElement;
            visible.querySelectorAll('.visually-hidden').forEach((hidden) => hidden.remove());
            expect(visible.textContent).not.toMatch(/Next/);
        }
        expect(container.querySelector('[data-row-group="upNext"] .step-text, [data-up-next] .step-text')).not.toBeNull();
    });
});
