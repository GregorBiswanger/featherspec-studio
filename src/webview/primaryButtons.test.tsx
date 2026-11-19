import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../shared/protocol/envelope';
import type { SelectedSpec } from '../shared/protocol/messages';
import type { OverviewRow, OverviewView } from '../shared/protocol/overview';
import { sampleView } from '../shared/protocol/testing/overviewSample';
import { App } from './App';
import { boardEvent, boardView, card } from './board/testing/views';
import { createClient, type ShellClient } from './client';
import { detailEvent, detailView } from './detail/testing/views';
import { baseView, click, mount, overviewEvent, send, shellEvent, type Mounted } from './testing/dom';
import { planSample } from '../shared/protocol/testing/planSample';
import type { SpecDetailView } from '../shared/protocol/detail';

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
const NS6 = { rule: 'NS-6', lines: [{ text: 'Implement T-003 of .specs/active/0001-r.plan.md', intent: 'Continue with T-003 Reject money values' }, { text: '/sdd-plan .specs/active/0001-r.md', intent: 'Not sure where it stands? Let the agent report first' }] };

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
        now: { rows: ['0001', '0002', '0003', '0004', '0005'].map((n) => row(n)), more: 2, stems: ['0001', '0002', '0003', '0004', '0005', '0006', '0007'].map((n) => `${n}-r`) },
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
        await send(detailEvent(detailView({ stem: options.selection.stem, number: options.selection.number }, NS6)));
    }
    return mounted.container;
}

const CARDS = ['0001', '0002', '0003'].map((n) => card(n, { stem: `${n}-r`, step: step(n)! }));

