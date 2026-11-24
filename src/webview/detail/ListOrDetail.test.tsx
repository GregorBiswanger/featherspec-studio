import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../shared/protocol/envelope';
import { NARROW_QUERY } from '../../shared/protocol/layout';
import type { SelectedSpec } from '../../shared/protocol/messages';
import { sharedSpecView } from '../../shared/protocol/testing/overviewSample';
import { App } from '../App';
import { boardEvent, boardView, card } from '../board/testing/views';
import { createClient, type ShellClient } from '../client';
import { baseView, click, mount, overviewEvent, send, shellEvent, type Mounted } from '../testing/dom';
import { resetSectionMemory } from './sectionMemory';
import { detailEvent, detailView } from './testing/views';

let posted: Envelope[];
let mounted: Mounted | undefined;
let seq: number;
const clients: ShellClient[] = [];

const SELECTED: SelectedSpec = { stem: '0007-thing', number: '0007' };
const CARDS = [card('0003'), card('0007')];

const original = window.matchMedia;
let listeners: (() => void)[];
let narrow: boolean;
let asked: string[];

async function setNarrow(value: boolean): Promise<void> {
    narrow = value;
    await act(async () => listeners.forEach((listener) => listener()));
}

beforeEach(() => {
    posted = [];
    seq = 0;
    listeners = [];
    narrow = true;
    asked = [];
    window.matchMedia = ((query: string) => {
        asked.push(query);
        return {
            get matches() {
                return query === NARROW_QUERY && narrow;
            },
            media: query,
            addEventListener: (_type: string, listener: () => void) => void listeners.push(listener),
            removeEventListener: (_type: string, listener: () => void) => void (listeners = listeners.filter((entry) => entry !== listener)),
        };
    }) as unknown as typeof window.matchMedia;
});

