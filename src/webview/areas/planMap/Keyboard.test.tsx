import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { SpecDetailView } from '../../../shared/protocol/detail';
import type { PlanView } from '../../../shared/protocol/planMap';
import { planSample, stage, step } from '../../../shared/protocol/testing/planSample';
import { App } from '../../App';
import { boardEvent, boardView, card } from '../../board/testing/views';
import { createClient, type ShellClient } from '../../client';
import { detailEvent, detailView } from '../../detail/testing/views';
import { baseView, click, mount, send, shellEvent, type Mounted } from '../../testing/dom';

let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

async function open(plan: PlanView): Promise<HTMLElement> {
    const client = createClient({ post: () => undefined });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'planMap', selection: { stem: '0007-thing', number: '0007' } }), 1));
    await send(boardEvent(boardView([card('0007')], { planSpecs: [] })));
    const view = detailView() as SpecDetailView;
    await send(detailEvent({ ...view, plan }));
    return mounted.container;
}

function toggle(container: HTMLElement, id: string): HTMLButtonElement {
    return container.querySelector<HTMLButtonElement>(`[data-card-toggle="${id}"]`)!;
}

async function focus(element: HTMLElement): Promise<void> {
    await act(async () => element.focus());
}

async function press(element: Element, key: string, init: KeyboardEventInit = {}): Promise<boolean> {
    let notPrevented = true;
    await act(async () => {
        notPrevented = element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
    });
    return notPrevented;
}

function plan(): PlanView {
    return planSample({
        stages: [
            stage(1, [{ steps: [step('T-001', 'done')] }]),
            stage(2, [{ steps: [step('T-003', 'next'), step('T-004', 'open'), step('T-005', 'open')] }, { sep: '→', steps: [step('T-006', 'open')] }], { current: true }),
            stage(3, [{ steps: [step('T-007', 'open'), step('T-008', 'open')] }]),
        ],
    });
}

describe('0023 AC-011: keyboard in the Plan map', () => {
    it('one tab stop: the first card head; every other head and every link of a card without the stop is out of the tab order', async () => {
        const container = await open(plan());
        const heads = [...container.querySelectorAll<HTMLButtonElement>('[data-card-toggle]')];
        expect(heads.map((head) => head.tabIndex)).toEqual([0, -1, -1, -1, -1, -1]);
        expect(container.querySelectorAll('[data-step-chip] button').length).toBeGreaterThan(0);
    });

    it('Left and Right move within a row, Up and Down between rows, at the same position or the last one', async () => {
        const container = await open(plan());
        await focus(toggle(container, 'T-003'));
        await press(toggle(container, 'T-003'), 'ArrowRight');
        expect(document.activeElement).toBe(toggle(container, 'T-004'));
        await press(document.activeElement!, 'ArrowRight');
        expect(document.activeElement).toBe(toggle(container, 'T-005'));
        await press(document.activeElement!, 'ArrowRight');
        expect(document.activeElement).toBe(toggle(container, 'T-005'));
        await press(document.activeElement!, 'ArrowDown');
        expect(document.activeElement).toBe(toggle(container, 'T-006'));
        await press(document.activeElement!, 'ArrowDown');
        expect(document.activeElement).toBe(toggle(container, 'T-007'));
        await press(document.activeElement!, 'ArrowRight');
        expect(document.activeElement).toBe(toggle(container, 'T-008'));
        await press(document.activeElement!, 'ArrowLeft');
        expect(document.activeElement).toBe(toggle(container, 'T-007'));
        await press(document.activeElement!, 'ArrowUp');
        expect(document.activeElement).toBe(toggle(container, 'T-006'));
        await press(document.activeElement!, 'ArrowUp');
        expect(document.activeElement).toBe(toggle(container, 'T-003'));
        await press(document.activeElement!, 'ArrowUp');
        expect(document.activeElement).toBe(toggle(container, 'T-003'));
    });

    it('the tab stop follows the focus', async () => {
        const container = await open(plan());
        await focus(toggle(container, 'T-003'));
        await press(toggle(container, 'T-003'), 'ArrowDown');
        const heads = [...container.querySelectorAll<HTMLButtonElement>('[data-card-toggle]')];
        expect(heads.map((head) => head.tabIndex)).toEqual([-1, -1, -1, 0, -1, -1]);
        await focus(toggle(container, 'T-008'));
        expect(toggle(container, 'T-008').tabIndex).toBe(0);
        expect(toggle(container, 'T-006').tabIndex).toBe(-1);
    });

    it('Enter and Space are the button\'s own: arrows with a modifier are left alone', async () => {
        const container = await open(plan());
        await focus(toggle(container, 'T-003'));
        const notPrevented = await press(toggle(container, 'T-003'), 'ArrowRight', { shiftKey: true });
        expect(notPrevented).toBe(true);
        expect(document.activeElement).toBe(toggle(container, 'T-003'));
        await click(toggle(container, 'T-003'));
        expect(toggle(container, 'T-003').getAttribute('aria-expanded')).toBe('true');
    });

    it('a card that is expanded keeps its links reachable only while it holds the tab stop', async () => {
        const open1 = { key: '.specs/active/0007-thing.plan.md', line: 41 };
        const open2 = { key: '.specs/active/0007-thing.plan.md', line: 42 };
        const withCovers = planSample({
            stages: [
                stage(
                    1,
                    [
                        {
                            steps: [
                                step('T-001', 'next', { open: open1, covers: [{ id: 'AC-001', open: { key: '.specs/active/0007-thing.md', line: 3 } }] }),
                                step('T-002', 'open', { open: open2, covers: [{ id: 'AC-002', open: { key: '.specs/active/0007-thing.md', line: 4 } }] }),
                            ],
                        },
                    ],
                    { current: true },
                ),
            ],
        });
        const container = await open(withCovers);
        const links = (id: string): number[] => [...container.querySelectorAll<HTMLButtonElement>(`[data-step-card="${id}"] button.file-link`)].map((link) => link.tabIndex);
        expect(links('T-001')).toEqual([0, 0]);
        expect(links('T-002')).toEqual([-1, -1]);
        await click(toggle(container, 'T-002'));
        expect(toggle(container, 'T-002').getAttribute('aria-expanded')).toBe('true');
        expect(container.querySelectorAll('[data-step-card="T-002"] .step-card-open button.file-link')).toHaveLength(1);
        expect(links('T-002')).toEqual([-1, -1]);
        await focus(toggle(container, 'T-002'));
        expect(links('T-002')).toEqual([0, 0]);
        expect(links('T-001')).toEqual([-1, -1]);
    });

    it('an arrow key is handled by the grid: its default, scrolling the map, is prevented, also at an end', async () => {
        const container = await open(plan());
        await focus(toggle(container, 'T-003'));
        expect(await press(toggle(container, 'T-003'), 'ArrowRight')).toBe(false);
        expect(document.activeElement).toBe(toggle(container, 'T-004'));
        expect(await press(document.activeElement!, 'ArrowUp')).toBe(false);
        expect(document.activeElement).toBe(toggle(container, 'T-004'));
        expect(await press(document.activeElement!, 'ArrowDown')).toBe(false);
    });
});

