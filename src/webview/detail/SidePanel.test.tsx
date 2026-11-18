import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../shared/protocol/envelope';
import { sampleView, sharedSpecView } from '../../shared/protocol/testing/overviewSample';
import type { OverviewView } from '../../shared/protocol/overview';
import type { SelectedSpec } from '../../shared/protocol/messages';
import { App } from '../App';
import { createClient, type ShellClient } from '../client';
import { boardEvent, boardView, card } from '../board/testing/views';
import { baseView, click, mount, overviewEvent, pressKey, send, shellEvent, type Mounted } from '../testing/dom';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

const STEP = { short: '/sdd-plan', line: '/sdd-plan .specs/active/0004-thing.md', lines: [{ text: '/sdd-plan .specs/active/0004-thing.md' }] };
const THREE = [card('0003'), card('0004', { step: STEP }), card('0006')];

function selection(number: string): SelectedSpec {
    return { stem: `${number}-thing`, number };
}

async function start(): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    return mounted.container;
}

async function board(selected?: SelectedSpec, seq = 1): Promise<HTMLElement> {
    const container = mounted?.container ?? (await start());
    await send(shellEvent(baseView({ area: 'board', selection: selected }), seq));
    await send(boardEvent(boardView(THREE)));
    return container;
}

function messages(type: string): unknown[] {
    return posted.filter((message) => message.type === type).map((message) => message.payload);
}

function cardOf(container: HTMLElement, number: string): HTMLElement {
    return container.querySelector<HTMLElement>(`[data-card="${number}-thing"], [data-card="${number}"], [data-card][data-stem="${number}-thing"]`) ?? [...container.querySelectorAll<HTMLElement>('[data-card]')].find((node) => node.textContent?.includes(number))!;
}

function panel(container: HTMLElement): Element | null {
    return container.querySelector('aside.side-panel');
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('AC-001: selecting a spec keeps the area', () => {
    it('click, Enter and Space on three board cards send three select requests, no navigate, and the area stays the Board', async () => {
        const container = await board();
        await click(cardOf(container, '0003'));
        await pressKey(cardOf(container, '0004'), 'Enter');
        await pressKey(cardOf(container, '0006'), ' ');
        expect(messages('select')).toEqual([{ stem: '0003-thing' }, { stem: '0004-thing' }, { stem: '0006-thing' }]);
        expect(messages('navigate')).toEqual([]);
        await send(shellEvent(baseView({ area: 'board', selection: selection('0006') }), 2));
        expect(container.querySelector('h1')?.textContent).toBe('Board');
        expect(panel(container)?.querySelector('h2')?.textContent).toContain('0006');
    });

    it('an Overview row sends select and no navigate', async () => {
        const container = await start();
        const view: OverviewView = sampleView();
        await send(shellEvent(baseView({ area: 'overview' }), 1));
        await send(overviewEvent(view));
        const rows = container.querySelectorAll<HTMLElement>('.ov-row');
        expect(rows.length).toBeGreaterThan(0);
        await click(rows[0]!);
        expect(messages('select')).toHaveLength(1);
        expect(messages('navigate')).toEqual([]);
    });
});

describe('AC-002: the side panel exists exactly while a spec is selected', () => {
    it('no selection, no panel; a selection shows a complementary region next to the area', async () => {
        const container = await board();
        expect(panel(container)).toBeNull();
        await send(shellEvent(baseView({ area: 'board', selection: selection('0003') }), 2));
        expect(panel(container)?.getAttribute('role')).toBe('complementary');
        expect(panel(container)?.getAttribute('aria-label')).toBe('Spec detail');
        expect(container.querySelector('.area-frame > .area-content')).not.toBeNull();
    });

    it('switching the area by hand keeps the selection and the panel', async () => {
        const container = await board(selection('0003'));
        await send(shellEvent(baseView({ area: 'overview', selection: selection('0003') }), 2));
        expect(container.querySelector('h1')?.textContent).toBe('Overview');
        expect(panel(container)).not.toBeNull();
    });

    it('0020: the panel has no area without a side panel; the navigation offers only Overview and Board, and both show it', async () => {
        const container = await start();
        await send(shellEvent(baseView({ area: 'overview', selection: selection('0003') }), 1));
        expect(panel(container)).not.toBeNull();
        expect([...container.querySelectorAll('nav button')].map((button) => button.textContent?.trim())).toEqual(['Overview', 'Board']);
    });
});

describe('AC-006: a remembered selection', () => {
    it('shows the panel on the first view and leaves focus where it was', async () => {
        const container = await start();
        const before = document.activeElement;
        await send(shellEvent(baseView({ area: 'board', selection: selection('0004') }), 1));
        await send(boardEvent(boardView(THREE)));
        expect(panel(container)).not.toBeNull();
        expect(document.activeElement).toBe(before);
        expect(container.contains(document.activeElement) && panel(container)?.contains(document.activeElement)).toBe(false);
    });
});

describe('AC-007: the selected spec is marked', () => {
    it('exactly the selected spec carries aria-current', async () => {
        const container = await board(selection('0004'));
        const current = [...container.querySelectorAll('[aria-current="true"]')].filter((node) => node.hasAttribute('data-card'));
        expect(current).toHaveLength(1);
        expect(current[0]).toBe(cardOf(container, '0004'));
        await send(shellEvent(baseView({ area: 'board', selection: undefined }), 2));
        expect(container.querySelectorAll('[data-card][aria-current]')).toHaveLength(0);
    });
});

describe('0019 G3, AC-007: the Overview rows of the selected spec are marked', () => {
    it('every Overview row of the selected spec carries aria-current, the rows of other specs do not', async () => {
        const container = await start();
        await send(shellEvent(baseView({ area: 'overview', selection: { stem: '0001-a', number: '0001' } }), 1));
        await send(overviewEvent(sharedSpecView()));
        const rows = [...container.querySelectorAll<HTMLElement>('[data-spec-row] .ov-row')];
        expect(rows.map((row) => [row.closest('[data-spec-row]')?.getAttribute('data-spec-row'), row.getAttribute('aria-current')])).toEqual([
            ['0001-a', 'true'],
            ['0002-x', null],
            ['0001-a', 'true'],
        ]);
        await send(shellEvent(baseView({ area: 'overview', selection: undefined }), 2));
        expect(container.querySelectorAll('.ov-row[aria-current]')).toHaveLength(0);
    });
});
