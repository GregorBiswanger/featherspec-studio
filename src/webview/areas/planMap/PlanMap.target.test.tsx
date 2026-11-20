import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpecDetailView } from '../../../shared/protocol/detail';
import type { ShellFocus } from '../../../shared/protocol/messages';
import { planSample, stage, step } from '../../../shared/protocol/testing/planSample';
import { App } from '../../App';
import { boardEvent, boardView, card } from '../../board/testing/views';
import { createClient, type ShellClient } from '../../client';
import { detailEvent, detailView } from '../../detail/testing/views';
import { baseView, click, mount, send, shellEvent, type Mounted } from '../../testing/dom';
import { forgetTarget } from './target';

let mounted: Mounted | undefined;
let seq: number;
const clients: ShellClient[] = [];
const scrolled: Element[] = [];

beforeEach(() => {
    seq = 0;
    forgetTarget();
    scrolled.length = 0;
    Element.prototype.scrollIntoView = function scrollIntoView(this: Element) {
        scrolled.push(this);
    };
});

afterEach(() => {
    vi.useRealTimers();
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

const SELECTION = { stem: '0007-thing', number: '0007' };

function detailOf(plan = planSample()): SpecDetailView {
    const view = detailView({}) as SpecDetailView;
    return { ...view, plan };
}

async function start(): Promise<HTMLElement> {
    const client = createClient({ post: () => undefined });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    return mounted.container;
}

async function shell(focus?: ShellFocus, area: 'planMap' | 'board' = 'planMap'): Promise<void> {
    seq += 1;
    await send(shellEvent(baseView({ area, selection: SELECTION }), seq, undefined, focus));
}

async function showMap(plan = planSample(), focus?: ShellFocus): Promise<HTMLElement> {
    const container = await start();
    await shell(focus);
    await send(boardEvent(boardView([card('0007')], { planSpecs: [{ stem: '0007-thing', number: '0007', title: 'Thing 0007', problems: [] }] })));
    await send(detailEvent(detailOf(plan)));
    return container;
}

function cardOf(container: HTMLElement, id: string): HTMLElement | null {
    return container.querySelector<HTMLElement>(`[data-step-card="${id}"]`);
}

const toggleOf = (container: HTMLElement, id: string) => cardOf(container, id)!.querySelector<HTMLButtonElement>('button[data-card-toggle]')!;

describe('0025 AC-001 (map side): a step target expands, scrolls, focuses and highlights', () => {
    it('0025 AC-001: the card is expanded, scrolled into view, its disclosure has focus and data-highlight stands for 1500 ms', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        const container = await showMap(planSample(), { n: 1, stem: '0007-thing', step: 'T-004' });
        const toggle = toggleOf(container, 'T-004');
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(scrolled).toContain(cardOf(container, 'T-004'));
        expect(document.activeElement).toBe(toggle);
        expect(cardOf(container, 'T-004')!.hasAttribute('data-highlight')).toBe(true);
        await act(async () => void vi.advanceTimersByTime(1499));
        expect(cardOf(container, 'T-004')!.hasAttribute('data-highlight')).toBe(true);
        await act(async () => void vi.advanceTimersByTime(2));
        expect(cardOf(container, 'T-004')!.hasAttribute('data-highlight')).toBe(false);
        expect(toggleOf(container, 'T-004').getAttribute('aria-expanded')).toBe('true');
    });
});

describe('0025 AC-003: a finished stage holding the target shows its cards', () => {
    it('0025 AC-003: the target T-001 in finished stage 1 shows cards, expanded and highlighted; no target shows chips', async () => {
        const plain = await showMap();
        expect(plain.querySelector('[data-stage-row="1"] .plan-stage-chips')).not.toBeNull();
        expect(cardOf(plain, 'T-001')).toBeNull();
        mounted?.unmount();
        mounted = undefined;
        const container = await showMap(planSample(), { n: 1, stem: '0007-thing', step: 'T-001' });
        expect(container.querySelector('[data-stage-row="1"] .plan-stage-chips')).toBeNull();
        expect(toggleOf(container, 'T-001').getAttribute('aria-expanded')).toBe('true');
        expect(cardOf(container, 'T-001')!.hasAttribute('data-highlight')).toBe(true);
    });
});

describe('0025 AC-006 (b): a target applies once', () => {
    it('0025 AC-006: after the developer collapsed the card or the highlight ended, later messages without a target leave everything as it is; a second message with the same target applies again', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        const focus: ShellFocus = { n: 1, stem: '0007-thing', step: 'T-004' };
        const container = await showMap(planSample(), focus);
        await act(async () => void vi.advanceTimersByTime(1600));
        await click(toggleOf(container, 'T-004'));
        expect(toggleOf(container, 'T-004').getAttribute('aria-expanded')).toBe('false');
        (document.activeElement as HTMLElement | null)?.blur();
        await shell();
        await send(detailEvent(detailOf()));
        await send(boardEvent(boardView([card('0007')])));
        expect(toggleOf(container, 'T-004').getAttribute('aria-expanded')).toBe('false');
        expect(cardOf(container, 'T-004')!.hasAttribute('data-highlight')).toBe(false);
        expect(document.activeElement).not.toBe(toggleOf(container, 'T-004'));
        await shell({ n: 2, ...{ stem: '0007-thing', step: 'T-004' } });
        expect(toggleOf(container, 'T-004').getAttribute('aria-expanded')).toBe('true');
        expect(document.activeElement).toBe(toggleOf(container, 'T-004'));
        expect(cardOf(container, 'T-004')!.hasAttribute('data-highlight')).toBe(true);
    });

    it('0025 AC-006: a target that arrives before its spec shows waits and applies on the first render that shows it', async () => {
        const container = await start();
        await shell({ n: 1, stem: '0007-thing', step: 'T-003' });
        expect(cardOf(container, 'T-003')).toBeNull();
        await send(boardEvent(boardView([card('0007')])));
        await send(detailEvent(detailOf()));
        expect(toggleOf(container, 'T-003').getAttribute('aria-expanded')).toBe('true');
        expect(document.activeElement).toBe(toggleOf(container, 'T-003'));
    });

    it('0025 AC-006: a reload of the map (another area and back) does not apply the same target again', async () => {
        const container = await showMap(planSample(), { n: 1, stem: '0007-thing', step: 'T-004' });
        await click(toggleOf(container, 'T-004'));
        await shell(undefined, 'board');
        await shell(undefined, 'planMap');
        expect(toggleOf(container, 'T-004').getAttribute('aria-expanded')).toBe('false');
    });
});

