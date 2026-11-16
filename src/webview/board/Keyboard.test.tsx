import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../shared/protocol/envelope';
import { handedOffText } from '../../shared/protocol/texts';
import { App } from '../App';
import { createClient, type ShellClient } from '../client';
import { baseView, click, mount, pressKey, send, shellEvent, type Mounted } from '../testing/dom';
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

    it('sends boardFocus on focus and null on blur', async () => {
        const container = await open();
        await focus(cardOf(container, '0003'));
        expect(requests('boardFocus')).toEqual([{ key: key('0003') }]);
        await act(async () => cardOf(container, '0003').blur());
        expect(requests('boardFocus')).toEqual([{ key: key('0003') }, { key: null }]);
    });

    it('moving focus between cards does not send null in between', async () => {
        const container = await open();
        await focus(cardOf(container, '0003'));
        await press(document.activeElement!, 'ArrowDown');
        expect(requests('boardFocus')).toEqual([{ key: key('0003') }, { key: key('0004') }]);
    });
});

describe('AC-014: move without a mouse', () => {
    it('Shift+F10 opens the menu with the five other columns and focuses the first', async () => {
        const container = await open();
        await focus(cardOf(container, '0003'));
        await press(document.activeElement!, 'F10', true);
        const items = [...container.querySelectorAll('[role="menuitem"]')];
        expect(items.map((item) => item.textContent)).toEqual(['Backlog', 'Ready', 'Review', 'Done', 'Blocked']);
        expect(document.activeElement).toBe(items[0]);
    });

    it('the ContextMenu key opens it too, and the button carries the visible label', async () => {
        const container = await open();
        await focus(cardOf(container, '0003'));
        await press(document.activeElement!, 'ContextMenu');
        expect(container.querySelector('[role="menu"]')).not.toBeNull();
        const button = cardOf(container, '0003').querySelector('button[aria-haspopup="menu"]')!;
        expect(button.textContent).toBe('Move to…');
        expect(button.getAttribute('aria-label')).toContain('Move to…');
        expect(button.getAttribute('aria-expanded')).toBe('true');
    });

    it('arrows cycle the items, Enter picks one and sends moveRequest, focus returns to the card', async () => {
        const container = await open();
        await focus(cardOf(container, '0003'));
        await press(document.activeElement!, 'F10', true);
        await press(document.activeElement!, 'ArrowDown');
        await press(document.activeElement!, 'ArrowDown');
        expect(document.activeElement?.textContent).toBe('Review');
        await press(document.activeElement!, 'ArrowUp');
        await press(document.activeElement!, 'ArrowUp');
        await press(document.activeElement!, 'ArrowUp');
        expect(document.activeElement?.textContent).toBe('Blocked');
        await pressKey(document.activeElement!, 'Enter');
        expect(requests('moveRequest')).toEqual([{ key: key('0003'), target: 'Blocked' }]);
        expect(container.querySelector('[role="menu"]')).toBeNull();
        expect(document.activeElement).toBe(cardOf(container, '0003'));
    });

    it('Escape closes the menu without a request and returns focus to the card', async () => {
        const container = await open();
        await focus(cardOf(container, '0003'));
        await press(document.activeElement!, 'F10', true);
        await press(document.activeElement!, 'Escape');
        expect(container.querySelector('[role="menu"]')).toBeNull();
        expect(requests('moveRequest')).toEqual([]);
        expect(document.activeElement).toBe(cardOf(container, '0003'));
    });

    it('the Move to button with the mouse works and does not open the spec', async () => {
        const container = await open();
        await click(cardOf(container, '0003').querySelector('button[aria-haspopup="menu"]')!);
        await click(container.querySelector('[role="menuitem"]:nth-child(2)')!);
        expect(requests('moveRequest')).toEqual([{ key: key('0003'), target: 'Ready' }]);
        expect(requests('navigate')).toEqual([]);
    });

    it('AC-017: Tab reaches the Move to button of the card that is the board tab stop, right after that card, and no other card button', async () => {
        const container = await open();
        const stops = [...container.querySelectorAll<HTMLElement>('[data-card], button[aria-haspopup="menu"]')].filter((element) => element.tabIndex === 0);
        expect(stops.map((element) => element.getAttribute('data-card') ?? `button of ${element.closest('[data-card]')?.getAttribute('data-card')}`)).toEqual([key('0001'), `button of ${key('0001')}`]);
    });

    it('AC-017: the button tab stop follows the focused card', async () => {
        const container = await open();
        await focus(cardOf(container, '0004'));
        const buttonOf = (number: string) => cardOf(container, number).querySelector<HTMLElement>('button[aria-haspopup="menu"]')!;
        expect(buttonOf('0004').tabIndex).toBe(0);
        expect(buttonOf('0001').tabIndex).toBe(-1);
    });

    it('AC-017: focus on the Move to button keeps the card focused for the host, Enter opens the menu and Escape closes it', async () => {
        const container = await open();
        await focus(cardOf(container, '0003'));
        const button = cardOf(container, '0003').querySelector<HTMLElement>('button[aria-haspopup="menu"]')!;
        await focus(button);
        expect(requests('boardFocus').every((payload) => (payload as { key: string | null }).key === key('0003'))).toBe(true);
        await pressKey(button, 'Enter');
        expect(container.querySelector('[role="menu"]')).not.toBeNull();
        await press(document.activeElement!, 'Escape');
        expect(container.querySelector('[role="menu"]')).toBeNull();
        expect(requests('moveRequest')).toEqual([]);
    });

    it('AC-017: leaving the board from the Move to button sends the null focus', async () => {
        const container = await open();
        await focus(cardOf(container, '0003'));
        const button = cardOf(container, '0003').querySelector<HTMLElement>('button[aria-haspopup="menu"]')!;
        await focus(button);
        await act(async () => button.blur());
        expect(requests('boardFocus').at(-1)).toEqual({ key: null });
    });
});

