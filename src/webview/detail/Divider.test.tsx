import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../shared/protocol/envelope';
import { NARROW_QUERY } from '../../shared/protocol/layout';
import type { SelectedSpec } from '../../shared/protocol/messages';
import { DIVIDER_LABEL, DIVIDER_TOOLTIP } from '../../shared/protocol/texts';
import { App } from '../App';
import { boardEvent, boardView, card } from '../board/testing/views';
import { createClient, type ShellClient } from '../client';
import { baseView, mount, send, shellEvent, type Mounted } from '../testing/dom';
import { resetSectionMemory } from './sectionMemory';
import { detailEvent, detailView } from './testing/views';

let posted: Envelope[];
let mounted: Mounted | undefined;
let seq: number;
const clients: ShellClient[] = [];

const SELECTED: SelectedSpec = { stem: '0007-thing', number: '0007' };

let frameWidth: number;
let narrow: boolean;
let observers: { callback: () => void }[];
let captured: number[];

const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
const saved: Record<string, unknown> = {};
const originalMatchMedia = window.matchMedia;
const originalObserver = (globalThis as { ResizeObserver?: unknown }).ResizeObserver;

beforeEach(() => {
    posted = [];
    seq = 0;
    frameWidth = 1428;
    narrow = false;
    observers = [];
    captured = [];
    saved.getBoundingClientRect = proto.getBoundingClientRect;
    saved.setPointerCapture = proto.setPointerCapture;
    saved.releasePointerCapture = proto.releasePointerCapture;
    proto.getBoundingClientRect = function (this: HTMLElement) {
        const width = this.classList.contains('area-frame') ? frameWidth : 0;
        return { left: 0, top: 0, right: width, bottom: width === 0 ? 0 : 800, width, height: width === 0 ? 0 : 800, x: 0, y: 0, toJSON: () => ({}) };
    };
    proto.setPointerCapture = (id: number) => void captured.push(id);
    proto.releasePointerCapture = () => undefined;
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
        private readonly callback: () => void;
        constructor(callback: () => void) {
            this.callback = callback;
            observers.push({ callback });
        }
        observe(): void {
            return undefined;
        }
        unobserve(): void {
            return undefined;
        }
        disconnect(): void {
            observers = observers.filter((entry) => entry.callback !== this.callback);
        }
    };
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
    for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) {
            delete proto[key];
        } else {
            proto[key] = value;
        }
    }
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = originalObserver;
    window.matchMedia = originalMatchMedia;
    resetSectionMemory();
    unmountAll();
});

function unmountAll(): void {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
}

async function resize(width: number): Promise<void> {
    frameWidth = width;
    await act(async () => [...observers].forEach((entry) => entry.callback()));
}

async function open(sideWidth?: number, selection: SelectedSpec | null = SELECTED): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    seq += 1;
    await send(shellEvent(baseView({ area: 'board', selection: selection ?? undefined, ...(sideWidth === undefined ? {} : { sideWidth }) }), seq));
    await send(boardEvent(boardView([card('0007')])));
    if (selection !== null) {
        await send(detailEvent(detailView()));
    }
    return mounted.container;
}

function divider(container: HTMLElement): HTMLElement {
    return container.querySelector<HTMLElement>('[role="separator"]')!;
}

function panel(container: HTMLElement): HTMLElement {
    return container.querySelector<HTMLElement>('aside.side-panel')!;
}

function requests(type: string): unknown[] {
    return posted.filter((message) => message.type === type).map((message) => message.payload);
}

function widthOf(container: HTMLElement): number {
    return Number(divider(container).getAttribute('aria-valuenow'));
}

async function key(element: HTMLElement, name: string, shift = false): Promise<KeyboardEvent> {
    const event = new KeyboardEvent('keydown', { key: name, shiftKey: shift, bubbles: true, cancelable: true });
    await act(async () => void element.dispatchEvent(event));
    return event;
}

async function pointer(element: HTMLElement, type: string, clientX = 0, extra: PointerEventInit = {}): Promise<void> {
    await act(async () => void element.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX, pointerId: 7, button: 0, ...extra })));
}

