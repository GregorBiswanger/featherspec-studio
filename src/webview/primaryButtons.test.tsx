import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../shared/protocol/envelope';
import type { SelectedSpec } from '../shared/protocol/messages';
import type { OverviewRow, OverviewView } from '../shared/protocol/overview';
import { sampleView } from '../shared/protocol/testing/overviewSample';
import { App } from './App';
import { boardEvent, boardView, card } from './board/testing/views';
import { createClient, type ShellClient } from './client';
import { detailEvent, detailView } from './detail/testing/views';
import { baseView, mount, overviewEvent, send, shellEvent, type Mounted } from './testing/dom';

let mounted: Mounted | undefined;
const clients: ShellClient[] = [];
let posted: Envelope[];

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

const SELECTED: SelectedSpec = { stem: '0001-r', number: '0001' };
const NS5 = { rule: 'NS-5', lines: [{ text: '/sdd-plan .specs/active/0001-r.md', intent: 'Write the plan' }, { text: 'continue', intent: 'Not sure where it stands? Let the agent report first' }] };

function step(n: string): OverviewRow['step'] {
    const line = `/sdd-plan .specs/active/${n}-r.md`;
    return { intent: 'Plan', short: '/sdd-plan', line, lines: [{ text: line, intent: 'Write the plan' }] };
}

function row(n: string, withStep = true): OverviewRow {
    const spec = { stem: `${n}-r`, number: n, title: `Row ${n}`, found: true };
    return { spec, state: 'Active', status: 'Active', problems: 0, ...(withStep ? { step: step(n) } : {}) };
}

function fullView(): OverviewView {
    return {
        ...sampleView(),
        now: ['0001', '0002', '0003', '0004', '0005', '0006', '0007'].map((n) => row(n)),
        upNext: { rows: ['0008', '0009', '0010'].map((n) => row(n)), more: 0, stems: [] },
        problems: { rows: [{ ...row('0011'), problems: 1, status: 'Studio cannot read this spec' }], lines: [] },
    };
}

function primaries(container: HTMLElement): HTMLButtonElement[] {
    return [...container.querySelectorAll<HTMLButtonElement>('button')].filter((button) => button.classList.contains('copy-button') && !button.classList.contains('copy-secondary'));
}

async function open(area: 'overview' | 'board', options: { overview?: OverviewView; selection?: SelectedSpec; cards?: ReturnType<typeof card>[] } = {}): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area, selection: options.selection }), 1));
    if (options.overview !== undefined) {
        await send(overviewEvent(options.overview));
    }
    await send(boardEvent(boardView(options.cards ?? [])));
    if (options.selection !== undefined) {
        await send(detailEvent(detailView({ stem: options.selection.stem, number: options.selection.number }, NS5)));
    }
    return mounted.container;
}

const CARDS = ['0001', '0002', '0003'].map((n) => card(n, { stem: `${n}-r`, step: step(n)! }));

describe('0022 AC-011: at most two primary buttons per view', () => {
    it('the Overview with seven Now rows, three Up next rows, a Problems row and a selected NS-5 spec has exactly two: the first Now row and the first line of the side panel', async () => {
        const container = await open('overview', { overview: fullView(), selection: SELECTED });
        const found = primaries(container);
        expect(found).toHaveLength(2);
        expect(found[0]?.closest('[data-spec-row]')?.getAttribute('data-spec-row')).toBe('0001-r');
        expect(found[0]?.closest('[data-now]')).not.toBeNull();
        expect(found[1]?.closest('aside.side-panel')).not.toBeNull();
        const all = [...container.querySelectorAll<HTMLElement>('.ov-row-item button.copy-icon')];
        expect(all).toHaveLength(6 + 3 + 1);
        const panel = container.querySelectorAll('aside.side-panel button.next-step-copy');
        expect(panel).toHaveLength(2);
        expect(panel[1]?.classList.contains('copy-secondary')).toBe(true);
    });

    it('the Board with a selected NS-5 spec has exactly one: the first line of the side panel; every card Copy is an icon', async () => {
        const container = await open('board', { selection: SELECTED, cards: CARDS });
        const found = primaries(container);
        expect(found).toHaveLength(1);
        expect(found[0]?.closest('aside.side-panel')).not.toBeNull();
        expect(container.querySelectorAll('.card .copy-icon')).toHaveLength(3);
        expect(container.querySelectorAll('.card .copy-button')).toHaveLength(0);
    });

    it('without a selection the Overview has one and the Board none', async () => {
        const overview = await open('overview', { overview: fullView() });
        expect(primaries(overview)).toHaveLength(1);
        mounted?.unmount();
        mounted = undefined;
        clients.splice(0).forEach((client) => client.stop());
        const board = await open('board', { cards: CARDS });
        expect(primaries(board)).toHaveLength(0);
        expect(board.querySelectorAll('.copy-icon').length).toBeGreaterThan(0);
    });

    it('an Overview whose first Now row has no step has no primary button of its own list; with the side panel open it has one', async () => {
        const view: OverviewView = { ...fullView(), now: [row('0001', false), row('0002')] };
        const alone = await open('overview', { overview: view });
        expect(primaries(alone)).toHaveLength(0);
        expect(alone.querySelectorAll('[data-now] .copy-icon')).toHaveLength(1);
        mounted?.unmount();
        mounted = undefined;
        clients.splice(0).forEach((client) => client.stop());
        const beside = await open('overview', { overview: view, selection: SELECTED });
        expect(primaries(beside)).toHaveLength(1);
    });

    it('the zero-spec Copy is the one primary button of its screen, in the Overview and in the Board', async () => {
        const empty: OverviewView = { ...sampleView(), figures: { kind: 'empty' }, problems: { rows: [], lines: [] } };
        const overview = await open('overview', { overview: empty });
        expect(primaries(overview)).toHaveLength(1);
        expect(overview.querySelector('[data-zero-specs] .copy-button')).not.toBeNull();
        mounted?.unmount();
        mounted = undefined;
        clients.splice(0).forEach((client) => client.stop());
        const board = await open('board', { cards: [] });
        expect(primaries(board)).toHaveLength(1);
        expect(board.querySelector('.board-empty .copy-button')).not.toBeNull();
    });

    it('the Copy of "Nothing up next" is an icon button', async () => {
        const view: OverviewView = { ...fullView(), upNext: { rows: [], more: 0, stems: [] } };
        const container = await open('overview', { overview: view });
        expect(container.querySelector('[data-nothing-up-next] .copy-icon')).not.toBeNull();
        expect(container.querySelector('[data-nothing-up-next] .copy-button')).toBeNull();
    });

    it('negative control: the counter sees a primary button and ignores a secondary one', () => {
        const host = document.createElement('div');
        host.innerHTML = '<button class="copy-button"></button><button class="copy-button copy-secondary"></button><button class="copy-icon"></button>';
        expect(primaries(host)).toHaveLength(1);
    });
});
