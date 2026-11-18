import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SpecDetailView } from '../../../shared/protocol/detail';
import type { Envelope } from '../../../shared/protocol/envelope';
import { NARROW_QUERY } from '../../../shared/protocol/layout';
import type { SelectedSpec } from '../../../shared/protocol/messages';
import type { PlanSpecView, PlanView } from '../../../shared/protocol/planMap';
import { planSample } from '../../../shared/protocol/testing/planSample';
import { App } from '../../App';
import { boardEvent, boardView, card } from '../../board/testing/views';
import { createClient, type ShellClient } from '../../client';
import { detailEvent, detailView, PLAN_KEY } from '../../detail/testing/views';
import { baseView, click, mount, send, shellEvent, type Mounted } from '../../testing/dom';

let posted: Envelope[];
let mounted: Mounted | undefined;
let seq: number;
const clients: ShellClient[] = [];

const original = window.matchMedia;
let narrow: boolean;

beforeEach(() => {
    posted = [];
    seq = 0;
    narrow = false;
    window.matchMedia = ((query: string) => ({
        get matches() {
            return query === NARROW_QUERY && narrow;
        },
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
    window.matchMedia = original;
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

function spec(number: string, overrides: Partial<PlanSpecView> = {}): PlanSpecView {
    return { stem: `${number}-thing`, number, title: `Thing ${number}`, problems: [], ...overrides };
}

const LIST: PlanSpecView[] = [spec('0003'), spec('0007'), spec('0009', { problems: [{ sentence: 'Its plan link points to a file that is missing.', reason: 'plan link x points to a missing file' }] })];

function selected(number: string): SelectedSpec {
    return { stem: `${number}-thing`, number };
}

async function start(): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    return mounted.container;
}

async function show(options: { selection?: SelectedSpec; detail?: SpecDetailView | { kind: 'none' }; planSpecs?: PlanSpecView[] } = {}): Promise<HTMLElement> {
    const container = mounted?.container ?? (await start());
    seq += 1;
    await send(shellEvent(baseView({ area: 'planMap', selection: options.selection }), seq));
    await send(boardEvent(boardView([card('0003'), card('0007')], { planSpecs: options.planSpecs ?? LIST })));
    if (options.detail !== undefined) {
        await send(detailEvent(options.detail));
    }
    return container;
}

function detailWith(plan: SpecDetailView['plan'] | undefined, overrides: Partial<SpecDetailView> = {}): SpecDetailView {
    const view = detailView(overrides) as SpecDetailView;
    const { plan: _plan, ...rest } = view;
    return plan === undefined ? rest : { ...rest, plan };
}

function requests(type: string): unknown[] {
    return posted.filter((message) => message.type === type).map((message) => message.payload);
}

function map(container: HTMLElement): HTMLElement {
    return container.querySelector<HTMLElement>('[data-plan-map]')!;
}

function buttons(container: HTMLElement): HTMLButtonElement[] {
    return [...map(container).querySelectorAll<HTMLButtonElement>('button[data-spec-stem]')];
}

describe('0023 AC-007: the Plan map shows a state when it has no plan to show, and the specs that have one', () => {
    it('no spec selected: the sentence and the list of specs with a plan, one button each, in the order of the board view', async () => {
        const container = await show();
        expect(container.querySelector('h1')?.textContent).toBe('Plan map');
        expect(map(container).textContent).toContain('Select a spec with a plan to see its stages.');
        expect(map(container).querySelector('h3')?.textContent).toBe('Specs with a plan');
        expect(buttons(container).map((button) => button.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['0003 Thing 0003', '0007 Thing 0007', '0009 Thing 0009']);
    });

    it('a Done spec, a spec without a plan and a spec with an unreadable plan each name their state, then the list', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(undefined, { state: 'Done' }) });
        expect(map(container).textContent).toContain('0007 is done.');
        expect(buttons(container)).toHaveLength(3);
        await show({ selection: selected('0007'), detail: detailWith(undefined, { state: 'Backlog' }) });
        expect(map(container).textContent).toContain('0007 has no plan yet.');
        expect(map(container).textContent).not.toContain('is done.');
        await show({ selection: selected('0007'), detail: detailWith({ kind: 'unreadable' }) });
        expect(map(container).textContent).toContain('0007: Studio cannot read its plan');
        expect(buttons(container)).toHaveLength(3);
    });

    it('without a spec that has a plan there is no "Specs with a plan" and no button', async () => {
        const container = await show({ planSpecs: [] });
        expect(map(container).textContent).toContain('Select a spec with a plan to see its stages.');
        expect(map(container).querySelector('h3')).toBeNull();
        expect(buttons(container)).toEqual([]);
        expect(map(container).textContent).not.toContain('Specs with a plan');
    });

    it('a spec with a Problem carries the warning with its sentence as tooltip and description on its button', async () => {
        const container = await show();
        const [first, , third] = buttons(container);
        expect(first!.querySelector('svg[data-icon="diagnostic"]')).toBeNull();
        expect(third!.querySelector('svg[data-icon="diagnostic"]')).not.toBeNull();
        expect(third!.title).toContain('Its plan link points to a file that is missing.');
        const described = third!.getAttribute('aria-describedby');
        expect(document.getElementById(described!)?.textContent).toContain('Its plan link points to a file that is missing.');
    });

    it('a button selects its spec, keeps the tab, and the map heading takes the focus once the spec shows', async () => {
        const container = await show();
        await click(buttons(container)[1]!);
        expect(requests('select')).toEqual([{ stem: '0007-thing' }]);
        expect(requests('navigate')).toEqual([]);
        await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        expect(container.querySelector('h1')?.textContent).toBe('Plan map');
        const heading = map(container).querySelector<HTMLElement>('[data-map-heading]')!;
        expect(heading.textContent).toContain('0007');
        expect(document.activeElement).toBe(heading);
    });

    it('a selection that changes in the tree, the Overview or the Board shows the new spec in the tab', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        expect(map(container).querySelector('[data-map-heading]')?.textContent).toContain('Thing 0007');
        await show({ selection: selected('0003'), detail: detailWith(planSample(), { stem: '0003-thing', number: '0003', title: 'Thing 0003', key: '.specs/active/0003-thing.md' }) });
        expect(map(container).querySelector('[data-map-heading]')?.textContent).toContain('Thing 0003');
    });

    it('a selected spec whose detail has not arrived shows its number alone, with the list', async () => {
        const container = await show({ selection: selected('0003') , detail: detailWith(planSample()) });
        await show({ selection: selected('0009') });
        expect(map(container).querySelector('[data-map-heading]')).toBeNull();
        expect(map(container).textContent).toContain('0009');
        expect(buttons(container)).toHaveLength(3);
    });
});

describe('0023 AC-008: the header of the Plan map', () => {
    it('shows number and title, the count, the link to the plan and the plan\'s closing line whole', async () => {
        const closing = 'Parallel: stage 2 (add vs. subtract: separate files) — and a very long reason that the side panel would cut at eighty characters but the map shows whole.';
        const plan: PlanView = planSample({ closing: { text: closing, short: 'cut', full: closing } });
        const container = await show({ selection: selected('0007'), detail: detailWith(plan) });
        const header = map(container).querySelector<HTMLElement>('.plan-map-header')!;
        expect(header.querySelector('h2')?.textContent).toBe('0007 Thing 0007');
        expect(header.querySelector('.progress-text')?.textContent).toBe('2 of 5 done');
        expect(header.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('2');
        expect(header.querySelector('.plan-map-closing')?.textContent).toBe(`The plan says: ${closing}`);
        const link = [...header.querySelectorAll<HTMLButtonElement>('button.file-link')].find((button) => button.textContent === 'Open plan')!;
        await click(link);
        expect(requests('openFile')).toEqual([{ key: PLAN_KEY, line: 1 }]);
    });

    it('formats inline Markdown of the closing line and shows no closing paragraph without one', async () => {
        const plan = planSample({ closing: { text: 'Parallel: stage 2 — **separate** `files`.', short: 'x', full: 'x' } });
        const container = await show({ selection: selected('0007'), detail: detailWith(plan) });
        const closing = map(container).querySelector('.plan-map-closing')!;
        expect(closing.querySelector('strong')?.textContent).toBe('separate');
        expect(closing.querySelector('code')?.textContent).toBe('files');
        const { closing: _closing, ...without } = planSample();
        await show({ selection: selected('0007'), detail: detailWith(without as PlanView) });
        expect(map(container).querySelector('.plan-map-closing')).toBeNull();
    });

    it('a plan without a countable step says so instead of a count', async () => {
        const { count: _count, ...without } = planSample();
        const container = await show({ selection: selected('0007'), detail: detailWith(without as PlanView) });
        expect(map(container).querySelector('.plan-map-header')?.textContent).toContain('No steps in the plan');
        expect(map(container).querySelector('[role="progressbar"]')).toBeNull();
    });

    it('a spec with a Problem shows the warning at its heading, its sentences as tooltip and description', async () => {
        const problems = [{ sentence: 'Its plan link points to a file that is missing.', reason: 'plan link x points to a missing file' }];
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample(), { problems }) });
        const mark = map(container).querySelector<HTMLElement>('.plan-map-header [data-marker="problems"]')!;
        expect(mark.textContent).toContain('1 problem');
        expect(mark.title).toBe('Its plan link points to a file that is missing.');
        expect(document.getElementById(mark.getAttribute('aria-describedby')!)?.textContent).toBe('Its plan link points to a file that is missing.');
        await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        expect(map(container).querySelector('[data-marker="problems"]')).toBeNull();
    });
});