describe('0025 §7: a gone step or a heading target focuses the map heading', () => {
    it('0025 AC-006: a step the plan lacks focuses the heading and highlights no card', async () => {
        const container = await showMap(planSample(), { n: 1, stem: '0007-thing', step: 'T-099' });
        expect(document.activeElement).toBe(container.querySelector('[data-map-heading]'));
        expect(container.querySelector('[data-highlight]')).toBeNull();
    });

    it('0025 AC-005: a heading target focuses the heading', async () => {
        const container = await showMap(planSample(), { n: 1, stem: '0007-thing', heading: true });
        expect(document.activeElement).toBe(container.querySelector('[data-map-heading]'));
    });
});

describe('0025 §7: a model update during the highlight', () => {
    it('0025 AC-001: the highlight stays while the card exists', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        const container = await showMap(planSample(), { n: 1, stem: '0007-thing', step: 'T-004' });
        await act(async () => void vi.advanceTimersByTime(700));
        await send(detailEvent(detailOf(planSample({ count: { done: 3, total: 5 } }))));
        expect(cardOf(container, 'T-004')!.hasAttribute('data-highlight')).toBe(true);
        expect(stageCount(container)).toBe(3);
    });
});

function stageCount(container: HTMLElement): number {
    return container.querySelectorAll('[data-stage-row]').length;
}

void stage;
void step;

describe('0025 AC-016 (ways target): the ways block opens, scrolls, takes focus and is highlighted', () => {
    const waysOf = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-ways]');
    const waysToggle = (container: HTMLElement) => container.querySelector<HTMLButtonElement>('[data-ways] .plan-ways-toggle')!;

    it('0025 AC-016: a ways target expands the block, scrolls it, focuses its disclosure button and highlights it for 1500 ms', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        const container = await showMap(planSample(), { n: 1, stem: '0007-thing', ways: true });
        expect(waysToggle(container).getAttribute('aria-expanded')).toBe('true');
        expect(waysToggle(container).textContent).toBe('Ways to run stage 2');
        expect(scrolled).toContain(waysOf(container));
        expect(document.activeElement).toBe(waysToggle(container));
        expect(waysOf(container)!.hasAttribute('data-highlight')).toBe(true);
        await act(async () => void vi.advanceTimersByTime(1501));
        expect(waysOf(container)!.hasAttribute('data-highlight')).toBe(false);
        expect(waysToggle(container).getAttribute('aria-expanded')).toBe('true');
    });

    it('0025 AC-016: a later message without a target changes nothing, a second with the same target applies again', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        const container = await showMap(planSample(), { n: 1, stem: '0007-thing', ways: true });
        await act(async () => void vi.advanceTimersByTime(1600));
        await click(waysToggle(container));
        expect(waysToggle(container).getAttribute('aria-expanded')).toBe('false');
        (document.activeElement as HTMLElement | null)?.blur();
        await shell();
        await send(detailEvent(detailOf()));
        expect(waysToggle(container).getAttribute('aria-expanded')).toBe('false');
        expect(waysOf(container)!.hasAttribute('data-highlight')).toBe(false);
        await shell({ n: 2, stem: '0007-thing', ways: true });
        expect(waysToggle(container).getAttribute('aria-expanded')).toBe('true');
        expect(document.activeElement).toBe(waysToggle(container));
        expect(waysOf(container)!.hasAttribute('data-highlight')).toBe(true);
    });

    it('0025 AC-016: a plan without a ways block focuses the heading', async () => {
        const base = planSample();
        const plain = planSample({ stages: base.stages.map(({ ways: _ways, ...rest }) => rest) });
        const container = await showMap(plain, { n: 1, stem: '0007-thing', ways: true });
        expect(waysOf(container)).toBeNull();
        expect(document.activeElement).toBe(container.querySelector('[data-map-heading]'));
    });
});