describe('AC-023: one divider between area and side panel', () => {
    it('renders one vertical separator controlling the side panel, with min 320, max frame - 360, now 571 at 1428 px, its name and tooltip', async () => {
        const container = await open();
        expect(container.querySelectorAll('[role="separator"]')).toHaveLength(1);
        const element = divider(container);
        expect(element.getAttribute('aria-orientation')).toBe('vertical');
        expect(panel(container).id).not.toBe('');
        expect(element.getAttribute('aria-controls')).toBe(panel(container).id);
        expect(element.getAttribute('aria-valuemin')).toBe('320');
        expect(element.getAttribute('aria-valuemax')).toBe('1068');
        expect(element.getAttribute('aria-valuenow')).toBe('571');
        expect(element.getAttribute('aria-label')).toBe(DIVIDER_LABEL);
        expect(element.getAttribute('title')).toBe(DIVIDER_TOOLTIP);
        expect([DIVIDER_LABEL, DIVIDER_TOOLTIP]).toEqual(['Resize the side panel', 'Drag to resize. Double-click to reset.']);
        expect(element.tabIndex).toBe(0);
        expect(element.previousElementSibling?.classList.contains('area-content')).toBe(true);
        expect(element.nextElementSibling).toBe(panel(container));
    });

    it('the side panel takes the width as an inline style: 571 px at 1428 px, 400 px at 900 px', async () => {
        const container = await open();
        expect(panel(container).style.width).toBe('571px');
        await resize(900);
        expect(panel(container).style.width).toBe('400px');
        expect(divider(container).getAttribute('aria-valuemax')).toBe('540');
    });

    it('no divider and no inline width without a selection, and none below 900 px', async () => {
        const without = await open(undefined, null);
        expect(without.querySelector('[role="separator"]')).toBeNull();
        unmountAll();
        narrow = true;
        const alone = await open();
        expect(alone.querySelector('[role="separator"]')).toBeNull();
        expect(panel(alone).style.width).toBe('');
        unmountAll();
        narrow = false;
        expect((await open()).querySelectorAll('[role="separator"]')).toHaveLength(1);
    });
});

describe('AC-023: keyboard', () => {
    it('Left widens the side panel by 16 px and Right narrows it, with Shift by 64 px, each sending the fraction', async () => {
        const container = await open();
        const element = divider(container);
        await act(async () => element.focus());
        const left = await key(element, 'ArrowLeft');
        expect(left.defaultPrevented).toBe(true);
        expect(widthOf(container)).toBe(587);
        await key(element, 'ArrowRight');
        expect(widthOf(container)).toBe(571);
        await key(element, 'ArrowLeft', true);
        expect(widthOf(container)).toBe(635);
        await key(element, 'ArrowRight', true);
        expect(widthOf(container)).toBe(571);
        expect(requests('setSideWidth')).toEqual([587 / 1428, 571 / 1428, 635 / 1428, 571 / 1428].map((fraction) => ({ fraction })));
        expect(document.activeElement).toBe(element);
        expect(panel(container).style.width).toBe('571px');
    });

    it('Home gives the side panel its smallest width, End its largest', async () => {
        const container = await open();
        const element = divider(container);
        await key(element, 'End');
        expect(widthOf(container)).toBe(1068);
        expect(panel(container).style.width).toBe('1068px');
        await key(element, 'Home');
        expect(widthOf(container)).toBe(320);
        expect(requests('setSideWidth')).toEqual([{ fraction: 1068 / 1428 }, { fraction: 320 / 1428 }]);
    });

    it('a key that changes nothing sends nothing, and the width never leaves its limits', async () => {
        const container = await open();
        const element = divider(container);
        await key(element, 'Home');
        await key(element, 'Home');
        await key(element, 'ArrowRight');
        await key(element, 'ArrowRight', true);
        expect(widthOf(container)).toBe(320);
        expect(requests('setSideWidth')).toHaveLength(1);
        await key(element, 'End');
        await key(element, 'ArrowLeft', true);
        expect(widthOf(container)).toBe(1068);
    });

    it('Enter resets to the default and shows 571, sending resetSideWidth', async () => {
        const container = await open(0.6);
        const element = divider(container);
        expect(widthOf(container)).toBe(857);
        const enter = await key(element, 'Enter');
        expect(enter.defaultPrevented).toBe(true);
        expect(requests('resetSideWidth')).toEqual([{}]);
        expect(widthOf(container)).toBe(571);
        expect(panel(container).style.width).toBe('571px');
    });

    it('other keys do nothing and are not swallowed', async () => {
        const container = await open();
        const event = await key(divider(container), 'a');
        expect(event.defaultPrevented).toBe(false);
        expect(posted.filter((message) => message.type === 'setSideWidth' || message.type === 'resetSideWidth')).toEqual([]);
    });
});

