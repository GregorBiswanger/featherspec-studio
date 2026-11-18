import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../shared/protocol/envelope';
import type { SelectedSpec, SpecRow } from '../../shared/protocol/messages';
import { NO_DETAIL_SELECTION_TEXT, noticeText } from '../../shared/protocol/texts';
import { App } from '../App';
import { boardEvent, boardView, card } from '../board/testing/views';
import { createClient, type ShellClient } from '../client';
import { baseView, click, mount, pressKey, send, shellEvent, type Mounted } from '../testing/dom';
import { resetSectionMemory } from './sectionMemory';
import { detailEvent, detailView, PLAN_KEY, SPEC_KEY } from './testing/views';

let posted: Envelope[];
let mounted: Mounted | undefined;
let seq: number;
const clients: ShellClient[] = [];

const SELECTED: SelectedSpec = { stem: '0007-thing', number: '0007' };
const CARDS = [card('0003'), card('0007')];

beforeEach(() => {
    posted = [];
    seq = 0;
});

afterEach(() => {
    resetSectionMemory();
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

async function start(): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    return mounted.container;
}

async function shell(area: 'overview' | 'board' | 'specExplorer', selection?: SelectedSpec, rows: SpecRow[] = [], notice?: { number: string }): Promise<void> {
    seq += 1;
    await send(shellEvent(baseView({ area, selection, rows, notice }), seq));
}

async function board(selection?: SelectedSpec, cards = CARDS): Promise<HTMLElement> {
    const container = await start();
    await shell('board', selection);
    await send(boardEvent(boardView(cards)));
    if (selection !== undefined) {
        await send(detailEvent(detailView()));
    }
    return container;
}

function requests(type: string): unknown[] {
    return posted.filter((message) => message.type === type).map((message) => message.payload);
}

function cardOf(container: HTMLElement, number: string): HTMLElement {
    return [...container.querySelectorAll<HTMLElement>('[data-card]')].find((node) => node.textContent?.includes(number))!;
}

function closeButton(container: HTMLElement): HTMLButtonElement {
    return container.querySelector<HTMLButtonElement>('button.detail-close')!;
}

async function focus(element: HTMLElement): Promise<void> {
    await act(async () => element.focus());
}

async function escape(element: HTMLElement): Promise<void> {
    await act(async () => {
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
}

async function openFromCard(container: HTMLElement, number: string): Promise<void> {
    await focus(cardOf(container, number));
    await pressKey(cardOf(container, number), 'Enter');
    await shell('board', SELECTED);
    await send(detailEvent(detailView()));
}

describe('AC-003: closing the side panel', () => {
    it('the close button has the name and the tooltip and sends clearSelection; the host event removes the panel', async () => {
        const container = await board(SELECTED);
        const button = closeButton(container);
        expect(button.getAttribute('aria-label')).toBe('Close spec detail');
        expect(button.getAttribute('title')).toBe('Close (Esc)');
        await click(button);
        expect(requests('clearSelection')).toEqual([{}]);
        await shell('board');
        expect(container.querySelector('aside.side-panel')).toBeNull();
    });

    it('Escape inside the side panel sends clearSelection; Escape outside it sends nothing', async () => {
        const container = await board(SELECTED);
        await escape(cardOf(container, '0003'));
        expect(requests('clearSelection')).toEqual([]);
        await escape(container.querySelector<HTMLElement>('aside.side-panel [data-detail-heading]')!);
        expect(requests('clearSelection')).toEqual([{}]);
    });

    it('closing returns focus to the card that opened the panel while it is shown', async () => {
        const container = await board();
        await openFromCard(container, '0007');
        await focus(closeButton(container));
        await click(closeButton(container));
        await shell('board');
        expect(document.activeElement).toBe(cardOf(container, '0007'));
    });

    it('without the opener closing focuses the first card of the spec', async () => {
        const container = await board();
        await openFromCard(container, '0007');
        await shell('overview', SELECTED);
        await shell('board', SELECTED);
        await focus(closeButton(container));
        await escape(closeButton(container));
        await shell('board');
        expect(document.activeElement).toBe(cardOf(container, '0007'));
    });

    it('without the opener and without a card of the spec closing focuses the first focusable element of the area', async () => {
        const container = await board();
        await openFromCard(container, '0007');
        await shell('overview', SELECTED);
        await shell('board', SELECTED);
        await send(boardEvent(boardView([card('0003')])));
        await focus(closeButton(container));
        await click(closeButton(container));
        await shell('board');
        expect(container.querySelector('.area-content')?.contains(document.activeElement)).toBe(true);
        expect(document.activeElement).not.toBe(document.body);
    });
});

describe('AC-004: focus and keyboard in the side panel', () => {
    it('activating a card moves focus to the heading once the detail is shown', async () => {
        const container = await board();
        await openFromCard(container, '0007');
        const heading = container.querySelector('aside.side-panel [data-detail-heading]');
        expect(heading?.tagName).toBe('H2');
        expect(heading?.getAttribute('tabindex')).toBe('-1');
        expect(document.activeElement).toBe(heading);
    });

    it('a remembered selection does not take the focus (AC-006 control)', async () => {
        const container = await board(SELECTED);
        expect(container.querySelector('aside.side-panel')?.contains(document.activeElement)).toBe(false);
    });

    it('Tab order after the heading: close, Copy, the links, then the toggles', async () => {
        const container = await board(SELECTED);
        const panel = container.querySelector('aside.side-panel')!;
        const order = [...panel.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])')];
        const index = (selector: string) => order.findIndex((element) => element.matches(selector));
        expect(index('.detail-close')).toBe(0);
        expect(index('.next-step-copy, .copy-button')).toBeGreaterThan(index('.detail-close'));
        expect(index('.file-link')).toBeGreaterThan(index('.next-step-copy, .copy-button'));
        expect(index('h3 > button')).toBeGreaterThan(index('.file-link'));
        expect(order.every((element) => element.tabIndex >= 0)).toBe(true);
    });

    it('Enter and Space work on the close button, Copy, a link and a toggle', async () => {
        const container = await board(SELECTED);
        const panel = container.querySelector('aside.side-panel')!;
        const copy = panel.querySelector<HTMLElement>('.next-step-copy, .copy-button')!;
        await pressKey(copy, 'Enter');
        await pressKey(copy, ' ');
        expect(requests('copyText')).toHaveLength(2);
        const link = panel.querySelector<HTMLElement>('.file-link')!;
        await pressKey(link, 'Enter');
        await pressKey(link, ' ');
        expect(requests('openFile')).toHaveLength(2);
        const toggle = panel.querySelector<HTMLElement>('h3 > button')!;
        const before = toggle.getAttribute('aria-expanded');
        await pressKey(toggle, ' ');
        expect(toggle.getAttribute('aria-expanded')).not.toBe(before);
        await pressKey(toggle, 'Enter');
        expect(toggle.getAttribute('aria-expanded')).toBe(before);
        await pressKey(closeButton(container), 'Enter');
        await pressKey(closeButton(container), ' ');
        expect(requests('clearSelection')).toEqual([{}, {}]);
    });
});

describe('AC-008: the Spec Explorer pane', () => {
    function row(selected: boolean): SpecRow {
        return { stem: '0007-thing', path: SPEC_KEY, number: '0007', title: 'Thing 0007', state: 'Active', derivedRule: undefined, showPath: false, selected };
    }

    async function explorer(): Promise<HTMLElement> {
        const container = await start();
        await shell('specExplorer', SELECTED, [row(true)]);
        await send(detailEvent(detailView()));
        return container;
    }

    it('the pane has a close button, no side panel, and closing shows the hint with the list row focused', async () => {
        const container = await explorer();
        expect(container.querySelector('aside.side-panel')).toBeNull();
        const button = closeButton(container);
        expect(container.querySelector('.explorer')?.contains(button)).toBe(true);
        await focus(button);
        await click(button);
        expect(requests('clearSelection')).toEqual([{}]);
        await shell('specExplorer', undefined, [row(false)]);
        await send(detailEvent({ kind: 'none' }));
        expect(container.textContent).toContain(NO_DETAIL_SELECTION_TEXT);
        expect(document.activeElement).toBe(container.querySelector('[role="option"]'));
    });

    it('Escape in the pane closes it the same way', async () => {
        const container = await explorer();
        const heading = container.querySelector<HTMLElement>('[data-detail-heading]')!;
        await focus(heading);
        await escape(heading);
        expect(requests('clearSelection')).toEqual([{}]);
        await shell('specExplorer', undefined, [row(false)]);
        await send(detailEvent({ kind: 'none' }));
        expect(document.activeElement).toBe(container.querySelector('[role="option"]'));
    });
});

describe('AC-020: updates keep the focus and the scroll container', () => {
    it('a focused link stays focused across an update of the same detail, and the scroll container is the same element', async () => {
        const container = await board(SELECTED);
        const panel = container.querySelector('aside.side-panel')!;
        const link = panel.querySelector<HTMLElement>('.file-link')!;
        await focus(link);
        await send(detailEvent(detailView()));
        expect(document.activeElement).toBe(link);
        expect(container.querySelector('aside.side-panel')).toBe(panel);
    });

    it('when the focused control is gone the heading takes the focus', async () => {
        const container = await start();
        await shell('board', SELECTED);
        await send(boardEvent(boardView(CARDS)));
        await send(detailEvent(detailView({}, undefined, [{ reason: 'Plan is missing', open: { key: PLAN_KEY, line: 3 } }])));
        const link = container.querySelector<HTMLElement>('.detail-problems .file-link')!;
        await focus(link);
        await send(detailEvent(detailView()));
        expect(document.activeElement).toBe(container.querySelector('[data-detail-heading]'));
    });

    it('a spec that disappears closes the panel, shows the notice and follows the close rule', async () => {
        const container = await board();
        await openFromCard(container, '0003');
        await send(detailEvent(detailView({ stem: '0003-thing', number: '0003', key: '.specs/active/0003-thing.md' })));
        await shell('board', { stem: '0003-thing', number: '0003' });
        await focus(container.querySelector<HTMLElement>('[data-detail-heading]')!);
        await shell('board', undefined, [], { number: '0003' });
        expect(container.querySelector('aside.side-panel')).toBeNull();
        expect(container.querySelector('[data-notice]')?.textContent).toContain(noticeText('0003'));
        expect(document.activeElement).toBe(cardOf(container, '0003'));
    });
});
