import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../shared/protocol/envelope';
import { BOARD_STATES } from '../../shared/protocol/boardFilter';
import { STATE_LOOK } from '../../shared/protocol/stateLook';
import { COPIED_TEXT, COPY_FAILED_TEXT } from '../../shared/protocol/nextStepTexts';
import type { StepView } from '../../shared/protocol/stepView';
import { App } from '../App';
import { createClient, type ShellClient } from '../client';
import { baseView, click, mount, pressKey, send, shellEvent, type Mounted } from '../testing/dom';
import { boardEvent, boardView, card } from './testing/views';

const STEP: StepView = { intent: 'Build', short: 'Start T-003', line: 'Start T-003 of .specs/backlog/0007-x.plan.md', lines: [{ text: 'Start T-003 of .specs/backlog/0007-x.plan.md', intent: 'Write the plan' }] };
const TWO: StepView = {
    intent: 'Continue', short: 'Implement T-003',
    line: 'Implement T-003 of .specs/active/0008-y.plan.md',
    lines: [{ text: 'Implement T-003 of .specs/active/0008-y.plan.md', intent: 'Continue with T-003 Reject money values' }, { text: '/sdd-plan .specs/active/0008-y.md', intent: 'Not sure where it stands? Let the agent report first' }],
};

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(view = boardView([card('0001')]), area: 'board' | 'overview' = 'board'): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area }), 1));
    await send(boardEvent(view));
    return mounted.container;
}

