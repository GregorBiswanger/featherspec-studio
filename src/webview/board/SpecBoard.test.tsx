import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../shared/protocol/envelope';
import { cardRunText, formatLastChange } from '../../shared/protocol/texts';
import { App } from '../App';
import { createClient, type ShellClient } from '../client';
import { baseView, click, mount, pressKey, send, shellEvent, type Mounted } from '../testing/dom';
import { boardEvent, boardView, card } from './testing/views';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(view = boardView([card('0001')]), area: 'specBoard' | 'specExplorer' = 'specBoard'): Promise<HTMLElement> {
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

    it('shows number, title, state text, description, figures, last change and run', async () => {
        const entry = card('0007', { derivedRule: 'S-REVIEW', state: 'Review', run: { kind: 'run', provider: 'copilot', status: 'Running' } });
        const text = (await open(boardView([entry]))).querySelector('[data-card]')!.textContent!;
        expect(text).toContain('0007');
        expect(text).toContain('Thing 0007');
        expect(text).toContain('Review');
        expect(text).toContain('Derived: plan is Done, waiting for review');
        expect(text).toContain('A summary.');
        expect(text).toContain('Tasks: 3 of 7');
        expect(text).toContain('Criteria: 1 of 4 verified');
        expect(text).toContain(`Last change: ${formatLastChange(Date.UTC(2026, 10, 16, 9, 30))}`);
        expect(text).toContain('copilot · Running');
    });

    it.each([
        [{ kind: 'none' }, 'No run'],
        [{ kind: 'unavailable' }, 'Runs: not available'],
        [{ kind: 'unreadable', provider: 'copilot' }, 'copilot · history unreadable'],
    ] as const)('AC-007: the run %j reads %s', async (run, expected) => {
        const text = (await open(boardView([card('0001', { run })]))).querySelector('.card-run')!.textContent;
        expect(text).toBe(expected);
        expect(cardRunText(run)).toBe(expected);
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
            readiness: { id: 'R-3', reason: 'No sibling plan.' },
            deprecated: true,
            diagnostics: 2,
            path: '.specs/active/0001-thing.md',
        });
        const text = (await open(boardView([entry]))).querySelector('[data-card]')!.textContent!;
        expect(text).toContain('Blocked: plan status Blocked');
        expect(text).toContain('Blocked: return note activeContext.0001-T-002.md');
        expect(text).toContain('No sibling plan.');
        expect(text).toContain('R-3');
        expect(text).toContain('Deprecated');
        expect(text).toContain('2 diagnostics');
        expect(text).toContain('.specs/active/0001-thing.md');
    });

    it('AC-018: every state and every badge carries an icon beside its text, hidden from assistive technology', async () => {
        const container = await open(boardView([card('0001', { derivedRule: 'S-REVIEW', deprecated: true, diagnostics: 1 })]));
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
    it('the state checkboxes send the full filter; unchecking the last one removes the key', async () => {
        const container = await open(boardView([card('0001')], { filter: { states: ['Active'] } }));
        const boxes = [...container.querySelectorAll<HTMLInputElement>('fieldset:first-of-type input')];
        expect(boxes.map((box) => box.checked)).toEqual([false, false, true, false, false, false]);
        await click(boxes[0]!);
        await click(boxes[2]!);
        expect(requests('boardSetFilter')).toEqual([{ filter: { states: ['Active', 'Backlog'] } }, { filter: {} }]);
    });

    it('the provider checkboxes offer "No run" (null) and the providers of the project', async () => {
        const container = await open(boardView([card('0001')], { providers: ['copilot', 'fake'] }));
        const group = container.querySelectorAll('fieldset')[1]!;
        expect(group.textContent).toContain('No run');
        expect(group.textContent).toContain('copilot');
        await click(group.querySelectorAll('input')[0]!);
        await click(group.querySelectorAll('input')[1]!);
        expect(requests('boardSetFilter')).toEqual([{ filter: { providers: [null] } }, { filter: { providers: ['copilot'] } }]);
    });

    it('a named set is shown under its label as a set filter, and Clear filters sends the request', async () => {
        const container = await open(boardView([card('0001')], { filter: { set: { label: 'Needs attention', stems: ['0001-thing'] } } }));
        expect(container.querySelector('[data-set-chip]')?.textContent).toContain('Needs attention');
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

    it('AC-017: every filter control is reachable by keyboard', async () => {
        const container = await open(boardView([card('0001')], { filter: { states: ['Done'] } }));
        const controls = [...container.querySelectorAll<HTMLElement>('.filter-bar input, .filter-bar select, .filter-bar button')];
        expect(controls.length).toBeGreaterThan(8);
        controls.forEach((control) => expect(control.tabIndex).toBeGreaterThanOrEqual(0));
    });
});

describe('AC-021, AC-020, AC-012: in-area states', () => {
    it('a project with no specs shows "No specs yet" with the /sdd-specify hint', async () => {
        const container = await open(boardView([]));
        expect(container.querySelector('.board-empty')?.textContent).toBe('No specs yet. Run /sdd-specify to write the first one.');
    });

    it('a column with no card before filtering shows its hint; a column emptied by a filter shows "N hidden by filter"', async () => {
        const view = boardView([card('0001')]);
        view.columns[2] = { state: 'Active', cards: [], hidden: 3, emptyBeforeFilter: false };
        const container = await open(view);
        const backlog = container.querySelector('[data-column="Backlog"]')!;
        expect(backlog.textContent).toContain('No spec in the backlog.');
        const active = container.querySelector('[data-column="Active"]')!;
        expect(active.textContent).toContain('3 hidden by filter');
        expect(active.textContent).not.toContain('No spec is being implemented.');
    });

    it('the banner lists each diagnostic with its reason', async () => {
        const container = await open(boardView([card('0001')], { banner: [{ where: 'project', reason: 'Version unverified.' }, { where: '.specs/active/0009-x.plan.md', reason: 'Orphan plan.' }] }));
        const banner = container.querySelector('[data-banner]')!;
        expect(banner.textContent).toContain('Project diagnostics');
        expect(banner.textContent).toContain('project: Version unverified.');
        expect(banner.textContent).toContain('.specs/active/0009-x.plan.md: Orphan plan.');
        expect((await open(boardView([card('0001')]))).querySelector('[data-banner]')).toBeNull();
    });

    it('the board has no loading or error state of its own: with no board event it renders an empty area', async () => {
        const client = createClient({ post: (message) => void posted.push(message) });
        clients.push(client);
        client.start();
        mounted = await mount(<App client={client} />);
        await send(shellEvent(baseView({ area: 'specBoard' }), 1));
        expect(mounted.container.querySelector('.board')?.textContent).toBe('');
    });
});

describe('AC-019: the board is in the DOM within 300 ms of the event (200 cards, 180 in one column)', () => {
    it('renders the update fast enough', async () => {
        const container = await open(boardView([card('0001')]));
        const many = [...Array.from({ length: 180 }, (_, index) => card(String(index + 1).padStart(4, '0'), { state: 'Done' })), ...Array.from({ length: 20 }, (_, index) => card(String(index + 201).padStart(4, '0')))];
        const before = performance.now();
        await send(boardEvent(boardView(many)));
        const elapsed = performance.now() - before;
        expect(container.querySelectorAll('[data-card]')).toHaveLength(200);
        expect(elapsed).toBeLessThan(300);
    });
});
