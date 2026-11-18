import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../../shared/protocol/envelope';
import type { MissionControlView } from '../../../shared/protocol/missionControl';
import { sampleView } from '../../../shared/protocol/testing/missionControlSample';
import { App } from '../../App';
import { createClient, type ShellClient } from '../../client';
import { baseView, click, isKeyboardReachable, missionControlEvent, mount, send, shellEvent, type Mounted } from '../../testing/dom';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(view?: MissionControlView, client?: ShellClient): Promise<HTMLElement> {
    const made = client ?? createClient({ post: (message) => void posted.push(message) });
    clients.push(made);
    made.start();
    mounted = await mount(<App client={made} />);
    await send(shellEvent(baseView({ area: 'overview' }), 1));
    if (view !== undefined) {
        await send(missionControlEvent(view));
    }
    return mounted.container;
}

function area(container: HTMLElement): HTMLElement {
    return container.querySelector<HTMLElement>('[data-mission-control]')!;
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
        expect(container.querySelector('[data-mission-control-empty]')).not.toBeNull();
        expect(container.textContent).not.toContain('Loading project…');
        expect(container.querySelector('[data-mission-control]')).toBeNull();
    });

    it('a valid missionControl event fills the area; an invalid one is ignored and the view stays as it was', async () => {
        const container = await open(sampleView());
        expect(area(container).textContent).toContain('Total');
        await send(missionControlEvent({ header: 'broken' }));
        await send(missionControlEvent({ ...sampleView(), extra: 'SECRET-1' }));
        expect(area(container).textContent).toContain('Total');
        expect(container.textContent).not.toContain('SECRET-1');
    });
});

describe('AC-017, AC-019: header', () => {
    it('shows the problem count, singular for one, and no folder, version or time (0018 AC-025 moved them to the project name)', async () => {
        const view = sampleView();
        const header = area(await open(view)).querySelector('[data-header]')!;
        expect(header.textContent).toContain('1 problem');
        expect(header.textContent).not.toContain('1 problems');
        expect(header.textContent).not.toContain('demo');
        expect(header.textContent).not.toContain('FeatherSpec');
        expect(header.textContent).not.toContain('Updated');
    });

    it('shows "n problems" in the plural', async () => {
        const view = sampleView();
        view.header.problems = 2;
        const header = area(await open(view)).querySelector('[data-header]')!;
        expect(header.querySelector('[data-drill="problems"]')?.textContent).toBe('2 problems');
    });

    it('AC-008: with no Problem the header shows no problem element and no count', async () => {
        const view = sampleView();
        view.header.problems = 0;
        view.header.problemStems = [];
        const header = area(await open(view)).querySelector('[data-header]')!;
        expect(header.querySelector('[data-drill]')).toBeNull();
        expect(header.textContent).not.toMatch(/problem|diagnostic/i);
    });
});

describe('AC-001, AC-002, AC-025: spec counts', () => {
    it('shows the total, the six states with their counts as text, "of which Deprecated" and the derived label with the rule ID', async () => {
        const view = sampleView();
        view.specs = {
            kind: 'counts',
            total: 9,
            states: [
                { state: 'Backlog', count: 2 },
                { state: 'Ready', count: 1, derivedRule: 'S-READY' },
                { state: 'Active', count: 1 },
                { state: 'Review', count: 1, derivedRule: 'S-REVIEW' },
                { state: 'Done', count: 3, deprecated: 1 },
                { state: 'Blocked', count: 1, derivedRule: 'S-BLOCKED' },
            ],
            progress: { kind: 'value', percent: 25, done: 2, divisor: 8 },
        };
        const specs = area(await open(view)).querySelector('[data-specs]')!;
        expect(specs.querySelector('h2')?.textContent).toBe('Specs');
        expect(specs.textContent).toContain('Total 9');
        const rows = [...specs.querySelectorAll('[data-state-count]')].map((row) => row.textContent);
        expect(rows).toEqual([
            'Backlog 2',
            'Ready 1Plan written, not started yet',
            'Active 1',
            'Review 1Plan done, waiting for review',
            'Done 3of which Deprecated: 1',
            'Blocked 1Plan or return note says Blocked',
        ]);
    });

    it('AC-003: progress shows the percentage, both numbers and the formula text', async () => {
        const view = sampleView();
        const text = area(await open(view)).querySelector('[data-progress]')!.textContent!;
        expect(text).toContain('Progress 50 % (1 of 2)');
        expect(text).toContain('Done specs with status Implemented or Baseline ÷ (all specs − Deprecated), rounded down');
    });

    it('AC-004: with no divisor progress reads "not available" and shows no percentage', async () => {
        const view = sampleView();
        if (view.specs.kind === 'counts') {
            view.specs.progress = { kind: 'not available' };
        }
        const text = area(await open(view)).querySelector('[data-progress]')!.textContent!;
        expect(text).toContain('Progress: not available');
        expect(text).not.toContain('%');
    });
});

describe('AC-020, AC-028: zero specs', () => {
    it('shows "No specs yet" with the pointer to /sdd-specify in place of counts and progress, and keeps the header', async () => {
        const view = sampleView();
        view.specs = { kind: 'empty' };
        const container = area(await open(view));
        expect(container.textContent).toContain('No specs yet. Run /sdd-specify to write the first one.');
        expect(container.querySelector('[data-specs]')).toBeNull();
        expect(container.querySelector('[data-progress]')).toBeNull();
        expect(container.querySelector('[data-header]')).not.toBeNull();
    });

    it('control: with specs the message is not shown', async () => {
        expect(area(await open(sampleView())).textContent).not.toContain('No specs yet');
    });
});