afterEach(() => {
    window.matchMedia = original;
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

async function shell(area: 'overview' | 'board', selection?: SelectedSpec): Promise<void> {
    seq += 1;
    await send(shellEvent(baseView({ area, selection }), seq));
}

async function board(selection?: SelectedSpec): Promise<HTMLElement> {
    const container = await start();
    await shell('board', selection);
    await send(boardEvent(boardView(CARDS)));
    if (selection !== undefined) {
        await send(detailEvent(detailView()));
    }
    return container;
}

async function overview(selection?: SelectedSpec): Promise<HTMLElement> {
    const container = await start();
    await shell('overview', selection);
    await send(overviewEvent(sharedSpecView()));
    return container;
}

function requests(type: string): unknown[] {
    return posted.filter((message) => message.type === type).map((message) => message.payload);
}

function cardOf(container: HTMLElement, number: string): HTMLElement {
    return [...container.querySelectorAll<HTMLElement>('[data-card]')].find((node) => node.textContent?.includes(number))!;
}

function frame(container: HTMLElement): HTMLElement {
    return container.querySelector<HTMLElement>('.area-frame')!;
}

function content(container: HTMLElement): HTMLElement {
    return container.querySelector<HTMLElement>('.area-content')!;
}

function back(container: HTMLElement): HTMLButtonElement | null {
    return container.querySelector<HTMLButtonElement>('aside.side-panel button.detail-back');
}

async function focus(element: HTMLElement): Promise<void> {
    await act(async () => element.focus());
}

async function escape(element: HTMLElement): Promise<void> {
    await act(async () => {
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
}

describe('AC-029: below 900 px the area alone, or the detail alone', () => {
    it('asks the narrow query of the code, 899 px', async () => {
        await board();
        expect(NARROW_QUERY).toBe('(max-width: 899px)');
        expect(asked).toContain(NARROW_QUERY);
    });

    it('without a selection the area shows alone: no side panel, no detail layout, the area content is not set aside', async () => {
        const container = await board();
        expect(container.querySelector('aside.side-panel')).toBeNull();
        expect(frame(container).hasAttribute('data-layout')).toBe(false);
        expect(content(container).hasAttribute('inert')).toBe(false);
    });

    it('with a selection the Board detail shows alone: the back button names the Board, no close button, no divider, the area set aside', async () => {
        const container = await board(SELECTED);
        expect(frame(container).getAttribute('data-layout')).toBe('detail');
        expect(back(container)?.textContent).toBe('Back to Board');
        expect(back(container)?.getAttribute('aria-label') ?? back(container)?.textContent).toBe('Back to Board');
        expect(container.querySelector('button.detail-close')).toBeNull();
        expect(container.querySelector('[role="separator"]')).toBeNull();
        expect(content(container).hasAttribute('inert')).toBe(true);
    });

    it('the back button is the detail’s first line, above the title row', async () => {
        const container = await board(SELECTED);
        const detail = container.querySelector('aside.side-panel .spec-detail')!;
        expect(detail.firstElementChild).toBe(back(container));
        expect(detail.children[1]?.classList.contains('detail-title')).toBe(true);
    });

    it('with a selection the Overview detail shows alone with Back to Overview, also before its detail has arrived', async () => {
        const container = await overview(SELECTED);
        expect(frame(container).getAttribute('data-layout')).toBe('detail');
        expect(back(container)?.textContent).toBe('Back to Overview');
        expect(container.querySelector('button.detail-close')).toBeNull();
    });

    it('the area content stays the same node and keeps its scroll position while the detail shows alone and after back', async () => {
        const container = await board();
        const before = content(container);
        before.scrollTop = 120;
        await shell('board', SELECTED);
        await send(detailEvent(detailView()));
        expect(content(container)).toBe(before);
        expect(before.scrollTop).toBe(120);
        await click(back(container)!);
        await shell('board');
        expect(content(container)).toBe(before);
        expect(before.scrollTop).toBe(120);
        expect(before.hasAttribute('inert')).toBe(false);
    });

    it('the back button sends clearSelection and after the host event focus is on the card that opened the detail', async () => {
        const container = await board();
        await focus(cardOf(container, '0007'));
        await act(async () => cardOf(container, '0007').click());
        await shell('board', SELECTED);
        await send(detailEvent(detailView()));
        await focus(back(container)!);
        await click(back(container)!);
        expect(requests('clearSelection')).toEqual([{}]);
        await shell('board');
        expect(document.activeElement).toBe(cardOf(container, '0007'));
    });

    it('Escape inside the detail sends clearSelection and focus returns to the Overview row of the spec', async () => {
        const container = await overview({ stem: '0002-x', number: '0002' });
        const rows = [...container.querySelectorAll<HTMLElement>('[data-spec-row] .ov-row')];
        await focus(back(container)!);
        await escape(back(container)!);
        expect(requests('clearSelection')).toEqual([{}]);
        await shell('overview');
        expect(document.activeElement).toBe(rows[1]);
    });

    it('switching the area keeps the detail and renames the back button', async () => {
        const container = await board(SELECTED);
        await shell('overview', SELECTED);
        await send(overviewEvent(sharedSpecView()));
        expect(back(container)?.textContent).toBe('Back to Overview');
        expect(container.querySelector('aside.side-panel')).not.toBeNull();
        await shell('board', SELECTED);
        expect(back(container)?.textContent).toBe('Back to Board');
    });
});

describe('AC-029: crossing 900 px', () => {
    it('widening keeps the selection, shows area and detail side by side with the close button and no back button', async () => {
        const container = await board(SELECTED);
        await setNarrow(false);
        expect(container.querySelector('aside.side-panel')).not.toBeNull();
        expect(frame(container).hasAttribute('data-layout')).toBe(false);
        expect(content(container).hasAttribute('inert')).toBe(false);
        expect(container.querySelector('button.detail-close')).not.toBeNull();
        expect(back(container)).toBeNull();
        await setNarrow(true);
        expect(frame(container).getAttribute('data-layout')).toBe('detail');
        expect(back(container)?.textContent).toBe('Back to Board');
        expect(requests('clearSelection')).toEqual([]);
    });

    it('focus inside the detail stays there when the width crosses 900 px in either direction', async () => {
        const container = await board(SELECTED);
        const heading = container.querySelector<HTMLElement>('aside.side-panel [data-detail-heading]')!;
        await focus(heading);
        await setNarrow(false);
        expect(document.activeElement).toBe(heading);
        await setNarrow(true);
        expect(document.activeElement).toBe(heading);
    });

    it('focus in the area content moves to the detail heading when the area is set aside, and stays when it widens again', async () => {
        narrow = false;
        const container = await board(SELECTED);
        const target = cardOf(container, '0003');
        await focus(target);
        expect(document.activeElement).toBe(target);
        await setNarrow(true);
        expect(document.activeElement).toBe(container.querySelector('aside.side-panel [data-detail-heading]'));
        await setNarrow(false);
        expect(document.activeElement).toBe(container.querySelector('aside.side-panel [data-detail-heading]'));
    });

    it('control: widening with focus on a card keeps focus on that card', async () => {
        const container = await board();
        const target = cardOf(container, '0003');
        await focus(target);
        await setNarrow(false);
        expect(document.activeElement).toBe(target);
    });

    it('control: while the area is the wide layout no frame carries the detail layout and no area is set aside', async () => {
        narrow = false;
        const container = await board(SELECTED);
        expect(frame(container).hasAttribute('data-layout')).toBe(false);
        expect(content(container).hasAttribute('inert')).toBe(false);
    });
});

describe('0021 AC-014: Escape with the About this step toggletip open below 900 px', () => {
    it('the first Escape closes only the toggletip and keeps the detail; the second sends clearSelection', async () => {
        const container = await board(SELECTED);
        await send(detailEvent(detailView({}, { rule: 'NS-5', lines: [{ text: '/sdd-compile k', intent: 'Have the result verified' }], tips: { coach: 'Tip: Use a new chat with a strong model.', about: ['one', 'two', 'three', 'four'] } })));
        const toggle = container.querySelector<HTMLButtonElement>('aside.side-panel button.toggletip')!;
        await click(toggle);
        await act(async () => toggle.focus());
        await escape(toggle);
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(requests('clearSelection')).toEqual([]);
        expect(back(container)).not.toBeNull();
        expect(document.activeElement).toBe(toggle);
        await escape(toggle);
        expect(requests('clearSelection')).toEqual([{}]);
    });

    it('after a press on the text of the open toggletip Escape on the body closes only the toggletip and keeps the detail; the second Escape sends clearSelection', async () => {
        const container = await board(SELECTED);
        await send(detailEvent(detailView({}, { rule: 'NS-5', lines: [{ text: '/sdd-compile k', intent: 'Have the result verified' }], tips: { coach: 'Tip: Use a new chat with a strong model.', about: ['one', 'two', 'three', 'four'] } })));
        const toggle = container.querySelector<HTMLButtonElement>('aside.side-panel button.toggletip')!;
        await click(toggle);
        await act(async () => {
            container.querySelector('aside.side-panel [role="status"] p')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
            toggle.focus();
            toggle.blur();
        });
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        await escape(document.body);
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(requests('clearSelection')).toEqual([]);
        expect(back(container)).not.toBeNull();
        expect(document.activeElement).toBe(toggle);
        await escape(toggle);
        expect(requests('clearSelection')).toEqual([{}]);
    });
});

describe('0024 AC-008: Escape with the Send menu open below 900 px', () => {
    it('the first Escape closes only the menu and keeps the detail; focus is on the arrow part; the second sends clearSelection', async () => {
        const container = await board(SELECTED);
        await send(detailEvent(detailView({}, { rule: 'NS-5', lines: [{ text: '/sdd-compile k', intent: 'Have the result verified' }], send: { assistant: 'copilot', target: 'new', targets: ['new', 'current'] } })));
        const arrow = container.querySelector<HTMLButtonElement>('aside.side-panel button.send-arrow')!;
        await click(arrow);
        expect(container.querySelector('aside.side-panel [role="menu"]')).not.toBeNull();
        await escape(document.activeElement as HTMLElement);
        expect(container.querySelector('[role="menu"]')).toBeNull();
        expect(requests('clearSelection')).toEqual([]);
        expect(back(container)).not.toBeNull();
        expect(document.activeElement).toBe(arrow);
        await escape(arrow);
        expect(requests('clearSelection')).toEqual([{}]);
    });
});

function tab(container: HTMLElement, title: string): HTMLButtonElement {
    return [...container.querySelectorAll<HTMLButtonElement>('nav button.nav-item')].find((node) => node.textContent === title)!;
}

describe('0022 AC-030: a tab click below 900 px shows the list, an entry shows the detail', () => {
    it('with a selection a click on the Board tab shows the board alone: no side panel, the area not set aside, the card stays marked', async () => {
        const container = await board(SELECTED);
        expect(frame(container).getAttribute('data-layout')).toBe('detail');
        await click(tab(container, 'Board'));
        await shell('board', SELECTED);
        expect(frame(container).hasAttribute('data-layout')).toBe(false);
        expect(content(container).hasAttribute('inert')).toBe(false);
        expect(container.querySelector('aside.side-panel')).toBeNull();
        expect(cardOf(container, '0007').getAttribute('aria-current')).toBe('true');
        expect(requests('clearSelection')).toEqual([]);
    });

    it('with a selection a click on the Overview tab shows the list alone', async () => {
        const container = await board(SELECTED);
        await click(tab(container, 'Overview'));
        await shell('overview', SELECTED);
        await send(overviewEvent(sharedSpecView()));
        expect(frame(container).hasAttribute('data-layout')).toBe(false);
        expect(container.querySelector('aside.side-panel')).toBeNull();
    });

    it('a click on the current tab shows the list as well', async () => {
        const container = await board(SELECTED);
        await click(tab(container, 'Board'));
        expect(container.querySelector('aside.side-panel')).toBeNull();
    });

    it('choosing an entry afterwards shows the detail alone again', async () => {
        const container = await board(SELECTED);
        await click(tab(container, 'Board'));
        await act(async () => cardOf(container, '0003').click());
        await shell('board', { stem: '0003-x', number: '0003' });
        await send(detailEvent(detailView()));
        expect(frame(container).getAttribute('data-layout')).toBe('detail');
        expect(back(container)?.textContent).toBe('Back to Board');
    });

    it('choosing the entry that is already selected shows its detail', async () => {
        const container = await board(SELECTED);
        await click(tab(container, 'Board'));
        await act(async () => cardOf(container, '0007').click());
        expect(frame(container).getAttribute('data-layout')).toBe('detail');
        expect(back(container)).not.toBeNull();
    });

    it('a selection that arrives from the host shows the detail', async () => {
        const container = await board(SELECTED);
        await click(tab(container, 'Board'));
        await shell('board', { stem: '0003-x', number: '0003' });
        expect(frame(container).getAttribute('data-layout')).toBe('detail');
    });

    it('wide: a tab click keeps the area and the detail side by side', async () => {
        narrow = false;
        const container = await board(SELECTED);
        await click(tab(container, 'Board'));
        await shell('board', SELECTED);
        expect(container.querySelector('aside.side-panel')).not.toBeNull();
        expect(frame(container).hasAttribute('data-layout')).toBe(false);
        expect(back(container)).toBeNull();
    });

    it('a click on a tab while narrow does not show the detail after widening and narrowing again', async () => {
        const container = await board(SELECTED);
        await click(tab(container, 'Board'));
        await setNarrow(false);
        expect(container.querySelector('aside.side-panel')).not.toBeNull();
        await setNarrow(true);
        expect(container.querySelector('aside.side-panel')).toBeNull();
    });
});

describe('0022 AC-030: the back link', () => {
    it('is a button of the detail’s own line before the title row, on the left edge of the title row', async () => {
        const container = await board(SELECTED);
        const link = back(container)!;
        expect(link.tagName).toBe('BUTTON');
        expect(link.getAttribute('type')).toBe('button');
        expect(link.classList.contains('detail-back')).toBe(true);
        expect(link.nextElementSibling?.classList.contains('detail-title')).toBe(true);
    });
});
