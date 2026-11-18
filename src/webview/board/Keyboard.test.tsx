import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../shared/protocol/envelope';
import { App } from '../App';
import { createClient, type ShellClient } from '../client';
import { baseView, mount, send, shellEvent, type Mounted } from '../testing/dom';
import { boardEvent, boardView, card } from './testing/views';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

const CARDS = [
    card('0001', { state: 'Backlog' }),
    card('0002', { state: 'Backlog' }),
    card('0003', { state: 'Active' }),
    card('0004', { state: 'Active' }),
    card('0005', { state: 'Active' }),
    card('0006', { state: 'Done' }),
];

function key(number: string): string {
    return `.specs/active/${number}-thing.md`;
}

async function open(view = boardView(CARDS)): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'specBoard' }), 1));
    await send(boardEvent(view));
    return mounted.container;
}

function cardOf(container: HTMLElement, number: string): HTMLElement {
    return container.querySelector<HTMLElement>(`[data-card="${key(number)}"]`)!;
}

function requests(type: string): unknown[] {
    return posted.filter((message) => message.type === type).map((message) => message.payload);
}

async function focus(element: HTMLElement): Promise<void> {
    await act(async () => element.focus());
}

async function press(element: Element, pressed: string, shiftKey = false): Promise<void> {
    await act(async () => {
        element.dispatchEvent(new KeyboardEvent('keydown', { key: pressed, shiftKey, bubbles: true, cancelable: true }));
    });
}

async function drag(type: 'dragstart' | 'dragover' | 'drop' | 'dragend' | 'dragleave', element: Element, relatedTarget: Element | null = null): Promise<boolean> {
    let notPrevented = true;
    await act(async () => {
        notPrevented = element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, relatedTarget }));
    });
    return notPrevented;
}