function requests(type: string): unknown[] {
    return posted.filter((message) => message.type === type).map((message) => message.payload);
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('AC-008, AC-003: the board renders every field of a card as text', () => {
    it('shows the six columns with heading and count', async () => {
        const container = await open(boardView([card('0001'), card('0002'), card('0003', { state: 'Done' })]));
        const columns = [...container.querySelectorAll('[data-column]')];
        expect(columns.map((column) => column.getAttribute('data-column'))).toEqual(['Backlog', 'Ready', 'Active', 'Review', 'Done', 'Blocked']);
        expect(columns[2]?.querySelector('h2')?.textContent).toContain('Active');
        expect(columns[2]?.querySelector('.column-count')?.textContent).toBe('2');
        expect(columns[4]?.querySelectorAll('[data-card]')).toHaveLength(1);
    });

    it('AC-018: a card shows number and title, then row 2 with the steps, the criteria and the day, and no chip, sentence, rule ID, description or old label', async () => {
        const text = (await open(boardView([card('0007', { state: 'Review' })]))).querySelector('[data-card]')!.textContent!;
        expect(text).toBe('0007 Thing 0007Steps 3/7 · 43%·Criteria 1/4 · 25%2026-11-16');
        expect(text).not.toMatch(/Plan done, waiting for review|S-REVIEW|A summary|Tasks:|Criteria:|Last change:|No summary/);
    });

    it('AC-018: the card is built of the rows head, path, state row and step line in that order, and has no state chip', async () => {
        const entry = card('0001', { state: 'Active', path: '.specs/active/0001-thing.md', problems: 1, step: { intent: 'Plan', short: '/sdd-plan', line: '/sdd-plan .specs/active/0001-thing.md', lines: [{ text: '/sdd-plan .specs/active/0001-thing.md', intent: 'Write the plan' }] } });
        const li = (await open(boardView([entry]))).querySelector('[data-card]')!;
        expect([...li.children].map((child) => child.className)).toEqual(['card-head', 'card-path', 'card-state', 'card-step']);
        expect(li.querySelector('.state-chip, [data-marker="derived"], .card-summary, .card-foot')).toBeNull();
        expect(li.querySelector('.card-path')?.textContent).toBe('.specs/active/0001-thing.md');
    });

    it('AC-018: the card tooltip is number and title, a line break, then the description or No summary; the name ends with the state', async () => {
        const container = await open(boardView([card('0001', { summary: 'Splits a tip.' }), card('0002', { summary: undefined, state: 'Done' })]));
        const [first, second] = [...container.querySelectorAll('[data-card]')];
        expect(first!.getAttribute('title')).toBe('0001 Thing 0001\nSplits a tip.');
        expect(first!.getAttribute('aria-label')).toBe('0001 Thing 0001, Active');
        expect(second!.getAttribute('title')).toBe('0002 Thing 0002\nNo summary');
        expect(second!.getAttribute('aria-label')).toBe('0002 Thing 0002, Done');
    });

    it('AC-018: the state row is the description of the card, so the screen reader says the figures after the name', async () => {
        const li = (await open(boardView([card('0001')]))).querySelector('[data-card]')!;
        const id = li.getAttribute('aria-describedby')!;
        expect(li.querySelector(`[id="${id}"]`)?.className).toBe('card-state');
    });

    it('0015 AC-011: the card shows no run line, whatever the run state of the spec was', async () => {
        const container = await open(boardView([card('0001', { state: 'Active' })]));
        expect(container.querySelector('.card-run')).toBeNull();
        expect(container.querySelector('[data-card]')!.textContent).not.toMatch(/No run|Runs: not available|history unreadable/);
    });

    it('AC-019: a Backlog card shows its first need, a Blocked card each blocked line, a Deprecated card the word, any other the progress', async () => {
        const container = await open(
            boardView([
                card('0001', { state: 'Backlog', need: { text: 'needs a plan', rule: 'R-3' }, tasks: undefined, criteria: undefined }),
                card('0002', { state: 'Blocked', blocked: ['Blocked: plan status Blocked', 'Blocked: return note n.md'] }),
                card('0003', { state: 'Done', deprecated: true }),
                card('0004', { state: 'Active' }),
            ]),
        );
        const rows = Object.fromEntries([...container.querySelectorAll('[data-card]')].map((entry) => [/\d{4}/.exec(entry.getAttribute('data-card')!)![0], (entry.querySelector('.card-state')?.textContent ?? '').trim()]));
        expect(rows['0001']).toBe('needs a plan2026-11-16');
        expect(rows['0002']).toBe('Blocked: plan status BlockedBlocked: return note n.md2026-11-16');
        expect(rows['0003']).toBe('Deprecated2026-11-16');
        expect(rows['0004']).toBe('Steps 3/7 · 43%·Criteria 1/4 · 25%2026-11-16');
        expect(container.textContent).not.toContain('R-3');
    });

    it('AC-019: unavailable parts are left out and never read as zero; with no part, row 2 is absent', async () => {
        const container = await open(
            boardView([
                card('0001', { tasks: undefined, lastChange: undefined }),
                card('0002', { criteria: undefined, lastChange: undefined }),
                card('0003', { tasks: undefined, criteria: undefined, lastChange: undefined }),
            ]),
        );
        const [only, steps, none] = [...container.querySelectorAll('[data-card]')];
        expect(only!.querySelector('.card-state')?.textContent).toBe('Criteria 1/4 · 25%');
        expect(steps!.querySelector('.card-state')?.textContent).toBe('Steps 3/7 · 43%');
        expect(none!.querySelector('.card-state')).toBeNull();
        expect(none!.hasAttribute('aria-describedby')).toBe(false);
        expect(container.textContent).not.toMatch(/not available|0\/0/);
    });

    it('AC-019: the steps bar is named Steps and carries the figure', async () => {
        const bar = (await open(boardView([card('0001')]))).querySelector('[role="progressbar"]')!;
        expect(bar.getAttribute('aria-label')).toBe('Steps');
        expect(bar.getAttribute('aria-valuenow')).toBe('3');
        expect(bar.getAttribute('aria-valuemax')).toBe('7');
        expect(bar.getAttribute('aria-valuetext')).toBe('Steps 3/7 · 43%');
    });

    it('AC-019: the Problems badge is the warning icon with its text, and absent at 0 (negative control)', async () => {
        const one = (await open(boardView([card('0001', { problems: 1 })]))).querySelector('[data-card]')!;
        expect(one.querySelector('[data-marker="problems"]')?.textContent?.trim()).toBe('1 problem');
        expect(one.querySelector('[data-marker="problems"] svg')?.getAttribute('aria-hidden')).toBe('true');
        mounted?.unmount();
        const two = (await open(boardView([card('0001', { problems: 2 })]))).querySelector('[data-marker="problems"]');
        expect(two?.textContent?.trim()).toBe('2 problems');
        mounted?.unmount();
        const none = (await open(boardView([card('0002', { problems: 0 })]))).querySelector('[data-card]')!;
        expect(none.querySelector('[data-marker="problems"]')).toBeNull();
        expect(none.textContent).not.toMatch(/problem|diagnostic/i);
    });

    it('AC-021: the day is shown beside a tooltip naming its source', async () => {
        const container = await open(boardView([card('0001', { lastChange: { day: '2026-11-10', source: 'plan' } }), card('0002', { lastChange: { day: '2026-11-12', source: 'file' } })]));
        const days = [...container.querySelectorAll('.card-change')];
        expect(days.map((day) => day.textContent)).toEqual(['2026-11-10', '2026-11-12']);
        expect(days.map((day) => day.getAttribute('title'))).toEqual(["Last change 2026-11-10, from the plan's Last updated line", 'Last change 2026-11-12, file modification time']);
    });

    it('AC-024: blocked lines, the Deprecated marker, the Problems badge and a duplicated path show as text', async () => {
        const entry = card('0001', {
            state: 'Blocked',
            blocked: ['Blocked: plan status Blocked', 'Blocked: return note activeContext.0001-T-002.md'],
            deprecated: true,
            problems: 2,
            path: '.specs/active/0001-thing.md',
        });
        const text = (await open(boardView([entry]))).querySelector('[data-card]')!.textContent!;
        expect(text).toContain('Blocked: plan status Blocked');
        expect(text).toContain('Blocked: return note activeContext.0001-T-002.md');
        expect(text).toContain('2 problems');
        expect(text).toContain('.specs/active/0001-thing.md');
    });

    it('AC-018: every badge carries an icon beside its text, hidden from assistive technology', async () => {
        const container = await open(boardView([card('0001', { deprecated: true, problems: 1 })]));
        const markers = [...container.querySelectorAll('[data-card] .marker')];
        expect(markers).toHaveLength(2);
        markers.forEach((marker) => {
            const icon = marker.querySelector('svg');
            expect(icon?.getAttribute('aria-hidden')).toBe('true');
            expect(marker.textContent?.trim().length).toBeGreaterThan(0);
        });
        container.querySelectorAll('.column-heading').forEach((heading) => expect(heading.querySelector('svg')).not.toBeNull());
    });

    it('AC-022: the sort control offers exactly the keys of the view', async () => {
        const two = await open(boardView([card('0001')], { sortKeys: ['number', 'title'] }));
        expect([...two.querySelector('select')!.options].map((option) => option.textContent)).toEqual(['Number', 'Title A–Z']);
    });
});

describe('AC-008: opening a card', () => {
    it('AC-001: a click and Enter send the select request with the stem and no navigation', async () => {
        const container = await open(boardView([card('0001'), card('0002')]));
        await click(container.querySelectorAll<HTMLElement>('[data-card]')[0]!);
        expect(requests('select')).toEqual([{ stem: '0001-thing' }]);
        expect(requests('navigate')).toEqual([]);
        mounted?.unmount();
        const again = await open(boardView([card('0001'), card('0002')]));
        await pressKey(again.querySelectorAll<HTMLElement>('[data-card]')[1]!, 'Enter');
        expect(requests('select')[1]).toEqual({ stem: '0002-thing' });
    });

    it('a card of a duplicated stem sends its path', async () => {
        const container = await open(boardView([card('0004', { path: '.specs/backlog/0004-thing.md' })]));
        await click(container.querySelector<HTMLElement>('[data-card]')!);
        expect(requests('select')).toEqual([{ stem: '0004-thing', path: '.specs/backlog/0004-thing.md' }]);
    });
});

describe('AC-012, AC-022: the filter bar', () => {
    it('the filter bar group is named Filters, from the text module', async () => {
        const container = await open();
        expect(container.querySelector('.filter-bar')?.getAttribute('aria-label')).toBe('Filters');
    });

    it('AC-017: the board offers no checkbox and no filter control of its own, only the sort select', async () => {
        const container = await open(boardView([card('0001')]));
        expect(container.querySelectorAll('input, fieldset, legend')).toHaveLength(0);
        expect(container.querySelectorAll('.filter-bar select')).toHaveLength(1);
        expect(container.querySelector('.filter-bar')!.textContent).not.toMatch(/Provider|No run|Named set|State/);
    });

    it('AC-017: a state filter from a navigation request shows one chip "Filter: Review" with Clear filters', async () => {
        const container = await open(boardView([card('0001', { state: 'Review' })], { filter: { states: ['Review'] } }));
        const chips = container.querySelectorAll('[data-filter-chip]');
        expect(chips).toHaveLength(1);
        expect(chips[0]!.textContent).toBe('Filter: Review');
        expect([...container.querySelectorAll('button')].filter((button) => button.textContent === 'Clear filters')).toHaveLength(1);
        const wide = [...container.querySelectorAll('[data-column]')].filter((column) => !column.hasAttribute('data-narrow'));
        expect(wide.map((column) => column.getAttribute('data-column'))).toEqual(['Review']);
        expect(container.querySelectorAll('[data-narrow]')).toHaveLength(5);
    });

    it('AC-017: several states are joined by a comma in board order', async () => {
        const container = await open(boardView([card('0001')], { filter: { states: ['Active', 'Blocked'] } }));
        expect(container.querySelector('[data-filter-chip]')?.textContent).toBe('Filter: Active, Blocked');
    });

    it('a named set is shown under its label as a set filter, and Clear filters sends the request', async () => {
        const container = await open(boardView([card('0001')], { filter: { set: { label: 'Needs attention', stems: ['0001-thing'] } } }));
        expect(container.querySelector('[data-filter-chip]')?.textContent).toBe('Filter: Needs attention');
        const clear = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Clear filters')!;
        await click(clear);
        expect(requests('boardClearFilters')).toEqual([{}]);
    });

    it('Clear filters is offered only while a filter is set (negative control)', async () => {
        const container = await open(boardView([card('0001')]));
        expect([...container.querySelectorAll('button')].some((button) => button.textContent === 'Clear filters')).toBe(false);
    });

    it('the sort control offers the three orders and sends the chosen one', async () => {
        const container = await open();
        const select = container.querySelector('select')!;
        expect([...select.options].map((option) => option.textContent)).toEqual(['Number', 'Title A–Z', 'Last change (newest first)']);
        await (async () => {
            const { act } = await import('react');
            await act(async () => {
                const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!;
                setter.call(select, 'title');
                select.dispatchEvent(new Event('change', { bubbles: true }));
            });
        })();
        expect(requests('boardSetSort')).toEqual([{ sort: 'title' }]);
    });

    it('AC-005: no control offers a priority filter or sort', async () => {
        const container = await open();
        expect(container.textContent?.toLowerCase()).not.toContain('priority');
    });

    it('AC-024: the chip\'s Clear filters and the sort control are reachable by keyboard', async () => {
        const container = await open(boardView([card('0001')], { filter: { states: ['Done'] } }));
        const controls = [...container.querySelectorAll<HTMLElement>('.filter-bar input, .filter-bar select, .filter-bar button')];
        expect(controls.map((control) => control.tagName)).toEqual(['BUTTON', 'SELECT']);
        controls.forEach((control) => expect(control.tabIndex).toBeGreaterThanOrEqual(0));
    });
});

describe('AC-021, AC-020, AC-012: in-area states', () => {
    it('a project with no specs shows "No specs yet" with the /sdd-specify hint', async () => {
        const container = await open(boardView([]));
        const empty = container.querySelector('.board-empty')!;
        expect(empty.textContent).toContain('No specs yet. Start with /sdd-specify');
        expect(empty.textContent).not.toContain('Run /sdd-specify');
        await click([...empty.querySelectorAll('button')].find((button) => /Copy/.test(button.textContent ?? ''))!);
        expect(requests('copyText')).toEqual([{ text: '/sdd-specify' }]);
    });

    it('AC-014: a column that shows no card is a narrow strip with icon, name, count, no card list and no hint, and the accessible name of the text table', async () => {
        const view = boardView([card('0001', { state: 'Backlog' }), card('0002', { state: 'Done' })]);
        view.columns[2] = { state: 'Active', cards: [], hidden: 3, emptyBeforeFilter: false, count: 0, narrow: 'filtered' };
        const container = await open(view);
        const strips = [...container.querySelectorAll('[data-narrow]')];
        expect(strips.map((strip) => strip.getAttribute('data-column'))).toEqual(['Ready', 'Active', 'Review', 'Blocked']);
        expect(strips.map((strip) => strip.getAttribute('aria-label'))).toEqual(['Ready: no spec', 'Active: 3 hidden by filter', 'Review: no spec', 'Blocked: no spec']);
        for (const strip of strips) {
            expect(strip.querySelector('svg')).not.toBeNull();
            expect(strip.querySelector('.column-name')?.textContent).toBe(strip.getAttribute('data-column'));
            expect(strip.querySelectorAll('ul, li, p, [data-card]')).toHaveLength(0);
        }
        expect(strips[1]!.querySelector('.column-count')?.textContent).toBe('0');
        expect(strips[1]!.getAttribute('title')).toBe('Active: 3 hidden by filter');
        expect(strips[0]!.querySelector('.column-count')?.textContent).toBe('0');
        const wide = [...container.querySelectorAll('[data-column]')].filter((column) => !column.hasAttribute('data-narrow'));
        expect(wide.map((column) => column.getAttribute('data-column'))).toEqual(['Backlog', 'Done']);
        expect(container.textContent).not.toMatch(/No spec in the backlog|No spec is ready|No spec is being implemented|hidden by filter\s*$/);
    });

    it('0022 AC-009: a strip that stands for a spec with a Problem shows the warning, and its name and tooltip end with the problem count before the rule text', async () => {
        const view = boardView([card('0001', { state: 'Backlog' })]);
        view.columns[3] = { state: 'Review', cards: [], hidden: 2, emptyBeforeFilter: false, count: 0, narrow: 'filtered', problems: 1 };
        view.columns[4] = { state: 'Done', cards: [], hidden: 0, emptyBeforeFilter: false, count: 3, narrow: 'collapsed', problems: 2 };
        const container = await open(view);
        const review = container.querySelector('[data-column="Review"]')!;
        expect(review.getAttribute('aria-label')).toBe('Review: 2 hidden by filter · 1 problem');
        expect(review.getAttribute('title')).toBe('Review: 2 hidden by filter · 1 problem · Plan done, waiting for review · Derived from the files · rule S-REVIEW');
        expect(review.querySelector('.column-problem svg')?.getAttribute('data-icon')).toBe('diagnostic');
        const done = container.querySelector('[data-column="Done"]')!;
        expect(done.getAttribute('aria-label')).toBe('Done: 3 specs, collapsed · 2 problems');
        expect(done.getAttribute('title')).toBe('Done: 3 specs, collapsed · 2 problems');
        expect(done.querySelector('.column-problem')).not.toBeNull();
    });

    it('0022 AC-009: every other strip and every wide column is as 0018 AC-014 has it, with no warning', async () => {
        const view = boardView([card('0001', { state: 'Backlog' })]);
        view.columns[3] = { state: 'Review', cards: [], hidden: 2, emptyBeforeFilter: false, count: 0, narrow: 'filtered' };
        const container = await open(view);
        expect(container.querySelector('[data-column="Review"]')?.getAttribute('aria-label')).toBe('Review: 2 hidden by filter');
        expect(container.querySelector('.column-problem')).toBeNull();
    });

    it('AC-012: a wide column that a filter partly empties still says how many are hidden', async () => {
        const view = boardView([card('0001')]);
        view.columns[2] = { state: 'Active', cards: [card('0009')], hidden: 3, emptyBeforeFilter: false, count: 1 };
        const container = await open(view);
        expect(container.querySelector('[data-column="Active"]')!.textContent).toContain('3 hidden by filter');
    });

    it('AC-020: the Ready, Review and Blocked headers carry the sentence and the rule text, a narrow strip its text first, and no other header has a tooltip', async () => {
        const wide = await open(boardView([card('0001', { state: 'Ready' }), card('0002', { state: 'Review' }), card('0003', { state: 'Blocked' }), card('0004', { state: 'Backlog' }), card('0005'), card('0006', { state: 'Done' })]));
        const titles = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('[data-column]')].map((column) => column.querySelector('.column-heading')?.getAttribute('title') ?? null);
        expect(titles(wide)).toEqual([null, 'Plan written, not started yet · Derived from the files · rule S-READY', null, 'Plan done, waiting for review · Derived from the files · rule S-REVIEW', null, 'Plan or return note says Blocked · Derived from the files · rule S-BLOCKED']);
        mounted?.unmount();
        const narrow = await open(boardView([card('0004', { state: 'Backlog' })]));
        const strips = [...narrow.querySelectorAll('[data-narrow]')];
        expect(strips.map((strip) => strip.getAttribute('title'))).toEqual([
            'Ready: no spec · Plan written, not started yet · Derived from the files · rule S-READY',
            'Active: no spec',
            'Review: no spec · Plan done, waiting for review · Derived from the files · rule S-REVIEW',
            'Done: no spec',
            'Blocked: no spec · Plan or return note says Blocked · Derived from the files · rule S-BLOCKED',
        ]);
        expect(strips.map((strip) => strip.getAttribute('aria-label'))).toEqual(['Ready: no spec', 'Active: no spec', 'Review: no spec', 'Done: no spec', 'Blocked: no spec']);
    });

    it('AC-009: the banner lists each project-level Problem under the heading Problems', async () => {
        const container = await open(boardView([card('0001')], { banner: { problems: [{ where: '.memory-bank/activeContext.0099-T-001.md', reason: 'return note matches no spec' }, { where: '.specs/backlog', reason: 'could not be listed' }], notes: [] } }));
        const banner = container.querySelector('[data-banner]')!;
        expect(banner.textContent).toContain('Problems');
        expect(banner.textContent).not.toContain('Project diagnostics');
        expect(banner.textContent).toContain('.memory-bank/activeContext.0099-T-001.md: return note matches no spec');
        expect(banner.textContent).toContain('.specs/backlog: could not be listed');
        expect(banner.getAttribute('aria-label')).toBe('Problems');
        expect(banner.querySelector('.format-notes')).toBeNull();
    });

    it('0022 AC-013, AC-002: a banner line shows the place with break opportunities, the sentence, and the reason as tooltip; without a sentence the reason', async () => {
        const container = await open(boardView([card('0001')], { banner: { problems: [{ where: '.specs/backlog', reason: 'could not be listed', sentence: 'Studio could not read the backlog folder.' }, { where: 'project', reason: 'plain reason' }], notes: [] } }));
        const lines = [...container.querySelectorAll('[data-banner] li')];
        expect(lines.map((line) => line.textContent)).toEqual(['.specs/backlog: Studio could not read the backlog folder.', 'project: plain reason']);
        expect(lines.map((line) => line.getAttribute('title'))).toEqual(['could not be listed', null]);
        expect(lines[0]!.querySelectorAll('wbr').length).toBeGreaterThan(0);
    });

    it('0022 AC-002: the path of a card breaks after a separator and keeps its text', async () => {
        const container = await open(boardView([card('0001', { path: '.specs/active/0001-thing.md' })]));
        const path = container.querySelector('.card-path')!;
        expect(path.textContent).toBe('.specs/active/0001-thing.md');
        expect(path.querySelectorAll('wbr').length).toBeGreaterThan(0);
    });

    it('AC-009: project-level format notes sit behind a collapsed toggle; the banner is named by it while no Problem exists', async () => {
        const container = await open(boardView([card('0001')], { banner: { problems: [], notes: [{ where: 'project', reason: 'newer than known' }] } }));
        const banner = container.querySelector('[data-banner]')!;
        const toggle = banner.querySelector('button')!;
        expect(toggle.textContent).toBe('1 format note — no action needed');
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(banner.getAttribute('aria-label')).toBe('1 format note — no action needed');
        expect(banner.querySelector('strong')).toBeNull();
        expect(banner.querySelector<HTMLElement>('.format-notes-list')!.hidden).toBe(true);
        await click(toggle);
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(banner.querySelector<HTMLElement>('.format-notes-list')!.hidden).toBe(false);
        expect(banner.textContent).toContain('project: newer than known');
    });

    it('AC-009 control: the banner does not render while neither exists', async () => {
        expect((await open(boardView([card('0001')]))).querySelector('[data-banner]')).toBeNull();
    });

    it('the board has no loading or error state of its own: with no board event it renders an empty area', async () => {
        const client = createClient({ post: (message) => void posted.push(message) });
        clients.push(client);
        client.start();
        mounted = await mount(<App client={client} />);
        await send(shellEvent(baseView({ area: 'board' }), 1));
        expect(mounted.container.querySelector('.board')?.textContent).toBe('');
    });
});

