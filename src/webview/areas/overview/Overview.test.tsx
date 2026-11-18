import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../../shared/protocol/envelope';
import type { OverviewView } from '../../../shared/protocol/overview';
import { sampleView } from '../../../shared/protocol/testing/overviewSample';
import { App } from '../../App';
import { createClient, type ShellClient } from '../../client';
import { baseView, click, isKeyboardReachable, overviewEvent, mount, pressKey, send, shellEvent, type Mounted } from '../../testing/dom';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(view?: OverviewView, client?: ShellClient): Promise<HTMLElement> {
    const made = client ?? createClient({ post: (message) => void posted.push(message) });
    clients.push(made);
    made.start();
    mounted = await mount(<App client={made} />);
    await send(shellEvent(baseView({ area: 'overview' }), 1));
    if (view !== undefined) {
        await send(overviewEvent(view));
    }
    return mounted.container;
}

function area(container: HTMLElement): HTMLElement {
    return container.querySelector<HTMLElement>('[data-overview]')!;
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('transport and the empty start', () => {
    it('the area is no placeholder; before the first view it shows an empty frame and no text of its own (the loading state is the shell\'s, 0005 AC-014)', async () => {
        const container = await open();
        expect(container.querySelector('[data-placeholder]')).toBeNull();
        expect(container.querySelector('h1')?.textContent).toBe('Overview');
        expect(container.querySelector('[data-overview-empty]')).not.toBeNull();
        expect(container.textContent).not.toContain('Loading project…');
        expect(container.querySelector('[data-overview]')).toBeNull();
    });

    it('a valid overview event fills the area; an invalid one is ignored and the view stays as it was', async () => {
        const container = await open(sampleView());
        expect(area(container).textContent).toContain('Total');
        await send(overviewEvent({ figures: 'broken' }));
        await send(overviewEvent({ ...sampleView(), extra: 'SECRET-1' }));
        expect(area(container).textContent).toContain('Total');
        expect(container.textContent).not.toContain('SECRET-1');
    });
});

function visibleText(container: HTMLElement): string {
    const copy = container.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('[hidden]').forEach((node) => node.remove());
    return copy.textContent ?? '';
}

function figuresOf(): Extract<OverviewView['figures'], { kind: 'counts' }> {
    return {
        kind: 'counts',
        total: 9,
        states: [
            { state: 'Backlog', count: 2 },
            { state: 'Ready', count: 1 },
            { state: 'Active', count: 0 },
            { state: 'Review', count: 1 },
            { state: 'Done', count: 3, deprecated: 1 },
            { state: 'Blocked', count: 1 },
        ],
        progress: { kind: 'value', percent: 25, done: 2, divisor: 8 },
    };
}

const FORMULA = 'Done specs with status Implemented or Baseline ÷ (all specs − Deprecated), rounded down';

function row(stem: string, number: string, state: OverviewView['now'][number]['state'], extra: Partial<OverviewView['now'][number]> = {}): OverviewView['now'][number] {
    return { spec: { stem, number, title: `Title ${number}`, found: true }, state, status: state, problems: 0, ...extra };
}

function fullView(): OverviewView {
    const view = sampleView();
    view.now = [row('0001-a', '0001', 'Blocked')];
    view.upNext = { rows: [row('0003-c', '0003', 'Ready')], more: 0, stems: ['0003-c'] };
    view.figures = figuresOf();
    return view;
}

describe('0018 AC-003: the order of the parts and what is gone', () => {
    it('renders Now, Up next, Problems, the figures line and Activity in this DOM order', async () => {
        const container = area(await open(fullView()));
        const parts = ['[data-now]', '[data-up-next]', '[data-problems]', '[data-figures]', '[data-activity]'].map((selector) => container.querySelector(selector));
        expect(parts.every((part) => part !== null)).toBe(true);
        for (let index = 1; index < parts.length; index += 1) {
            expect(parts[index - 1]!.compareDocumentPosition(parts[index]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        }
    });

    it('shows no header line, tile, distribution bar, visible progress text or derived sentence', async () => {
        const container = area(await open(fullView()));
        expect(container.querySelector('[data-header], [data-attention], [data-specs], .ov-tile, .ov-distribution, [data-progress]')).toBeNull();
        expect(visibleText(container)).not.toMatch(/Progress|rounded down|Plan written|S-READY|S-REVIEW|S-BLOCKED|Needs attention|Specs by state/);
    });

    it('shows Problems only while it lists something', async () => {
        const view = fullView();
        view.problems = { rows: [], lines: [] };
        expect(area(await open(view)).querySelector('[data-problems]')).toBeNull();
    });
});

describe('0018 AC-007: Problems', () => {
    it('shows "Problems (n)" with n = rows + lines, each spec row with its reasons, and a line as plain text', async () => {
        const view = fullView();
        view.problems = {
            rows: [row('0002-x', '0002', 'Backlog', { status: 'plan link is dead · spec unreadable', problems: 2 })],
            lines: [{ where: 'project', reason: 'a return note has no spec', sentence: 'a return note has no spec' }],
        };
        const problems = area(await open(view)).querySelector<HTMLElement>('[data-problems]')!;
        expect(problems.querySelector('h2')?.textContent).toBe('Problems (2)');
        expect(problems.querySelector('[data-spec-row="0002-x"] .ov-status')?.textContent).toBe('plan link is dead · spec unreadable');
        const line = problems.querySelector('[data-problem-line]')!;
        expect(line.textContent).toBe('project: a return note has no spec');
        expect(line.querySelector('[title]')).toBeNull();
        expect(line.querySelector('button')).toBeNull();
        expect(line.hasAttribute('tabindex')).toBe(false);
    });

    it('activating the heading sends one request for the Board with the named set Problems and the stems of the rows', async () => {
        const view = fullView();
        view.problems = { rows: [row('0002-x', '0002', 'Backlog', { problems: 1 }), row('0003-y', '0003', 'Active', { problems: 1 })], lines: [] };
        const container = await open(view);
        await click(container.querySelector('[data-problems] h2 button')!);
        expect(posted.filter((message) => message.type === 'navigate').map((message) => message.payload)).toEqual([
            { area: 'board', target: { kind: 'boardFilter', filter: { set: { label: 'Problems', stems: ['0002-x', '0003-y'] } } } },
        ]);
    });

    it('with only project-level lines the heading still sends the named set Problems, with no stem', async () => {
        const view = fullView();
        view.problems = { rows: [], lines: [{ where: 'project', reason: 'orphan', sentence: 'orphan' }] };
        const container = await open(view);
        await click(container.querySelector('[data-problems] h2 button')!);
        expect(posted.find((message) => message.type === 'navigate')?.payload).toEqual({ area: 'board', target: { kind: 'boardFilter', filter: { set: { label: 'Problems', stems: [] } } } });
    });
});

describe('0018 AC-008: the figures line', () => {
    it('shows "Total n" and the six "State n" in board order, zeros included, each one control', async () => {
        const figures = area(await open(fullView())).querySelector<HTMLElement>('[data-figures]')!;
        expect([...figures.querySelectorAll('button')].map((button) => button.textContent)).toEqual(['Total 9', 'Backlog 2', 'Ready 1', 'Active 0', 'Review 1', 'Done 3', 'Blocked 1']);
        expect(figures.querySelectorAll('li')).toHaveLength(7);
    });

    it.each([
        ['total', { area: 'board' }],
        ['state:Active', { area: 'board', target: { kind: 'boardFilter', filter: { states: ['Active'] } } }],
        ['state:Review', { area: 'board', target: { kind: 'boardFilter', filter: { states: ['Review'] } } }],
    ])('%s sends 0006 BR-08\'s request (a zero included)', async (id, request) => {
        const container = await open(fullView());
        await click(container.querySelector(`[data-drill="${id}"]`)!);
        expect(posted.filter((message) => message.type === 'navigate').map((message) => message.payload)).toEqual([request]);
    });

    it('Done carries "of which Deprecated: n" as tooltip and accessible description while n > 0, and no other figure does', async () => {
        const container = area(await open(fullView()));
        const done = container.querySelector<HTMLElement>('[data-drill="state:Done"]')!;
        expect(done.getAttribute('title')).toBe('of which Deprecated: 1');
        const description = container.querySelector(`#${done.getAttribute('aria-describedby')}`);
        expect(description?.textContent).toBe('of which Deprecated: 1');
        expect(description?.hasAttribute('hidden')).toBe(true);
        expect(container.querySelector('[data-drill="state:Ready"]')?.getAttribute('aria-describedby')).toBeNull();
        expect(visibleText(container)).not.toContain('Deprecated');
    });

    it('with no Deprecated spec Done carries no tooltip (negative control)', async () => {
        const view = fullView();
        const figures = figuresOf();
        figures.states = figures.states.map((entry) => (entry.state === 'Done' ? { ...entry, deprecated: 0 } : entry));
        view.figures = figures;
        const done = area(await open(view)).querySelector('[data-drill="state:Done"]')!;
        expect(done.getAttribute('title')).toBeNull();
        expect(done.getAttribute('aria-describedby')).toBeNull();
    });
});

describe('0018 AC-009: the progress text is a tooltip, never visible', () => {
    it('the line and "Total n" carry it as tooltip, "Total n" as accessible description', async () => {
        const container = area(await open(fullView()));
        const text = `Progress 25 % (2 of 8): ${FORMULA}`;
        expect(container.querySelector('[data-figures]')?.getAttribute('title')).toBe(text);
        const total = container.querySelector<HTMLElement>('[data-drill="total"]')!;
        expect(total.getAttribute('title')).toBe(text);
        const description = container.querySelector(`#${total.getAttribute('aria-describedby')}`);
        expect(description?.textContent).toBe(text);
        expect(description?.hasAttribute('hidden')).toBe(true);
    });

    it('no visible element shows it: every element holding the text is hidden or a tooltip', async () => {
        const container = area(await open(fullView()));
        const holders = [...container.querySelectorAll('*')].filter((node) => node.children.length === 0 && (node.textContent ?? '').includes('Progress'));
        expect(holders.every((node) => node.hasAttribute('hidden'))).toBe(true);
    });

    it('without a divisor the text reads "Progress: not available" and shows no percentage', async () => {
        const view = fullView();
        const figures = figuresOf();
        figures.progress = { kind: 'not available' };
        view.figures = figures;
        const container = area(await open(view));
        expect(container.querySelector('[data-figures]')?.getAttribute('title')).toBe('Progress: not available');
        expect(container.querySelector('[data-figures]')?.getAttribute('title')).not.toContain('%');
    });
});

describe('0018 AC-013: keyboard', () => {
    it('every spec row, Copy, figure, "+ n more", the Problems and Activity headings are Tab stops in DOM order', async () => {
        const view = fullView();
        view.now = [row('0001-a', '0001', 'Blocked', { step: { intent: 'Plan', short: '/sdd-plan', line: '/sdd-plan 0001', lines: [{ text: '/sdd-plan 0001', intent: 'Write the plan' }] } })];
        view.upNext = { rows: [row('0003-c', '0003', 'Ready')], more: 2, stems: ['0003-c', '0004-d', '0005-e'] };
        view.problems = { rows: [row('0002-x', '0002', 'Backlog', { problems: 1 })], lines: [] };
        const container = area(await open(view));
        const controls = [...container.querySelectorAll<HTMLElement>('button')];
        expect(controls.length).toBeGreaterThanOrEqual(12);
        expect(controls.every((control) => isKeyboardReachable(control))).toBe(true);
        expect(controls.map((control) => control.getAttribute('data-drill') ?? control.className.split(' ')[0]).slice(0, 4)).toEqual(['row:now:0001-a', 'copy-button', 'row:upNext:0003-c', 'more']);
    });

    it.each(['Enter', ' '] as const)('the key %j activates a figure and sends its request', async (key) => {
        const container = area(await open(fullView()));
        await pressKey(container.querySelector<HTMLElement>('[data-drill="state:Review"]')!, key);
        expect(posted.filter((message) => message.type === 'navigate').map((message) => message.payload)).toEqual([
            { area: 'board', target: { kind: 'boardFilter', filter: { states: ['Review'] } } },
        ]);
    });
});

describe('0018 AC-011: zero specs', () => {
    it('shows "No specs yet. Start with /sdd-specify" and Copy in place of Now, Up next and the figures; Problems and Activity stay', async () => {
        const view = sampleView();
        view.figures = { kind: 'empty' };
        const container = area(await open(view));
        expect(container.textContent).toContain('No specs yet. Start with /sdd-specify');
        expect(container.querySelector('[data-now], [data-up-next], [data-figures]')).toBeNull();
        expect(container.querySelector('[data-problems]')).not.toBeNull();
        expect(container.querySelector('[data-activity]')).not.toBeNull();
    });

    it('control: with specs the message is not shown', async () => {
        expect(area(await open(sampleView())).textContent).not.toContain('No specs yet');
    });
});

describe('0022 AC-013, AC-002, AC-003: Problems as sentences', () => {
    it('a Problems row shows the sentences and carries the technical reasons as tooltip', async () => {
        const view = fullView();
        view.problems = {
            rows: [row('0002-x', '0002', 'Backlog', { status: 'The plan link points to a missing file · The spec cannot be read', reasons: 'plan link is dead · spec unreadable', problems: 2 })],
            lines: [],
        };
        const status = area(await open(view)).querySelector('[data-problems] [data-spec-row="0002-x"] .ov-status')!;
        expect(status.textContent).toBe('The plan link points to a missing file · The spec cannot be read');
        expect(status.getAttribute('title')).toBe('plan link is dead · spec unreadable');
    });

    it('a project-level line shows the place with break opportunities, then the sentence, and the reason as tooltip', async () => {
        const view = fullView();
        view.problems = { rows: [], lines: [{ where: '.memory-bank/activeContext.0099-T-001.md', reason: 'return note matches no spec', sentence: 'This return note belongs to no spec.' }] };
        const line = area(await open(view)).querySelector('[data-problem-line]')!;
        expect(line.textContent).toBe('.memory-bank/activeContext.0099-T-001.md: This return note belongs to no spec.');
        expect(line.querySelectorAll('wbr').length).toBeGreaterThan(0);
        expect(line.getAttribute('title')).toBe('return note matches no spec');
    });
});

describe('0024 AC-003, AC-002: the split button at the first Now row only', () => {
    const line = (n: string) => `/sdd-plan .specs/active/${n}-r.md`;
    const step = (n: string) => ({ intent: 'Plan', short: '/sdd-plan', line: line(n), lines: [{ text: line(n), intent: 'Write the plan' }] });
    const row = (n: string, extra: Record<string, unknown> = {}) => ({ spec: { stem: `${n}-r`, number: n, title: `Row ${n}`, found: true }, state: 'Active', status: 'Active', problems: 0, step: step(n), ...extra });
    const SEND = { assistant: 'claudeCode', target: 'new', targets: ['new'] };

    function viewWith(now: unknown[]): OverviewView {
        return { ...sampleView(), now, upNext: { rows: [row('0003'), row('0004')], more: 0, stems: [] } } as OverviewView;
    }

    it('row 0 shows Send to Claude Code with its arrow part; the later rows and Up next keep their icon Copy; one split button in the Overview', async () => {
        const container = await open(viewWith([row('0001', { send: SEND }), row('0002')]));
        const splits = container.querySelectorAll('.send-split');
        expect(splits).toHaveLength(1);
        expect(splits[0]!.closest('[data-spec-row]')?.getAttribute('data-spec-row')).toBe('0001-r');
        expect(splits[0]!.closest('li')?.parentElement?.closest('[data-now]')).not.toBeNull();
        expect(splits[0]!.querySelector('button.send-main')?.textContent).toBe('Send to Claude Code');
        expect(splits[0]!.querySelector('button.send-main')?.getAttribute('aria-label')).toBe(`Send to Claude Code (new chat): ${line('0001')}`);
        const second = container.querySelector('[data-spec-row="0002-r"]')!;
        expect(second.querySelector('button.copy-icon')).not.toBeNull();
        expect(second.querySelector('.send-split')).toBeNull();
        expect(container.querySelectorAll('[data-up-next] button.copy-icon')).toHaveLength(2);
    });

    it('a menu item and the main part post sendPrompt with the line of row 0', async () => {
        const container = await open(viewWith([row('0001', { send: SEND })]));
        await click(container.querySelector('button.send-main')!);
        await click(container.querySelector('button.send-arrow')!);
        await click([...container.querySelectorAll<HTMLElement>('[role="menuitem"]')][0]!);
        expect(posted.filter((message) => message.type === 'sendPrompt').map((message) => message.payload)).toEqual([
            { assistant: 'claudeCode', target: 'new', line: line('0001') },
            { assistant: 'claudeCode', target: 'new', line: line('0001') },
        ]);
    });

    it('a first Now row without a step holds no Send control; no row of any group does', async () => {
        const noStep = { spec: { stem: '0001-r', number: '0001', title: 'Row 0001', found: true }, state: 'Active', status: 'Active', problems: 0 };
        const container = await open(viewWith([noStep, row('0002')]));
        expect(container.querySelector('.send-split, .send-arrow, [role="menu"]')).toBeNull();
    });

    it('an offer that goes away moves focus from the split button to the Copy prompt of the row; an assistant change moves it to the arrow part', async () => {
        const container = await open(viewWith([row('0001', { send: SEND }), row('0002')]));
        await act(async () => container.querySelector<HTMLElement>('button.send-main')!.focus());
        await send(overviewEvent(viewWith([row('0001', { send: { assistant: 'copilot', target: 'new', targets: ['new', 'current'] } }), row('0002')])));
        expect(document.activeElement).toBe(container.querySelector('button.send-arrow'));
        await send(overviewEvent(viewWith([row('0001'), row('0002')])));
        expect(container.querySelector('.send-split')).toBeNull();
        expect(document.activeElement).toBe(container.querySelector('[data-spec-row="0001-r"] button.copy-button'));
    });

    it('after a window blur (focusout without a related target, the active element unchanged) the same moves hold', async () => {
        const container = await open(viewWith([row('0001', { send: SEND }), row('0002')]));
        const main = container.querySelector<HTMLElement>('button.send-main')!;
        await act(async () => main.focus());
        await act(async () => {
            main.dispatchEvent(new FocusEvent('blur', { relatedTarget: null }));
            main.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
            await Promise.resolve();
        });
        expect(document.activeElement).toBe(main);
        await send(overviewEvent(viewWith([row('0001'), row('0002')])));
        expect(container.querySelector('.send-split')).toBeNull();
        expect(document.activeElement).toBe(container.querySelector('[data-spec-row="0001-r"] button.copy-button'));
    });

    it('a row with focus on Send leaves Now while another spec enters Up next: no other spec\'s row takes the focus', async () => {
        const container = await open(viewWith([row('0001', { send: SEND }), row('0002')]));
        await act(async () => container.querySelector<HTMLElement>('button.send-main')!.focus());
        const next = { ...sampleView(), now: [row('0002', { send: SEND })], upNext: { rows: [row('0009'), row('0003')], more: 0, stems: [] } } as OverviewView;
        await send(overviewEvent(next));
        const held = document.activeElement?.closest('[data-spec-row]')?.getAttribute('data-spec-row');
        expect(held === undefined || held === null).toBe(true);
        expect(document.activeElement?.classList.contains('copy-icon')).toBe(false);
    });

    it('the row stays first and its offer goes away: its own Copy prompt takes the focus, and a Copy that mounts in another row in the same update does not', async () => {
        const container = await open(viewWith([row('0001', { send: SEND }), row('0002')]));
        await act(async () => container.querySelector<HTMLElement>('button.send-main')!.focus());
        await send(overviewEvent(viewWith([row('0001'), row('0002'), row('0005')])));
        expect(document.activeElement).toBe(container.querySelector('[data-spec-row="0001-r"] button.copy-button'));
    });

    it('without send the first Now row renders the 0021 DOM: the Copy prompt in place of the split button', async () => {
        const container = await open(viewWith([row('0001'), row('0002')]));
        expect(container.querySelector('[data-spec-row="0001-r"] button.copy-icon, [data-spec-row="0001-r"] button.copy-button')).not.toBeNull();
        expect(container.querySelector('.send-split')).toBeNull();
    });
});