function marked(container: HTMLElement): string[] {
    return [...container.querySelectorAll('[data-drop-target="true"]')].map((column) => column.getAttribute('data-column') ?? '');
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('AC-017: the board is one tab stop with arrow-key navigation', () => {
    it('only one card is tabbable and it is the first one', async () => {
        const container = await open();
        const tabbable = [...container.querySelectorAll<HTMLElement>('[data-card]')].filter((element) => element.tabIndex === 0);
        expect(tabbable.map((element) => element.getAttribute('data-card'))).toEqual([key('0001')]);
    });

    it('arrow keys move focus down, up, right and left', async () => {
        const container = await open();
        await focus(cardOf(container, '0003'));
        await press(document.activeElement!, 'ArrowDown');
        expect(document.activeElement).toBe(cardOf(container, '0004'));
        await press(document.activeElement!, 'ArrowUp');
        expect(document.activeElement).toBe(cardOf(container, '0003'));
        await press(document.activeElement!, 'ArrowRight');
        expect(document.activeElement).toBe(cardOf(container, '0006'));
        await press(document.activeElement!, 'ArrowLeft');
        expect(document.activeElement).toBe(cardOf(container, '0003'));
    });

    it('the tab stop follows the focused card', async () => {
        const container = await open();
        await focus(cardOf(container, '0004'));
        const tabbable = [...container.querySelectorAll<HTMLElement>('[data-card]')].filter((element) => element.tabIndex === 0);
        expect(tabbable.map((element) => element.getAttribute('data-card'))).toEqual([key('0004')]);
    });
});

describe('0017 AC-006: Shift+F10 and the context-menu key open no menu of the Studio', () => {
    it('neither key opens a menu or posts a request, on any card', async () => {
        const container = await open();
        await focus(cardOf(container, '0003'));
        const before = posted.length;
        await press(document.activeElement!, 'F10', true);
        await press(document.activeElement!, 'ContextMenu');
        expect(container.querySelector('[role="menu"], [role="menuitem"]')).toBeNull();
        expect(posted).toHaveLength(before);
        expect(document.activeElement).toBe(cardOf(container, '0003'));
    });
});

describe('0017 AC-007: a card cannot be dragged and drag events do nothing', () => {
    it('no card carries draggable="true"', async () => {
        const container = await open();
        const cards = [...container.querySelectorAll('[data-card]')];
        expect(cards).toHaveLength(CARDS.length);
        expect(cards.some((element) => element.getAttribute('draggable') === 'true')).toBe(false);
    });

    it('dragstart, dragover, drop and dragend on a card and another column post nothing and set no mark', async () => {
        const container = await open();
        const seen: string[] = [];
        container.addEventListener('dragstart', () => seen.push('dragstart'));
        container.addEventListener('dragover', () => seen.push('dragover'));
        container.addEventListener('drop', () => seen.push('drop'));
        container.addEventListener('dragend', () => seen.push('dragend'));
        const before = posted.length;
        const done = container.querySelector('[data-column="Done"]')!;
        await drag('dragstart', cardOf(container, '0003'));
        expect(await drag('dragover', done)).toBe(true);
        await drag('drop', done);
        await drag('dragend', cardOf(container, '0003'));
        expect(seen).toEqual(['dragstart', 'dragover', 'drop', 'dragend']);
        expect(posted).toHaveLength(before);
        expect(marked(container)).toEqual([]);
        expect(container.querySelector('[data-dragging]')).toBeNull();
        expect(container.querySelector('[data-drop-target]')).toBeNull();
        expect(done.querySelector('[data-card]')?.getAttribute('data-card')).toBe(key('0006'));
    });
});

describe('0017 AC-008: the board offers no move control and no status line', () => {
    it('shows no "Move to…", no menu and no status region above the columns', async () => {
        const container = await open();
        expect(container.textContent).not.toContain('Move to');
        expect(container.querySelector('[role="menu"], [aria-haspopup="menu"], .move-menu')).toBeNull();
        expect(container.querySelector('.board > [role="status"], .board-status')).toBeNull();
        expect(container.querySelector('[draggable="true"]')).toBeNull();
    });

    it('a moveResult event from the host shows nothing on the board', async () => {
        const container = await open();
        await send({ v: 1, kind: 'evt', type: 'moveResult', payload: { result: { kind: 'refused', text: 'Not allowed: spec 0003 is blocked.' } } });
        expect(container.textContent).not.toContain('Not allowed');
    });
});


describe('AC-019: focus stays on the same card across live updates', () => {
    it('follows the card to another column', async () => {
        const container = await open();
        await focus(cardOf(container, '0003'));
        await send(boardEvent(boardView(CARDS.map((entry) => (entry.number === '0003' ? { ...entry, state: 'Review' as const } : entry)))));
        expect(document.activeElement).toBe(cardOf(container, '0003'));
        expect(cardOf(container, '0003').closest('[data-column]')!.getAttribute('data-column')).toBe('Review');
    });

    it('stays on the card when others reorder around it', async () => {
        const container = await open();
        await focus(cardOf(container, '0004'));
        await send(boardEvent(boardView([CARDS[0]!, CARDS[1]!, CARDS[4]!, CARDS[3]!, CARDS[2]!, CARDS[5]!])));
        expect(document.activeElement).toBe(cardOf(container, '0004'));
    });

    it('falls back to the card at the same place when the focused card disappears', async () => {
        const container = await open();
        await focus(cardOf(container, '0004'));
        await send(boardEvent(boardView(CARDS.filter((entry) => entry.number !== '0004'))));
        expect(document.activeElement).toBe(cardOf(container, '0005'));
    });

    it('falls back to the board when no card is left', async () => {
        const container = await open();
        await focus(cardOf(container, '0006'));
        await send(boardEvent(boardView([])));
        expect(document.activeElement).toBe(container.querySelector('.columns'));
    });

    it('does not steal focus when the board was not focused', async () => {
        const container = await open();
        const outside = document.createElement('button');
        document.body.appendChild(outside);
        await focus(cardOf(container, '0004'));
        await focus(outside);
        await send(boardEvent(boardView(CARDS.filter((entry) => entry.number !== '0004'))));
        expect(document.activeElement).toBe(outside);
        outside.remove();
    });
});