describe('AC-014: move by drag and drop (MouseEvents, jsdom has no DragEvent)', () => {
    it('dropping on another column sends moveRequest', async () => {
        const container = await open();
        await drag('dragstart', cardOf(container, '0003'));
        const done = container.querySelector('[data-column="Done"]')!;
        expect(await drag('dragover', done)).toBe(false);
        await drag('drop', done);
        expect(requests('moveRequest')).toEqual([{ key: key('0003'), target: 'Done' }]);
    });

    it('cards are draggable', async () => {
        const container = await open();
        expect(cardOf(container, '0003').getAttribute('draggable')).toBe('true');
    });

    it('the own column is not a drop target and a drop there sends nothing', async () => {
        const container = await open();
        await drag('dragstart', cardOf(container, '0003'));
        const active = container.querySelector('[data-column="Active"]')!;
        expect(await drag('dragover', active)).toBe(true);
        await drag('drop', active);
        expect(requests('moveRequest')).toEqual([]);
    });

    it('a drop outside the columns, and a drop after dragend, send nothing', async () => {
        const container = await open();
        await drag('dragstart', cardOf(container, '0003'));
        await drag('drop', container.querySelector('.board-status')!);
        await drag('dragend', cardOf(container, '0003'));
        await drag('drop', container.querySelector('[data-column="Done"]')!);
        expect(requests('moveRequest')).toEqual([]);
    });

    it('without a drag in progress nothing is a drop target', async () => {
        const container = await open();
        expect(await drag('dragover', container.querySelector('[data-column="Done"]')!)).toBe(true);
    });
});

describe('0013 AC-011: drag marks (MouseEvents, no verdict before the drop)', () => {
    it('AC-011: while a card is dragged, the card and the column under the pointer are marked; the drop removes both marks', async () => {
        const container = await open();
        await drag('dragstart', cardOf(container, '0003'));
        expect(cardOf(container, '0003').getAttribute('data-dragging')).toBe('true');
        expect(marked(container)).toEqual([]);
        await drag('dragover', container.querySelector('[data-column="Done"]')!);
        expect(marked(container)).toEqual(['Done']);
        await drag('dragover', container.querySelector('[data-column="Ready"]')!);
        expect(marked(container)).toEqual(['Ready']);
        await drag('drop', container.querySelector('[data-column="Ready"]')!);
        expect(marked(container)).toEqual([]);
        expect(container.querySelector('[data-dragging="true"]')).toBeNull();
    });

    it('AC-011: dragend without a drop removes both marks', async () => {
        const container = await open();
        await drag('dragstart', cardOf(container, '0003'));
        await drag('dragover', container.querySelector('[data-column="Done"]')!);
        await drag('dragend', cardOf(container, '0003'));
        expect(marked(container)).toEqual([]);
        expect(container.querySelector('[data-dragging="true"]')).toBeNull();
    });

    it('AC-011: leaving the column to outside removes its mark; moving onto a child of the column keeps it', async () => {
        const container = await open();
        await drag('dragstart', cardOf(container, '0003'));
        const done = container.querySelector('[data-column="Done"]')!;
        await drag('dragover', done);
        await drag('dragleave', done, done.querySelector('h2'));
        expect(marked(container)).toEqual(['Done']);
        await drag('dragleave', done, container.querySelector('.board-status'));
        expect(marked(container)).toEqual([]);
    });

    it('control: without a drag in progress dragover marks nothing', async () => {
        const container = await open();
        await drag('dragover', container.querySelector('[data-column="Done"]')!);
        expect(marked(container)).toEqual([]);
    });
});

describe('AC-018: the outcome of a move is announced', () => {
    it('has an empty polite status region before any move', async () => {
        const container = await open();
        const status = container.querySelector('[role="status"]')!;
        expect(status.getAttribute('aria-live')).toBe('polite');
        expect(status.textContent).toBe('');
    });

    it('shows a refusal text and the dismiss button clears it', async () => {
        const container = await open();
        await send({ v: 1, kind: 'evt', type: 'moveResult', payload: { result: { kind: 'refused', text: 'Not allowed: spec 0003 is blocked.' } } });
        expect(container.querySelector('[role="status"]')!.textContent).toContain('Not allowed: spec 0003 is blocked.');
        await click([...container.querySelectorAll('[role="status"] button')].find((button) => button.textContent === 'Dismiss')!);
        expect(container.querySelector('[role="status"]')!.textContent).toBe('');
    });

    it('announces the hand-off', async () => {
        const container = await open();
        await send({ v: 1, kind: 'evt', type: 'moveResult', payload: { result: { kind: 'handedOff', number: '0003' } } });
        expect(container.querySelector('[role="status"]')!.textContent).toContain(handedOffText('0003'));
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
