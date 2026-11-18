import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../shared/protocol/envelope';
import { COPIED_TEXT, COPY_FAILED_TEXT } from '../../shared/protocol/nextStepTexts';
import type { StepView } from '../../shared/protocol/stepView';
import { formatLastChange } from '../../shared/protocol/texts';
import { App } from '../App';
import { createClient, type ShellClient } from '../client';
import { baseView, click, mount, pressKey, send, shellEvent, type Mounted } from '../testing/dom';
import { boardEvent, boardView, card } from './testing/views';

const STEP: StepView = { short: 'Start T-003', line: 'Start T-003 of .specs/backlog/0007-x.plan.md', lines: [{ text: 'Start T-003 of .specs/backlog/0007-x.plan.md' }] };
const TWO: StepView = {
    short: '/sdd-plan',
    line: '/sdd-plan .specs/active/0008-y.md',
    lines: [{ text: '/sdd-plan .specs/active/0008-y.md' }, { text: 'continue', label: 'Then, in the same chat, if nothing blocks:' }],
};

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(view = boardView([card('0001')]), area: 'board' | 'specExplorer' = 'board'): Promise<HTMLElement> {
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

    it('shows number, title, state text, description, figures and last change', async () => {
        const entry = card('0007', { derivedRule: 'S-REVIEW', state: 'Review' });
        const text = (await open(boardView([entry]))).querySelector('[data-card]')!.textContent!;
        expect(text).toContain('0007');
        expect(text).toContain('Thing 0007');
        expect(text).toContain('Review');
        expect(text).toContain('Plan done, waiting for review');
        expect(text).not.toMatch(/S-REVIEW/);
        expect(text).toContain('A summary.');
        expect(text).toContain('Tasks: 3 of 7');
        expect(text).toContain('Criteria: 1 of 4 verified');
        expect(text).toContain(`Last change: ${formatLastChange(Date.UTC(2026, 10, 16, 9, 30))}`);
    });

    it('0015 AC-011: the card shows no run line, whatever the run state of the spec was', async () => {
        const container = await open(boardView([card('0001', { state: 'Active' })]));
        expect(container.querySelector('.card-run')).toBeNull();
        expect(container.querySelector('[data-card]')!.textContent).not.toMatch(/No run|Runs: not available|history unreadable/);
    });

    it('AC-004, AC-006: no summary and unavailable figures read as text, never as zero', async () => {
        const text = (await open(boardView([card('0001', { summary: undefined, tasks: undefined, criteria: undefined, lastChangeMs: undefined })]))).querySelector('[data-card]')!.textContent!;
        expect(text).toContain('No summary');
        expect(text).toContain('Tasks: not available');
        expect(text).toContain('Criteria: not available');
        expect(text).toContain('Last change: not available');
    });

    it('AC-024: blocked lines, the readiness line, the Deprecated marker, the diagnostic badge and a duplicated path show as text', async () => {
        const entry = card('0001', {
            state: 'Blocked',
            blocked: ['Blocked: plan status Blocked', 'Blocked: return note activeContext.0001-T-002.md'],
            need: { text: 'needs a plan', rule: 'R-3' },
            deprecated: true,
            problems: 2,
            path: '.specs/active/0001-thing.md',
        });
        const text = (await open(boardView([entry]))).querySelector('[data-card]')!.textContent!;
        expect(text).toContain('Blocked: plan status Blocked');
        expect(text).toContain('Blocked: return note activeContext.0001-T-002.md');
        expect(text).toContain('needs a plan');
        expect(text).not.toContain('R-3');
        expect(text).toContain('Deprecated');
        expect(text).toContain('2 problems');
        expect(text).toContain('.specs/active/0001-thing.md');
    });

    it('0016 AC-006, AC-007: the badge reads 1 problem for one Problem and is absent at 0 (negative control)', async () => {
        const one = (await open(boardView([card('0001', { problems: 1 })]))).querySelector('[data-card]')!;
        expect(one.querySelector('[data-marker="problems"]')?.textContent?.trim()).toBe('1 problem');
        const none = (await open(boardView([card('0002', { problems: 0 })]))).querySelector('[data-card]')!;
        expect(none.querySelector('[data-marker="problems"]')).toBeNull();
        expect(none.textContent).not.toMatch(/problem|diagnostic/i);
    });

    it('AC-018: every state and every badge carries an icon beside its text, hidden from assistive technology', async () => {
        const container = await open(boardView([card('0001', { derivedRule: 'S-REVIEW', deprecated: true, problems: 1 })]));
        const markers = [...container.querySelectorAll('[data-card] .marker')];
        expect(markers).toHaveLength(4);
        markers.forEach((marker) => {
            const icon = marker.querySelector('svg');
            expect(icon?.getAttribute('aria-hidden')).toBe('true');
            expect(marker.textContent?.trim().length).toBeGreaterThan(0);
        });
        container.querySelectorAll('.column-heading').forEach((heading) => expect(heading.querySelector('svg')).not.toBeNull());
    });
});