describe('0013 AC-004, AC-005: stat tiles, distribution bar and progress', () => {
    function countsView(states: { state: 'Backlog' | 'Ready' | 'Active' | 'Review' | 'Done' | 'Blocked'; count: number }[]): MissionControlView {
        const view = sampleView();
        const total = states.reduce((sum, entry) => sum + entry.count, 0);
        view.specs = {
            kind: 'counts',
            total,
            states: states.map((entry) =>
                entry.state === 'Ready' ? { ...entry, derivedRule: 'S-READY' as const } : entry.state === 'Review' ? { ...entry, derivedRule: 'S-REVIEW' as const } : entry.state === 'Blocked' ? { ...entry, derivedRule: 'S-BLOCKED' as const } : entry.state === 'Done' ? { ...entry, deprecated: 0 } : entry,
            ),
            progress: { kind: 'value', percent: 0, done: 0, divisor: total },
        };
        return view;
    }
    const FIVE_SEVEN = countsView([
        { state: 'Backlog', count: 5 },
        { state: 'Ready', count: 0 },
        { state: 'Active', count: 0 },
        { state: 'Review', count: 7 },
        { state: 'Done', count: 0 },
        { state: 'Blocked', count: 0 },
    ]);

    it('AC-004: six tiles in board order, each one native button with count, state name and state icon; Ready, Review and Blocked carry the sentence with the rule ID', async () => {
        const tiles = [...area(await open(FIVE_SEVEN)).querySelectorAll<HTMLButtonElement>('.mc-tile')];
        expect(tiles.map((tile) => tile.getAttribute('data-board-state'))).toEqual(['Backlog', 'Ready', 'Active', 'Review', 'Done', 'Blocked']);
        for (const tile of tiles) {
            const state = tile.getAttribute('data-board-state')!;
            expect(tile.tagName).toBe('BUTTON');
            expect(tile.tabIndex).toBe(0);
            expect(tile.querySelector('.mc-tile-name')?.textContent).toBe(state);
            expect(tile.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
            expect(tile.querySelector('.mc-tile-count')?.textContent).toMatch(/^\d+$/);
            const rule = tile.querySelector('.rule-text')?.getAttribute('title')?.replace('Derived from the files · rule ', '');
            expect(rule).toBe(state === 'Ready' ? 'S-READY' : state === 'Review' ? 'S-REVIEW' : state === 'Blocked' ? 'S-BLOCKED' : undefined);
        }
        expect(tiles[3]?.querySelector('.rule-sentence')?.textContent).toBe('Plan done, waiting for review');
        expect(tiles[0]?.querySelector('.mc-tile-count')?.textContent).toBe('5');
    });

    it('AC-004: activating a tile sends the state request of 0006 BR-08', async () => {
        const container = await open(FIVE_SEVEN);
        const review = area(container).querySelector<HTMLButtonElement>('.mc-tile[data-board-state="Review"]')!;
        await click(review);
        expect(posted.filter((message) => message.type === 'navigate').map((message) => message.payload)).toEqual([{ area: 'board', target: { kind: 'boardFilter', filter: { states: ['Review'] } } }]);
    });

    it('AC-005: 5 Backlog and 7 Review give two segments, 41.7 % and 58.3 % wide, named "Backlog: 5 of 12" and "Review: 7 of 12"; no segment for 0', async () => {
        const bar = area(await open(FIVE_SEVEN)).querySelector('.mc-distribution')!;
        expect(bar.getAttribute('role')).toBe('group');
        expect(bar.getAttribute('aria-label')).toBeTruthy();
        const segments = [...bar.querySelectorAll<HTMLElement>('.mc-segment')];
        expect(segments.map((segment) => segment.getAttribute('aria-label'))).toEqual(['Backlog: 5 of 12', 'Review: 7 of 12']);
        expect(segments.map((segment) => segment.getAttribute('data-board-state'))).toEqual(['Backlog', 'Review']);
        const widths = segments.map((segment) => Number.parseFloat(segment.style.width));
        expect(Math.abs((widths[0] ?? 0) - 41.7)).toBeLessThanOrEqual(1);
        expect(Math.abs((widths[1] ?? 0) - 58.3)).toBeLessThanOrEqual(1);
        for (const segment of segments) {
            expect(segment.getAttribute('style')).toMatch(/^width: [\d.]+%;?$/);
        }
    });

    it('AC-005: the progress figure shows 0006 BR-04\'s rule as visible secondary text and as tooltip', async () => {
        const progress = area(await open(sampleView())).querySelector<HTMLElement>('[data-progress]')!;
        expect(progress.querySelector('.mc-formula')?.textContent).toBe('Done specs with status Implemented or Baseline ÷ (all specs − Deprecated), rounded down');
        expect(progress.getAttribute('title')).toBe('Done specs with status Implemented or Baseline ÷ (all specs − Deprecated), rounded down');
    });

    it('AC-003: Total and every tile are Tab stops', async () => {
        const container = area(await open(FIVE_SEVEN));
        const total = container.querySelector<HTMLButtonElement>('[data-drill="total"]')!;
        expect(isKeyboardReachable(total)).toBe(true);
        const tiles = [...container.querySelectorAll('.mc-tile')];
        expect(tiles).toHaveLength(6);
        expect(tiles.every((tile) => isKeyboardReachable(tile))).toBe(true);
    });
});