describe('AC-023: pointer', () => {
    it('a double-click resets and shows 571', async () => {
        const container = await open(0.6);
        await act(async () => void divider(container).dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })));
        expect(requests('resetSideWidth')).toEqual([{}]);
        expect(widthOf(container)).toBe(571);
    });

    it('a drag follows the pointer within the limits, sends nothing while moving and one fraction at pointerup', async () => {
        const container = await open();
        const element = divider(container);
        await pointer(element, 'pointerdown', 857);
        expect(captured).toEqual([7]);
        expect(element.hasAttribute('data-dragging')).toBe(true);
        await pointer(element, 'pointermove', 700);
        expect(widthOf(container)).toBe(728);
        expect(panel(container).style.width).toBe('728px');
        await pointer(element, 'pointermove', 1300);
        expect(widthOf(container)).toBe(320);
        await pointer(element, 'pointermove', 5);
        expect(widthOf(container)).toBe(1068);
        await pointer(element, 'pointermove', 628);
        expect(requests('setSideWidth')).toEqual([]);
        await pointer(element, 'pointerup', 628);
        expect(requests('setSideWidth')).toEqual([{ fraction: 800 / 1428 }]);
        expect(element.hasAttribute('data-dragging')).toBe(false);
        await pointer(element, 'pointermove', 300);
        expect(widthOf(container)).toBe(800);
    });

    it('a drag also ends at lostpointercapture, once', async () => {
        const container = await open();
        const element = divider(container);
        await pointer(element, 'pointerdown', 857);
        await pointer(element, 'pointermove', 628);
        await pointer(element, 'lostpointercapture', 628);
        await pointer(element, 'pointerup', 628);
        expect(requests('setSideWidth')).toEqual([{ fraction: 800 / 1428 }]);
        await pointer(element, 'pointermove', 100);
        expect(widthOf(container)).toBe(800);
    });

    it('0022 AC-023: lostpointercapture alone ends the drag: one fraction, the drag mark gone, later moves ignored, and no pointerup is needed', async () => {
        const container = await open();
        const element = divider(container);
        await pointer(element, 'pointerdown', 857);
        await pointer(element, 'pointermove', 628);
        expect(requests('setSideWidth')).toEqual([]);
        await pointer(element, 'lostpointercapture', 628);
        expect(requests('setSideWidth')).toEqual([{ fraction: 800 / 1428 }]);
        expect(element.hasAttribute('data-dragging')).toBe(false);
        await pointer(element, 'pointermove', 100);
        expect(widthOf(container)).toBe(800);
        expect(requests('setSideWidth')).toHaveLength(1);
    });

    it('a press with another button, or a move without a press, changes nothing', async () => {
        const container = await open();
        const element = divider(container);
        await pointer(element, 'pointerdown', 857, { button: 2 });
        await pointer(element, 'pointermove', 628);
        expect(widthOf(container)).toBe(571);
        expect(captured).toEqual([]);
        expect(element.hasAttribute('data-dragging')).toBe(false);
    });

    it('a drag works in a browser without pointer capture', async () => {
        delete proto.setPointerCapture;
        const container = await open();
        const element = divider(container);
        await pointer(element, 'pointerdown', 857);
        await pointer(element, 'pointermove', 628);
        await pointer(element, 'pointerup', 628);
        expect(requests('setSideWidth')).toEqual([{ fraction: 800 / 1428 }]);
    });
});

describe('AC-024: the remembered fraction applies', () => {
    it('a remembered 0.6 shows 857 px at 1428 px', async () => {
        const container = await open(0.6);
        expect(widthOf(container)).toBe(857);
        expect(panel(container).style.width).toBe('857px');
    });

    it('a remembered 0.7 shows 540 px at a frame of 900 px, sends nothing, and is clamped to 640 px at a frame of 1000 px', async () => {
        const container = await open(0.7);
        await resize(900);
        expect(widthOf(container)).toBe(540);
        expect(posted.filter((message) => message.type === 'setSideWidth' || message.type === 'resetSideWidth')).toEqual([]);
        await resize(1000);
        expect(widthOf(container)).toBe(640);
    });

    it('the host echo of a change keeps the shown width, and a host reset shows the default', async () => {
        const container = await open();
        await key(divider(container), 'ArrowLeft');
        seq += 1;
        await send(shellEvent(baseView({ area: 'board', selection: SELECTED, sideWidth: 587 / 1428 }), seq));
        expect(widthOf(container)).toBe(587);
        seq += 1;
        await send(shellEvent(baseView({ area: 'board', selection: SELECTED }), seq));
        expect(widthOf(container)).toBe(571);
    });
});