describe('AC-008: opening a card', () => {
    it('a click and Enter send the navigation request to Spec Explorer with the stem', async () => {
        const container = await open(boardView([card('0001'), card('0002')]));
        await click(container.querySelectorAll<HTMLElement>('[data-card]')[0]!);
        expect(requests('navigate')).toEqual([{ area: 'specExplorer', target: { kind: 'spec', stem: '0001-thing' } }]);
        mounted?.unmount();
        const again = await open(boardView([card('0001'), card('0002')]));
        await pressKey(again.querySelectorAll<HTMLElement>('[data-card]')[1]!, 'Enter');
        expect(requests('navigate')[1]).toEqual({ area: 'specExplorer', target: { kind: 'spec', stem: '0002-thing' } });
    });

    it('a card of a duplicated stem sends its path', async () => {
        const container = await open(boardView([card('0004', { path: '.specs/backlog/0004-thing.md' })]));
        await click(container.querySelector<HTMLElement>('[data-card]')!);
        expect(requests('navigate')).toEqual([{ area: 'specExplorer', target: { kind: 'spec', stem: '0004-thing', path: '.specs/backlog/0004-thing.md' } }]);
    });
});

describe('AC-012, AC-022: the filter bar', () => {
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
        view.columns[2] = { state: 'Active', cards: [], hidden: 3, emptyBeforeFilter: false, count: 3, narrow: 'filtered' };
        const container = await open(view);
        const strips = [...container.querySelectorAll('[data-narrow]')];
        expect(strips.map((strip) => strip.getAttribute('data-column'))).toEqual(['Ready', 'Active', 'Review', 'Blocked']);
        expect(strips.map((strip) => strip.getAttribute('aria-label'))).toEqual(['Ready: no spec', 'Active: 3 hidden by filter', 'Review: no spec', 'Blocked: no spec']);
        for (const strip of strips) {
            expect(strip.querySelector('svg')).not.toBeNull();
            expect(strip.querySelector('.column-name')?.textContent).toBe(strip.getAttribute('data-column'));
            expect(strip.querySelectorAll('ul, li, p, [data-card]')).toHaveLength(0);
        }
        expect(strips[1]!.querySelector('.column-count')?.textContent).toBe('3');
        expect(strips[0]!.querySelector('.column-count')?.textContent).toBe('0');
        const wide = [...container.querySelectorAll('[data-column]')].filter((column) => !column.hasAttribute('data-narrow'));
        expect(wide.map((column) => column.getAttribute('data-column'))).toEqual(['Backlog', 'Done']);
        expect(container.textContent).not.toMatch(/No spec in the backlog|No spec is ready|No spec is being implemented|hidden by filter\s*$/);
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

    it('AC-009: number and title, one state chip, summary, the tasks and criteria progressbars and the next-step line follow in DOM order', async () => {
        const entry = (await open(boardView([card('0007', { state: 'Review', derivedRule: 'S-REVIEW', step: STEP })]))).querySelector('[data-card]')!;
        const head = entry.querySelector('.card-head');
        const chips = entry.querySelectorAll('.state-chip');
        const summary = entry.querySelector('.card-summary');
        const bars = [...entry.querySelectorAll('[role="progressbar"]')];
        expect(head?.textContent).toContain('0007');
        expect(head?.textContent).toContain('Thing 0007');
        expect(chips).toHaveLength(1);
        expect(chips[0]?.textContent?.trim()).toBe('Review');
        expect(chips[0]?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
        expect(bars.map((bar) => bar.getAttribute('aria-label'))).toEqual(['Tasks', 'Criteria verified']);
        expect(follows(head, chips[0] ?? null)).toBe(true);
        expect(follows(chips[0] ?? null, summary)).toBe(true);
        expect(follows(summary, bars[0] ?? null)).toBe(true);
        expect(follows(bars[0] ?? null, bars[1] ?? null)).toBe(true);
        expect(follows(bars[1] ?? null, entry.querySelector('.card-step'))).toBe(true);
        expect(entry.lastElementChild?.classList.contains('card-step')).toBe(true);
    });

    it('AC-009: the progressbars carry value, maximum and the figure text', async () => {
        const entry = (await open(boardView([card('0007')]))).querySelector('[data-card]')!;
        const [tasks, criteria] = [...entry.querySelectorAll('[role="progressbar"]')];
        expect([tasks?.getAttribute('aria-valuenow'), tasks?.getAttribute('aria-valuemax')]).toEqual(['3', '7']);
        expect([criteria?.getAttribute('aria-valuenow'), criteria?.getAttribute('aria-valuemax')]).toEqual(['1', '4']);
        expect(entry.textContent).toContain('Tasks: 3 of 7');
        expect(entry.textContent).toContain('Criteria: 1 of 4 verified');
    });

    it('AC-009: where 0007 delivers no figure only "not available" shows, no progressbar', async () => {
        const entry = (await open(boardView([card('0001', { tasks: undefined, criteria: undefined })]))).querySelector('[data-card]')!;
        expect(entry.querySelectorAll('[role="progressbar"]')).toHaveLength(0);
        expect(entry.textContent).toContain('Tasks: not available');
        expect(entry.textContent).toContain('Criteria: not available');
    });

    it('AC-014 (0016): a Backlog card shows its need as text without icon, the rule only in the tooltip; the Deprecated marker sits beside the chip', async () => {
        const entry = (
            await open(boardView([card('0001', { state: 'Backlog', derivedRule: undefined, deprecated: true, need: { text: 'needs a plan', rule: 'R-3' } }), card('0002', { state: 'Review', derivedRule: 'S-REVIEW' }), card('0003', { state: 'Ready' })]))
        ).querySelectorAll('[data-card]');
        const need = entry[0]!.querySelector('.card-need')!;
        expect(need.textContent).toBe('needs a plan');
        expect(need.getAttribute('title')).toBe('Not Ready yet · rule R-3');
        expect(need.querySelector('svg')).toBeNull();
        expect(entry[1]!.querySelector('.card-need')).toBeNull();
        expect(entry[0]!.querySelector('.card-state [data-marker="deprecated"]')?.textContent?.trim()).toBe('Deprecated');
        const derived = entry[2]!.querySelector('.card-state [data-marker="derived"]')!;
        expect(derived.querySelector('.rule-sentence')?.textContent).toBe('Plan done, waiting for review');
        expect(derived.querySelector('.rule-text')?.getAttribute('title')).toBe('Derived from the files · rule S-REVIEW');
    });
});

describe('0017 AC-004: the next step on a card', () => {
    it('a card with a step shows "Next", the short form with the full lines as tooltip and a Copy named with the full first line, as its last line', async () => {
        const container = await open(boardView([card('0008', { step: TWO })]));
        const entry = container.querySelector('[data-card]')!;
        const line = entry.querySelector('.card-step')!;
        expect(entry.lastElementChild).toBe(line);
        expect(line.querySelector('.step-label')?.textContent).toBe('Next');
        expect(line.querySelector('.step-short')?.textContent).toBe('/sdd-plan');
        expect(line.querySelector('.step-text')?.getAttribute('title')).toBe('/sdd-plan .specs/active/0008-y.md\nThen, in the same chat, if nothing blocks: continue');
        const copy = line.querySelector('button')!;
        expect(copy.textContent).toBe('Copy');
        expect(copy.getAttribute('aria-label')).toBe('Copy: /sdd-plan .specs/active/0008-y.md');
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
        expect(requests('copyText')).toEqual([{ text: '/sdd-plan .specs/active/0008-y.md' }, { text: '/sdd-plan .specs/active/0008-y.md' }]);
        expect(requests('navigate')).toEqual([]);
        expect(requests('select')).toEqual([]);
    });

    it('the feedback shows at that Copy only, as Copied, and as Could not copy after a failure', async () => {
        const container = await open(boardView([card('0007', { state: 'Ready', step: STEP }), card('0008', { step: TWO })]));
        await click(copies(container)[0]!);
        await send({ v: 2, kind: 'evt', type: 'copyResult', payload: { ok: true, text: COPIED_TEXT } });
        expect(copies(container).map((button) => button.textContent)).toEqual(['Copied', 'Copy']);
        expect(container.querySelectorAll('.card-step [role="status"]')[0]?.textContent).toBe(COPIED_TEXT);
        expect(container.querySelectorAll('.card-step [role="status"]')[1]?.textContent).toBe('');
        await click(copies(container)[1]!);
        await send({ v: 2, kind: 'evt', type: 'copyResult', payload: { ok: false, text: COPY_FAILED_TEXT } });
        expect(copies(container)[1]?.textContent).toBe('Could not copy');
    });

    it('the card does not open, even when the click lands on the step text next to Copy', async () => {
        const container = await open(boardView([card('0008', { step: TWO })]));
        await click(container.querySelector('.step-text')!);
        expect(requests('navigate')).toEqual([]);
    });
});