function twice(): PlanView {
    return planSample({
        stages: [
            stage(1, [{ steps: [step('T-001', 'done')] }]),
            stage(2, [{ steps: [step('T-003', 'next'), step('T-004', 'open')] }], { current: true }),
            stage(3, [{ steps: [step('T-004', 'open'), step('T-005', 'open')] }]),
        ],
    });
}

function head(container: HTMLElement, stageNumber: number, id: string): HTMLButtonElement {
    return container.querySelector<HTMLButtonElement>(`[data-stage-row="${stageNumber}"] [data-card-toggle="${id}"]`)!;
}

describe('0023 AC-011: an ID that stands in two stages is two cards, each at its own place (§7)', () => {
    it('there is exactly one tab stop, the first card; the second T-004 is not a second one', async () => {
        const container = await open(twice());
        const heads = [...container.querySelectorAll<HTMLButtonElement>('[data-card-toggle]')];
        expect(heads.map((entry) => entry.tabIndex)).toEqual([0, -1, -1, -1]);
    });

    it('the arrows start from the card that holds the focus: from the T-004 of stage 3 Right reaches T-005 and Up the card above it', async () => {
        const container = await open(twice());
        await focus(head(container, 3, 'T-004'));
        expect([...container.querySelectorAll<HTMLButtonElement>('[data-card-toggle]')].map((entry) => entry.tabIndex)).toEqual([-1, -1, 0, -1]);
        await press(document.activeElement!, 'ArrowRight');
        expect(document.activeElement).toBe(head(container, 3, 'T-005'));
        await press(document.activeElement!, 'ArrowLeft');
        await press(document.activeElement!, 'ArrowLeft');
        expect(document.activeElement).toBe(head(container, 3, 'T-004'));
        await press(document.activeElement!, 'ArrowUp');
        expect(document.activeElement).toBe(head(container, 2, 'T-003'));
        await press(document.activeElement!, 'ArrowRight');
        expect(document.activeElement).toBe(head(container, 2, 'T-004'));
        await press(document.activeElement!, 'ArrowDown');
        expect(document.activeElement).toBe(head(container, 3, 'T-005'));
    });
});