describe('0022 AC-011: at most two primary buttons per view', () => {
    it('the Overview with seven Now entries (five rows), three Up next rows, a Problems row and a selected NS-5 spec has exactly two: the first Now row and the first line of the side panel', async () => {
        const container = await open('overview', { overview: fullView(), selection: SELECTED });
        const found = primaries(container);
        expect(found).toHaveLength(2);
        expect(found[0]?.closest('[data-spec-row]')?.getAttribute('data-spec-row')).toBe('0001-r');
        expect(found[0]?.closest('[data-now]')).not.toBeNull();
        expect(found[1]?.closest('aside.side-panel')).not.toBeNull();
        const all = [...container.querySelectorAll<HTMLElement>('.ov-row-item button.copy-icon')];
        expect(all).toHaveLength(4 + 3 + 1);
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
        const view: OverviewView = { ...fullView(), now: { rows: [row('0001', false), row('0002')], more: 0, stems: [] } };
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

describe('0023 AC-010: the Plan map adds no primary button', () => {
    async function openMap(selection: SelectedSpec | undefined): Promise<HTMLElement> {
        const client = createClient({ post: (message) => void posted.push(message) });
        clients.push(client);
        client.start();
        mounted = await mount(<App client={client} />);
        await send(shellEvent(baseView({ area: 'planMap', selection }), 1));
        await send(boardEvent(boardView(CARDS)));
        if (selection !== undefined) {
            const view = detailView({ stem: selection.stem, number: selection.number }, NS6) as SpecDetailView;
            await send(detailEvent({ ...view, plan: planSample() }));
            const toggle = mounted.container.querySelector<HTMLButtonElement>('[data-ways] .plan-ways-toggle');
            if (toggle !== null) {
                await click(toggle);
            }
        }
        return mounted.container;
    }

    it('with a selected spec the view has one primary button, the first line of the map header (0025 AC-010), and the map below holds only secondary and icon Copies', async () => {
        const container = await openMap(SELECTED);
        const found = primaries(container);
        expect(found).toHaveLength(1);
        expect(found[0]?.closest('.plan-map-header')).not.toBeNull();
        expect(container.querySelector('aside.side-panel .next-step')).toBeNull();
        const inMap = container.querySelector('[data-plan-map]')!;
        expect(primaries(inMap as HTMLElement)).toHaveLength(1);
        expect(inMap.querySelectorAll('button.copy-secondary').length).toBe(2);
        expect(inMap.querySelectorAll('button.copy-icon').length).toBe(0);
        await click(inMap.querySelectorAll<HTMLInputElement>('input[type="radio"]')[2]!);
        expect(primaries(inMap as HTMLElement)).toHaveLength(1);
        expect(inMap.querySelectorAll('button.copy-secondary').length).toBe(1);
        expect(inMap.querySelectorAll('button.copy-icon').length).toBe(2);
    });

    it('without a selection the view has none', async () => {
        const container = await openMap(undefined);
        expect(primaries(container)).toHaveLength(0);
    });
});

describe('0024 AC-003: a split button counts as one primary action (A-013)', () => {
    const SEND = { assistant: 'copilot', target: 'current', targets: ['new', 'current'] };
    const NS6_SEND = { ...NS6, send: SEND };

    it('with an offer the Overview with a selected spec still has two primaries: the main part of the first Now row and the main part of the detail; the arrow parts are no primary', async () => {
        const view = fullView();
        view.now.rows[0] = { ...view.now.rows[0]!, send: SEND as never };
        const container = await open('overview', { overview: view, selection: SELECTED });
        await send(detailEvent(detailView({ stem: SELECTED.stem, number: SELECTED.number }, NS6_SEND as never)));
        const found = primaries(container);
        expect(found).toHaveLength(2);
        expect(found.every((button) => button.classList.contains('send-main'))).toBe(true);
        expect(found[0]?.closest('[data-now]')).not.toBeNull();
        expect(found[1]?.closest('aside.side-panel')).not.toBeNull();
        expect(container.querySelectorAll('button.send-arrow')).toHaveLength(2);
        expect([...container.querySelectorAll('button.send-arrow')].every((button) => !button.classList.contains('copy-button'))).toBe(true);
    });
});


describe('0025 AC-026: no primary control while U-08 shows', () => {
    const SEND = { assistant: 'copilot', target: 'current', targets: ['new', 'current'] };
    const INTEGRATE = { rule: 'NS-6', lines: [{ text: '/sdd-plan .specs/active/0001-r.md', intent: 'Integrate the returned work' }] };

    async function quietView(options: { quiet: boolean; send: boolean }): Promise<HTMLElement> {
        const view = fullView();
        view.now.rows[0] = { ...view.now.rows[0]!, ...(options.quiet ? { quiet: true as const } : {}), ...(options.send ? { send: SEND as never } : {}) };
        const container = await open('overview', { overview: view, selection: SELECTED });
        const next = { ...INTEGRATE, ...(options.send ? { send: SEND } : {}), ...(options.quiet ? { quiet: true } : {}) };
        await send(detailEvent(detailView({ stem: SELECTED.stem, number: SELECTED.number }, next as never)));
        return container;
    }

    it.each([false, true])('0025 AC-026: with Send offered = %s, the first Now row and the detail hold no primary and every Copy or split part is secondary', async (offered) => {
        const container = await quietView({ quiet: true, send: offered });
        expect(primaries(container)).toHaveLength(0);
        if (offered) {
            expect(container.querySelectorAll('button.send-main.copy-secondary')).toHaveLength(2);
            expect(container.querySelectorAll('button.send-arrow.send-arrow-secondary')).toHaveLength(2);
        }
    });

    it.each([false, true])('0025 AC-026: with U-05 (not quiet), Send offered = %s, the first Now row and the detail are primary again', async (offered) => {
        const container = await quietView({ quiet: false, send: offered });
        expect(primaries(container)).toHaveLength(2);
    });
});

describe('0025 AC-010: the map with its side panel has at most one primary button', () => {
    const SEND = { assistant: 'copilot', target: 'current', targets: ['new', 'current'] };

    async function openMapWith(nextStep: object): Promise<HTMLElement> {
        const client = createClient({ post: (message) => void posted.push(message) });
        clients.push(client);
        client.start();
        mounted = await mount(<App client={client} />);
        await send(shellEvent(baseView({ area: 'planMap', selection: SELECTED }), 1));
        await send(boardEvent(boardView(CARDS)));
        const view = detailView({ stem: SELECTED.stem, number: SELECTED.number }, nextStep as never) as SpecDetailView;
        await send(detailEvent({ ...view, plan: planSample() }));
        return mounted.container;
    }

    it('0025 AC-010: with a line and no U-08 the header holds exactly one primary, with or without Send, and the side panel none', async () => {
        for (const next of [NS6, { ...NS6, send: SEND }]) {
            const container = await openMapWith(next);
            const found = primaries(container);
            expect(found).toHaveLength(1);
            expect(found[0]?.closest('.plan-map-header')).not.toBeNull();
            expect(primaries(container.querySelector<HTMLElement>('aside.side-panel')!)).toHaveLength(0);
            mounted?.unmount();
            clients.splice(0).forEach((client) => client.stop());
        }
    });

    it('0025 AC-010: while someone is out (U-08, quiet) the header holds no primary at all', async () => {
        const container = await openMapWith({ ...NS6, quiet: true });
        expect(primaries(container)).toHaveLength(0);
    });
});
