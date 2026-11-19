import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { NextStepView, SpecDetailView } from '../../../shared/protocol/detail';
import { NARROW_QUERY } from '../../../shared/protocol/layout';
import { noPlanText } from '../../../shared/protocol/planMapTexts';
import { planSample } from '../../../shared/protocol/testing/planSample';
import { App } from '../../App';
import { boardEvent, boardView, card } from '../../board/testing/views';
import { createClient, type ShellClient } from '../../client';
import { detailEvent, detailView } from '../../detail/testing/views';
import { baseView, mount, send, shellEvent, type Mounted } from '../../testing/dom';

let mounted: Mounted | undefined;
const clients: ShellClient[] = [];
const original = window.matchMedia;
let narrow: boolean;

beforeEach(() => {
    narrow = false;
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
    window.matchMedia = original;
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});


async function render(detail: SpecDetailView | ReturnType<typeof detailView>): Promise<HTMLElement> {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    const client = createClient({ post: () => undefined });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    const view = detail as SpecDetailView;
    await send(shellEvent(baseView({ area: 'planMap', selection: { stem: view.stem, number: view.number, ...(view.path === undefined ? {} : { path: view.path }) } }), 1));
    await send(boardEvent(boardView([card(view.number)], { planSpecs: [{ stem: view.stem, number: view.number, title: view.title, problems: [] }] })));
    await send(detailEvent(detail as never));
    return mounted.container;
}

const ONE: NextStepView = { rule: 'NS-6', lines: [{ text: 'Implement T-003 of .specs/active/0007-thing.plan.md', intent: 'Continue with T-003 Reject money values' }] };
const TWO: NextStepView = { rule: 'NS-6', lines: [...(ONE as { lines: Array<{ text: string; intent: string }> }).lines, { text: '/sdd-plan .specs/active/0007-thing.md', intent: 'Not sure where it stands? Let the agent report first' }] };
const TIPS: NextStepView = { ...(TWO as object), tips: { coach: 'Run this in your agent chat.', about: ['One step at a time.'] } } as NextStepView;
const COMPILE: NextStepView = { rule: 'NS-5', lines: [{ text: '/sdd-compile .specs/active/0007-thing.md', intent: 'Have the result verified' }] };

function planned(nextStep: NextStepView, overrides: Partial<SpecDetailView> = {}): SpecDetailView {
    return { ...(detailView(overrides, nextStep) as SpecDetailView), plan: planSample() };
}

function names(header: Element): string[] {
    return [...header.children].map((child) => (child.matches('.plan-map-title') ? 'title' : child.matches('.next-step') ? 'next' : child.matches('[role="progressbar"], .progress-bar, .progress, .progress-absent') || child.querySelector('[role="progressbar"]') !== null ? 'count' : child.matches('.plan-map-open') ? 'open' : child.matches('.plan-map-closing') ? 'closing' : child.className));
}

function firstLine(root: Element): { intent: string; text: string } {
    const line = root.querySelector('.next-step-lines li')!;
    return { intent: line.querySelector('.next-step-intent')!.textContent!.replace(/\s+/g, ' ').trim(), text: line.querySelector('code')!.textContent! };
}

function visible(root: Element): string {
    const clone = root.cloneNode(true) as Element;
    clone.querySelectorAll('.visually-hidden').forEach((hidden) => hidden.remove());
    return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('0025 AC-009: the Plan map header carries the next step', () => {
    it.each([['one line', ONE], ['two lines', TWO], ['with tips', TIPS], ['verify', COMPILE]] as const)('0025 AC-009: %s: the header order holds, the first line is the next step, and the side panel has no second Next step', async (_name, next) => {
        const detail = planned(next);
        const container = await render(detail);
        const header = container.querySelector('.plan-map-header')!;
        const order = names(header);
        expect(order.slice(0, 2)).toEqual(['title', 'next']);
        expect(order.slice(2)).toEqual(['count', 'open', 'closing']);
        const expected = (next as { lines: Array<{ intent: string; text: string }> }).lines[0]!;
        expect(firstLine(header)).toEqual({ intent: expected.intent, text: expected.text });
        expect(header.querySelectorAll('.next-step-lines li')).toHaveLength((next as { lines: unknown[] }).lines.length);
        expect(visible(header)).not.toMatch(/Stage \d+ can run in parallel/);
        expect(container.querySelectorAll('.next-step')).toHaveLength(1);
        expect(container.querySelector('.side-panel .next-step')).toBeNull();
        if ('tips' in next) {
            expect(header.querySelector('.step-coach')?.textContent).toBe('Run this in your agent chat.');
        }
    });

    it('0025 AC-009: a spec with a Problem keeps its mark in the title row, before the next step', async () => {
        const container = await render(planned(ONE, { problems: [{ sentence: 'Its plan link points to a file that is missing.', reason: 'plan link x points to a missing file' }] }));
        const header = container.querySelector('.plan-map-header')!;
        expect(header.querySelector('.plan-map-title .card-problems')).not.toBeNull();
        expect(names(header).slice(0, 2)).toEqual(['title', 'next']);
    });

    it('0025 AC-016: the map header never shows the parallel hint, the side panel does not either while the header shows the next step', async () => {
        const container = await render(planned({ ...(TWO as object), parallel: { stage: 2 } } as NextStepView));
        expect(container.querySelector('.parallel-hint')).toBeNull();
        expect(container.textContent).not.toMatch(/Stage \d+ can run in parallel/);
        expect(container.textContent).not.toContain('Ways to run it');
    });

    it('0025 AC-009: below 900 px the map shows alone, with the header\'s next step and no side panel', async () => {
        narrow = true;
        const container = await render(planned(TWO));
        expect(container.querySelector('.side-panel')).toBeNull();
        expect(container.querySelectorAll('.plan-map-header .next-step')).toHaveLength(1);
    });

    it('0025 AC-009: a spec without a plan keeps M-13 in the map and Write the plan in the side panel', async () => {
        const detail = detailView({ state: 'Backlog' }) as SpecDetailView;
        const { plan: _plan, ...bare } = detail;
        const container = await render(bare);
        expect(container.querySelector('.plan-map')?.textContent).toContain(noPlanText(detail.number));
        expect(container.querySelector('.plan-map .next-step')).toBeNull();
        expect(container.querySelector('.side-panel .next-step')?.textContent).toContain('Write the plan');
    });
});