describe('0023 AC-007: below 900 px the map shows alone, from 900 px the side panel stands beside it', () => {
    it('stubbed query: from 900 px the side panel and the divider are beside the map', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        expect(container.querySelector('aside.side-panel')).not.toBeNull();
        expect(container.querySelector('.area-frame')?.getAttribute('data-layout')).toBeNull();
        expect(container.querySelector('aside.side-panel button.detail-back')).toBeNull();
    });

    it('stubbed query: below 900 px no detail, no back button, no inert content; the map is shown whole', async () => {
        narrow = true;
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        expect(container.querySelector('aside.side-panel')).toBeNull();
        expect(container.querySelector('button.detail-back')).toBeNull();
        expect(container.querySelector('.area-frame')?.getAttribute('data-layout')).toBeNull();
        expect(container.querySelector('.area-content')?.hasAttribute('inert')).toBe(false);
        expect(map(container).querySelector('[data-map-heading]')?.textContent).toContain('Thing 0007');
    });

    it('closing the side panel beside the map shows the list and puts the focus on that spec\'s button', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        const close = container.querySelector<HTMLButtonElement>('aside.side-panel button[aria-label*="Close"]')!;
        await act(async () => close.focus());
        await click(close);
        expect(requests('clearSelection')).toHaveLength(1);
        await show({ selection: undefined });
        expect(map(container).textContent).toContain('Select a spec with a plan to see its stages.');
        expect(container.querySelector('aside.side-panel')).toBeNull();
        expect(document.activeElement).toBe(buttons(container).find((button) => button.getAttribute('data-spec-stem') === '0007-thing'));
    });
});
