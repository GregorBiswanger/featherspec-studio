import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DiagnosticLine, OpenCriterion } from '../../shared/protocol/detail';
import type { Envelope } from '../../shared/protocol/envelope';
import type { SelectedSpec } from '../../shared/protocol/messages';
import { noticeText } from '../../shared/protocol/texts';
import { App } from '../App';
import { boardEvent, boardView, card } from '../board/testing/views';
import { createClient, type ShellClient } from '../client';
import { sharedSpecView } from '../../shared/protocol/testing/overviewSample';
import { baseView, click, mount, overviewEvent, pressKey, send, shellEvent, type Mounted } from '../testing/dom';
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

async function shell(area: 'overview' | 'board', selection?: SelectedSpec, notice?: { number: string }): Promise<void> {
    seq += 1;
    await send(shellEvent(baseView({ area, selection, notice }), seq));
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

    it('0019 F1: the opener of one spec is not used once the host selects another spec, nor after a close', async () => {
        const container = await board();
        await openFromCard(container, '0003');
        await shell('board', SELECTED);
        await send(detailEvent(detailView()));
        const heading = container.querySelector<HTMLElement>('aside.side-panel [data-detail-heading]')!;
        await focus(heading);
        await escape(heading);
        await shell('board');
        expect(document.activeElement).toBe(cardOf(container, '0007'));
        await shell('board', SELECTED);
        await send(detailEvent(detailView()));
        await focus(closeButton(container));
        await click(closeButton(container));
        await shell('board');
        expect(document.activeElement).toBe(cardOf(container, '0007'));
        await focus(cardOf(container, '0003'));
        await shell('board', { stem: '0003-thing', number: '0003' });
        await send(detailEvent(detailView({ stem: '0003-thing', number: '0003', key: '.specs/active/0003-thing.md' })));
        await focus(closeButton(container));
        await click(closeButton(container));
        await shell('board');
        expect(document.activeElement).toBe(cardOf(container, '0003'));
    });

    it('0019 G1: the opener is a second card of the same spec: closing returns focus to it, not to the first card', async () => {
        const first = card('0007', { path: '.specs/active/0007-thing.md' });
        const second = card('0007', { key: '.specs/backlog/0007-thing.md', path: '.specs/backlog/0007-thing.md' });
        const container = await board(undefined, [first, second]);
        const cards = [...container.querySelectorAll<HTMLElement>('[data-card]')];
        await focus(cards[1]!);
        await pressKey(cards[1]!, 'Enter');
        await shell('board', { ...SELECTED, path: second.path! });
        await send(detailEvent(detailView({ key: second.path! })));
        await focus(closeButton(container));
        await escape(closeButton(container));
        await shell('board');
        expect(document.activeElement).toBe(cards[1]);
        expect(document.activeElement).not.toBe(cards[0]);
    });

    it('0019 G2: in the Overview without an opener closing focuses the first Overview row of the spec, not the first control of the area', async () => {
        const container = await start();
        await shell('overview', { stem: '0002-x', number: '0002' });
        await send(overviewEvent(sharedSpecView()));
        const rows = [...container.querySelectorAll<HTMLElement>('[data-spec-row] .ov-row')];
        expect(rows[0]!.closest('[data-spec-row]')?.getAttribute('data-spec-row')).toBe('0001-a');
        await focus(closeButton(container));
        await click(closeButton(container));
        await shell('overview');
        expect(document.activeElement).toBe(rows[1]);
    });

    it('0019 F1: the opener is forgotten on close, so a later selection by the host focuses the first card of the spec', async () => {
        const first = card('0007', { path: '.specs/active/0007-thing.md' });
        const second = card('0007', { key: '.specs/backlog/0007-thing.md', path: '.specs/backlog/0007-thing.md' });
        const container = await board(undefined, [first, second]);
        const cards = () => [...container.querySelectorAll<HTMLElement>('[data-card]')];
        await focus(cards()[1]!);
        await pressKey(cards()[1]!, 'Enter');
        await shell('board', { ...SELECTED, path: second.path! });
        await send(detailEvent(detailView({ key: second.path! })));
        await focus(closeButton(container));
        await click(closeButton(container));
        await shell('board');
        expect(document.activeElement).toBe(cards()[1]);
        await shell('board', SELECTED);
        await send(detailEvent(detailView()));
        await focus(closeButton(container));
        await click(closeButton(container));
        await shell('board');
        expect(document.activeElement).toBe(cards()[0]);
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

    describe('0019 D1, G6: the same control keeps the focus when an earlier entry leaves', () => {
        const criterion = (id: string, line: number): OpenCriterion => ({ id, text: `The ${id} shall hold.`, built: false, open: { key: SPEC_KEY, line } });
        const problem = (reason: string, line: number): DiagnosticLine => ({ reason, open: { key: PLAN_KEY, line } });
        const criteria = (open: OpenCriterion[]) => ({
            progress: { needs: [], noPlan: false, steps: { kind: 'none' as const }, criteria: { kind: 'criteria' as const, verified: 0, total: 3, open } },
        });
        const link = (container: HTMLElement, selector: string, text: string): HTMLElement =>
            [...container.querySelectorAll<HTMLElement>(`aside.side-panel ${selector}`)].find((element) => element.textContent === text || element.textContent?.includes(text))!;

        async function show(extra: Parameters<typeof detailView>[0], problems: DiagnosticLine[]): Promise<HTMLElement> {
            const container = await start();
            await shell('board', SELECTED);
            await send(boardEvent(boardView(CARDS)));
            await send(detailEvent(detailView(extra, undefined, problems)));
            return container;
        }

        it('an open criterion keeps the focus, and the side panel, the detail frame and the heading stay the same elements, when the criteria before it leave', async () => {
            const all = [criterion('AC-001', 10), criterion('AC-002', 20), criterion('AC-003', 30)];
            const container = await show(criteria(all), []);
            const panel = container.querySelector('aside.side-panel')!;
            const frame = panel.querySelector('.spec-detail')!;
            const heading = panel.querySelector('[data-detail-heading]')!;
            const target = link(container, '.criteria-open .file-link', 'AC-003');
            await focus(target);
            await send(detailEvent(detailView(criteria([all[1]!, all[2]!]), undefined, [])));
            expect(container.querySelectorAll('aside.side-panel .criteria-open li')).toHaveLength(2);
            expect(link(container, '.criteria-open .file-link', 'AC-003')).toBe(target);
            expect(document.activeElement).toBe(target);
            expect(container.querySelector('aside.side-panel')).toBe(panel);
            expect(panel.querySelector('.spec-detail')).toBe(frame);
            expect(panel.querySelector('[data-detail-heading]')).toBe(heading);
        });

        it('a Problem keeps the focus when the Problem before it is gone', async () => {
            const first = problem('Plan link is broken', 3);
            const second = problem('Two specs share the number 0007', 5);
            const container = await show({}, [first, second]);
            const target = link(container, '.detail-problems .file-link', 'Two specs share');
            await focus(target);
            await send(detailEvent(detailView({}, undefined, [second])));
            expect(container.querySelectorAll('aside.side-panel .detail-problems li')).toHaveLength(1);
            expect(document.activeElement).toBe(target);
        });

        it('control: when the focused criterion itself leaves, the heading takes the focus', async () => {
            const all = [criterion('AC-001', 10), criterion('AC-002', 20)];
            const container = await show(criteria(all), []);
            await focus(link(container, '.criteria-open .file-link', 'AC-002'));
            await send(detailEvent(detailView(criteria([all[0]!]), undefined, [])));
            expect(document.activeElement).toBe(container.querySelector('[data-detail-heading]'));
        });

        it('two equal entries stay two entries and raise no duplicate key warning', async () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
            try {
                const twin = problem('Plan link is broken', 3);
                const container = await show(criteria([criterion('AC-001', 10), criterion('AC-001', 10)]), [twin, twin]);
                expect(container.querySelectorAll('aside.side-panel .detail-problems li')).toHaveLength(2);
                expect(container.querySelectorAll('aside.side-panel .criteria-open li')).toHaveLength(2);
                expect(spy).not.toHaveBeenCalled();
            } finally {
                spy.mockRestore();
            }
        });
    });

    it('a spec that disappears closes the panel, shows the notice and follows the close rule', async () => {
        const container = await board();
        await openFromCard(container, '0003');
        await send(detailEvent(detailView({ stem: '0003-thing', number: '0003', key: '.specs/active/0003-thing.md' })));
        await shell('board', { stem: '0003-thing', number: '0003' });
        await focus(container.querySelector<HTMLElement>('[data-detail-heading]')!);
        await shell('board', undefined, { number: '0003' });
        expect(container.querySelector('aside.side-panel')).toBeNull();
        expect(container.querySelector('[data-notice]')?.textContent).toContain(noticeText('0003'));
        expect(document.activeElement).toBe(cardOf(container, '0003'));
    });
});