describe('0013 AC-009, AC-010: card layout', () => {
    function follows(first: Element | null, second: Element | null): boolean {
        return first !== null && second !== null && (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    }

    it('AC-009: number and title, the steps bar, the criteria and the next-step line follow in DOM order, and the card has one steps bar', async () => {
        const entry = (await open(boardView([card('0007', { state: 'Review', step: STEP })]))).querySelector('[data-card]')!;
        const head = entry.querySelector('.card-head');
        const bars = [...entry.querySelectorAll('[role="progressbar"]')];
        const criteria = entry.querySelector('.card-criteria');
        expect(head?.textContent).toContain('0007');
        expect(head?.textContent).toContain('Thing 0007');
        expect(bars.map((bar) => bar.getAttribute('aria-label'))).toEqual(['Steps']);
        expect(follows(head, bars[0] ?? null)).toBe(true);
        expect(follows(bars[0] ?? null, criteria)).toBe(true);
        expect(follows(criteria, entry.querySelector('.card-step'))).toBe(true);
        expect(entry.lastElementChild?.classList.contains('card-step')).toBe(true);
    });

    it('AC-009: where 0007 delivers no figure nothing shows for it and no progressbar is drawn', async () => {
        const entry = (await open(boardView([card('0001', { tasks: undefined, criteria: undefined })]))).querySelector('[data-card]')!;
        expect(entry.querySelectorAll('[role="progressbar"]')).toHaveLength(0);
        expect(entry.textContent).not.toMatch(/Steps|Criteria|not available/);
    });

    it('AC-014 (0016): a Backlog card shows its need as text without icon, the rule only in the tooltip; the Deprecated marker shows on a card without a need', async () => {
        const entry = (
            await open(boardView([card('0001', { state: 'Backlog', need: { text: 'needs a plan', rule: 'R-3' } }), card('0003', { state: 'Ready' }), card('0002', { state: 'Review', deprecated: true })]))
        ).querySelectorAll('[data-card]');
        const need = entry[0]!.querySelector('.card-need')!;
        expect(need.textContent).toBe('needs a plan');
        expect(need.getAttribute('title')).toBe('Not Ready yet · rule R-3');
        expect(need.querySelector('svg')).toBeNull();
        expect(entry[2]!.querySelector('.card-need')).toBeNull();
        expect(entry[2]!.querySelector('.card-state [data-marker="deprecated"]')?.textContent?.trim()).toBe('Deprecated');
        expect(entry[1]!.querySelector('[data-marker="derived"], .rule-text')).toBeNull();
    });
});

describe('0017 AC-004: the next step on a card', () => {
    it('a card with a step shows "Next", the short form with the full lines as tooltip and a Copy named with the full first line, as its last line', async () => {
        const container = await open(boardView([card('0008', { step: TWO })]));
        const entry = container.querySelector('[data-card]')!;
        const line = entry.querySelector('.card-step')!;
        expect(entry.lastElementChild).toBe(line);
        expect(line.querySelector('.step-label')?.textContent).toBe('Next');
        expect(line.querySelector('.step-short')?.textContent).toBe('Implement T-003');
        expect(line.querySelector('.step-intent')?.textContent).toBe('Continue');
        expect(line.querySelector('.step-text')?.textContent).toBe('Next Continue · Implement T-003');
        expect(line.querySelector('code.step-short')).not.toBeNull();
        expect(line.querySelector('.step-intent')?.tagName).toBe('SPAN');
        expect(line.querySelector('.step-text')?.getAttribute('title')).toBe('Continue with T-003 Reject money values\nImplement T-003 of .specs/active/0008-y.plan.md\nNot sure where it stands? Let the agent report first\n/sdd-plan .specs/active/0008-y.md');
        const copy = line.querySelector('button')!;
        expect(copy.className).toContain('copy-icon');
        expect(copy.textContent).toBe('');
        expect(copy.getAttribute('aria-label')).toBe('Copy prompt: Implement T-003 of .specs/active/0008-y.plan.md');
        expect(entry.textContent).not.toContain('continue');
    });

    it('a Ready card shows Start T-003 and a card of a spec without a step shows no such line (negative control)', async () => {
        const container = await open(boardView([card('0007', { state: 'Ready', step: STEP }), card('0009', { state: 'Done' })]));
        const cards = [...container.querySelectorAll('[data-card]')];
        expect(cards.find((entry) => entry.getAttribute('data-card')?.includes('0007'))?.querySelector('.step-short')?.textContent).toBe('Start T-003');
        const done = cards.find((entry) => entry.getAttribute('data-card')?.includes('0009'))!;
        expect(done.querySelector('.card-step, .step-text, .copy-button')).toBeNull();
        expect(done.textContent).not.toContain('Next');
    });
});

describe('0017 AC-005: Copy on a card', () => {
    function copies(container: HTMLElement): HTMLButtonElement[] {
        return [...container.querySelectorAll<HTMLButtonElement>('.card-step button')];
    }

    it('a click posts one copyText with the full first line, and opens nothing, selects nothing', async () => {
        const container = await open(boardView([card('0007', { state: 'Ready', step: STEP }), card('0008', { step: TWO })]));
        await click(copies(container)[0]!);
        expect(requests('copyText')).toEqual([{ text: 'Start T-003 of .specs/backlog/0007-x.plan.md' }]);
        expect(requests('navigate')).toEqual([]);
        expect(requests('select')).toEqual([]);
        expect(container.querySelector('.board')).not.toBeNull();
    });

    it('Enter and Space on a reached Copy each post one copyText and open nothing', async () => {
        const container = await open(boardView([card('0008', { step: TWO })]));
        const copy = copies(container)[0]!;
        await act(async () => copy.focus());
        await pressKey(copy, 'Enter');
        await pressKey(copy, ' ');
        expect(requests('copyText')).toEqual([{ text: 'Implement T-003 of .specs/active/0008-y.plan.md' }, { text: 'Implement T-003 of .specs/active/0008-y.plan.md' }]);
        expect(requests('navigate')).toEqual([]);
        expect(requests('select')).toEqual([]);
    });

    it('the feedback shows at that Copy only, as Copied, and as Could not copy after a failure', async () => {
        const container = await open(boardView([card('0007', { state: 'Ready', step: STEP }), card('0008', { step: TWO })]));
        await click(copies(container)[0]!);
        await send({ v: 9, kind: 'evt', type: 'copyResult', payload: { ok: true, text: COPIED_TEXT } });
        expect(copies(container).map((button) => button.getAttribute('aria-label')?.split(':')[0])).toEqual(['Copied', 'Copy prompt']);
        expect(container.querySelectorAll('.card-step [role="status"]')[0]?.textContent).toBe(COPIED_TEXT);
        expect(container.querySelectorAll('.card-step [role="status"]')[1]?.textContent).toBe('');
        await click(copies(container)[1]!);
        await send({ v: 9, kind: 'evt', type: 'copyResult', payload: { ok: false, text: COPY_FAILED_TEXT } });
        expect(copies(container)[1]?.getAttribute('aria-label')?.split(':')[0]).toBe('Could not copy');
    });

    it('the card does not open, even when the click lands on the step text next to Copy', async () => {
        const container = await open(boardView([card('0008', { step: TWO })]));
        await click(container.querySelector('.step-text')!);
        expect(requests('navigate')).toEqual([]);
    });
});

describe('AC-016: the Done toggle', () => {
    function collapsed(count: number) {
        const view = boardView([card('0001', { state: 'Backlog' })], { doneToggle: 'show' });
        view.columns[4] = { state: 'Done', cards: [], hidden: 0, emptyBeforeFilter: false, count, narrow: 'collapsed' };
        return view;
    }

    it('collapsed Done is a strip with the count, the §7 name and a Show Done button; no Done card is in the document', async () => {
        for (const [count, name] of [[1, 'Done: 1 spec, collapsed'], [3, 'Done: 3 specs, collapsed']] as const) {
            const container = await open(collapsed(count));
            const strip = container.querySelector('[data-column="Done"]')!;
            expect(strip.getAttribute('data-narrow')).toBe('collapsed');
            expect(strip.getAttribute('aria-label')).toBe(name);
            expect(strip.querySelector('.column-count')?.textContent).toBe(String(count));
            expect(strip.querySelectorAll('[data-card], ul')).toHaveLength(0);
            const toggle = strip.querySelector('button')!;
            expect(toggle.getAttribute('aria-label')).toBe('Show Done');
            expect(toggle.getAttribute('aria-expanded')).toBe('false');
            mounted?.unmount();
        }
    });

    it('expanded Done keeps its cards and offers Hide Done; a click sends the request', async () => {
        const container = await open(boardView([card('0006', { state: 'Done' })], { doneToggle: 'hide' }));
        expect(container.querySelectorAll('[data-column="Done"] [data-card]')).toHaveLength(1);
        const toggle = container.querySelector<HTMLElement>('[data-column="Done"] button')!;
        expect(toggle.getAttribute('aria-label')).toBe('Hide Done');
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        await click(toggle);
        expect(requests('boardSetDone')).toEqual([{ expanded: false }]);
    });

    it('there is no toggle while the view carries none (no Done spec, or a filter is set), and no other column has one', async () => {
        const container = await open(boardView([card('0001', { state: 'Done' })]));
        expect(container.querySelectorAll('[data-done-toggle]')).toHaveLength(0);
        mounted?.unmount();
        const withToggle = await open(boardView([card('0001', { state: 'Active' }), card('0002', { state: 'Done' })], { doneToggle: 'hide' }));
        expect(withToggle.querySelectorAll('[data-done-toggle]')).toHaveLength(1);
        expect(withToggle.querySelector('[data-done-toggle]')?.closest('[data-column]')?.getAttribute('data-column')).toBe('Done');
    });
});

describe('0022 AC-026: column headers and strips take motif and colour from the one table', () => {
    it('every column, wide or narrow, carries the colour ID and its heading icon the motif of STATE_LOOK', async () => {
        const container = await open(boardView([card('0004', { state: 'Active' }), card('0005', { state: 'Review' })]));
        const columns = [...container.querySelectorAll<HTMLElement>('[data-column]')];
        expect(columns.map((column) => column.getAttribute('data-column'))).toEqual([...BOARD_STATES]);
        expect(columns.some((column) => column.hasAttribute('data-narrow'))).toBe(true);
        expect(columns.some((column) => !column.hasAttribute('data-narrow'))).toBe(true);
        for (const column of columns) {
            const state = column.getAttribute('data-column') as (typeof BOARD_STATES)[number];
            expect(column.getAttribute('data-tint'), state).toBe(STATE_LOOK[state].colour);
            const icon = column.querySelector('.column-heading svg');
            expect(icon?.getAttribute('data-motif'), state).toBe(STATE_LOOK[state].motif);
            expect(icon?.getAttribute('data-tint'), state).toBe(STATE_LOOK[state].colour);
        }
    });
});
