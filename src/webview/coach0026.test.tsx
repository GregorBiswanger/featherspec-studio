import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../shared/protocol/envelope';
import type { NextStepView, SpecDetailView } from '../shared/protocol/detail';
import type { SelectedSpec } from '../shared/protocol/messages';
import type { OverviewRow, OverviewView } from '../shared/protocol/overview';
import { planSample } from '../shared/protocol/testing/planSample';
import { sampleView } from '../shared/protocol/testing/overviewSample';
import { App } from './App';
import { boardEvent, boardView } from './board/testing/views';
import { createClient, type ShellClient } from './client';
import { detailEvent, detailView } from './detail/testing/views';
import { baseView, click, mount, overviewEvent, send, shellEvent, type Mounted } from './testing/dom';

let mounted: Mounted | undefined;
const clients: ShellClient[] = [];
let posted: Envelope[];
let seq: number;

beforeEach(() => {
    posted = [];
    seq = 0;
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

const COACH = 'new chat · strong model, other family';
const LINE = '/sdd-compile .specs/active/0001-r.md';
const TIPS = { coach: COACH, about: ['Effect.', 'Reasons.', 'Choose.', 'Settings.'] };
const STEP = { intent: 'Verify', short: '/sdd-compile', line: LINE, lines: [{ text: LINE, intent: 'Have the result verified' }] };
const FIRST: SelectedSpec = { stem: '0001-r', number: '0001' };
const OTHER: SelectedSpec = { stem: '0002-r', number: '0002' };
const NS5: NextStepView = { rule: 'NS-5', lines: [{ text: LINE, intent: 'Have the result verified' }], tips: TIPS } as NextStepView;
const SEND = { assistant: 'copilot' as const, target: 'new' as const, targets: ['new', 'current'] as Array<'new' | 'current'> };

function row(n: string, extra: Partial<OverviewRow> = {}): OverviewRow {
    return { spec: { stem: `${n}-r`, number: n, title: `Row ${n}`, found: true }, state: 'Review', status: 'Review', problems: 0, step: STEP, ...extra };
}

function view(withSend: boolean): OverviewView {
    const result = sampleView();
    result.now = { rows: [row('0001', { tips: TIPS, ...(withSend ? { send: SEND } : {}) }), row('0002')], more: 0, stems: ['0001-r', '0002-r'] };
    return result;
}

async function start(area: 'overview' | 'planMap' | 'board', selection: SelectedSpec | undefined, overview?: OverviewView): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    seq += 1;
    await send(shellEvent(baseView({ area, selection }), seq));
    if (overview !== undefined) {
        await send(overviewEvent(overview));
    }
    await send(boardEvent(boardView([])));
    return mounted.container;
}

async function select(selection: SelectedSpec | undefined): Promise<void> {
    seq += 1;
    await send(shellEvent(baseView({ area: 'overview', selection }), seq));
}

const firstRow = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-now] [data-spec-row="0001-r"]')!;
const action = (row: HTMLElement) => row.querySelector<HTMLElement>('button.send-main, button.copy-button')!;

describe('0026 AC-006: one coach line per view, quiet first Now row while its spec is selected', () => {
    it.each([false, true])('selected first Now row spec (send %s): no coach line and no (?); step text and action equal the unselected render', async (withSend) => {
        const container = await start('overview', undefined, view(withSend));
        const before = { step: firstRow(container).querySelector('.step-text')!.outerHTML, action: action(firstRow(container)).outerHTML };
        expect(firstRow(container).querySelector('.ov-coach')?.textContent).toContain(COACH);
        await select(FIRST);
        expect(firstRow(container).querySelector('.ov-coach')).toBeNull();
        expect(firstRow(container).querySelector('button.toggletip')).toBeNull();
        expect(firstRow(container).querySelector('.step-text')!.outerHTML).toBe(before.step);
        expect(action(firstRow(container)).outerHTML).toBe(before.action);
    });

    it('another spec or none selected: the row shows its coach line and (?)', async () => {
        for (const selection of [OTHER, undefined]) {
            const container = await start('overview', selection, view(true));
            expect(firstRow(container).querySelector('.ov-coach-text')?.textContent).toBe(COACH);
            expect(firstRow(container).querySelector('button.toggletip')).not.toBeNull();
            mounted?.unmount();
            mounted = undefined;
        }
    });

    it('the detail keeps its coach line while the first Now row is selected', async () => {
        const container = await start('overview', FIRST, view(false));
        await send(detailEvent(detailView({ stem: '0001-r', number: '0001' }, NS5)));
        expect(container.querySelectorAll('.step-coach')).toHaveLength(1);
        expect(container.querySelector('.step-coach')?.textContent).toBe(COACH);
        expect(container.querySelector('[data-now] .ov-coach')).toBeNull();
    });

    it('the selection moves to the row\'s spec while its (?) has focus: focus goes to the row action and no toggletip text stays', async () => {
        const container = await start('overview', undefined, view(true));
        const tip = firstRow(container).querySelector<HTMLButtonElement>('button.toggletip')!;
        await click(tip);
        await act(async () => tip.focus());
        expect(document.activeElement).toBe(tip);
        await select(FIRST);
        expect(document.activeElement).toBe(action(firstRow(container)));
        expect(container.querySelector('.toggletip-region')?.textContent ?? '').toBe('');
    });
});

describe('0026 AC-023: the coach line is visible text before any (?) is used', () => {
    it('detail: after the first line, not in a toggletip region, not hidden', async () => {
        const container = await start('board', FIRST);
        await send(detailEvent(detailView({ stem: '0001-r', number: '0001' }, NS5)));
        const coach = container.querySelector<HTMLElement>('p.step-coach')!;
        expect(coach.textContent).toBe(COACH);
        expect(coach.closest('.toggletip-region')).toBeNull();
        expect(coach.closest('[hidden], .visually-hidden')).toBeNull();
        const text = container.querySelector<HTMLElement>('.next-step-lines li')!.querySelector('code, .next-step-line, button')!;
        expect(text.compareDocumentPosition(coach) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('Plan map header: the coach line is visible text', async () => {
        const container = await start('planMap', FIRST);
        const detail = detailView({ stem: '0001-r', number: '0001' }, NS5) as SpecDetailView;
        await send(detailEvent({ ...detail, plan: planSample() }));
        const coach = container.querySelector<HTMLElement>('.plan-map-header .step-coach')!;
        expect(coach.textContent).toBe(COACH);
        expect(coach.closest('.toggletip-region, [hidden], .visually-hidden')).toBeNull();
    });

    it('first Now row: visible before any (?) is activated; the toggletip region is empty', async () => {
        const container = await start('overview', undefined, view(false));
        const coach = firstRow(container).querySelector<HTMLElement>('.ov-coach-text')!;
        expect(coach.textContent).toBe(COACH);
        expect(coach.closest('.toggletip-region')).toBeNull();
        expect(firstRow(container).querySelector('.toggletip-region')?.textContent).toBe('');
    });

    it('negative control: text inside the toggletip region is detected as such', async () => {
        const container = await start('overview', undefined, view(false));
        await click(firstRow(container).querySelector<HTMLButtonElement>('button.toggletip')!);
        const inside = firstRow(container).querySelector<HTMLElement>('.toggletip-region p')!;
        expect(inside.closest('.toggletip-region')).not.toBeNull();
    });
});