describe('0021 AC-014: Escape with the About this step toggletip open', () => {
    async function withTip(): Promise<HTMLElement> {
        const container = await board(SELECTED);
        await send(detailEvent(detailView({}, { rule: 'NS-5', lines: [{ text: '/sdd-compile k', intent: 'Have the result verified' }], tips: { coach: 'new chat · strong model', about: ['one', 'two', 'three', 'four'] } })));
        return container;
    }

    it('the first Escape closes only the toggletip and keeps the side panel; the second sends clearSelection', async () => {
        const container = await withTip();
        const toggle = container.querySelector<HTMLButtonElement>('aside.side-panel button.toggletip')!;
        await click(toggle);
        await act(async () => toggle.focus());
        await escape(toggle);
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(requests('clearSelection')).toEqual([]);
        expect(container.querySelector('aside.side-panel')).not.toBeNull();
        expect(document.activeElement).toBe(toggle);
        await escape(toggle);
        expect(requests('clearSelection')).toEqual([{}]);
    });

    it('after a press on the text of the open toggletip focus is on the body: Escape there closes only the toggletip and keeps the side panel; the second Escape sends clearSelection', async () => {
        const container = await withTip();
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
        expect(container.querySelector('aside.side-panel')).not.toBeNull();
        expect(document.activeElement).toBe(toggle);
        await escape(toggle);
        expect(requests('clearSelection')).toEqual([{}]);
    });
});
