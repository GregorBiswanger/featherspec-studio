import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../../shared/protocol/envelope';
import type { OverviewView } from '../../../shared/protocol/overview';
import { sampleView } from '../../../shared/protocol/testing/overviewSample';
import { App } from '../../App';
import { createClient, type ShellClient } from '../../client';
import { baseView, click, ctrlClick, mount, overviewEvent, pressKey, send, shellEvent, type Mounted } from '../../testing/dom';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

const PLAN = '.specs/active/0001-a.plan.md';
const STEP = { intent: 'Continue', short: 'Implement T-003', line: `Implement T-003 of ${PLAN}`, lines: [{ text: `Implement T-003 of ${PLAN}`, intent: 'Continue with T-003 Reject money values' }] };

function row(stem: string, number: string, state: 'Active' | 'Ready', extra: Partial<OverviewView['now'][number]> = {}): OverviewView['now'][number] {
    return { spec: { stem, number, title: stem, found: true }, state, status: state, problems: 0, ...extra };
}

function view(): OverviewView {
    const result = sampleView();
    result.now = [row('0001-a', '0001', 'Active', { step: STEP, link: { id: 'T-003', open: { key: PLAN, line: 40 } } }), row('0002-b', '0002', 'Active', { step: STEP })];
    result.upNext = { rows: [row('0003-c', '0003', 'Ready', { step: { ...STEP, short: 'Implement T-001', line: 'Implement T-001 of p3', lines: [{ text: 'Implement T-001 of p3', intent: 'Start implementing: T-001 Step' }] }, link: { id: 'T-001', open: { key: '.specs/backlog/0003-c.plan.md', line: 9 } } })], more: 0, stems: ['0003-c'] };
    return result;
}

async function open(): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'overview' }), 1));
    await send(overviewEvent(view()));
    return mounted.container;
}

function rowOf(container: HTMLElement, stem: string): HTMLElement {
    return container.querySelector<HTMLElement>(`[data-spec-row="${stem}"]`)!;
}

function textOf(root: Element): string {
    const clone = root.cloneNode(true) as Element;
    clone.querySelectorAll('.visually-hidden').forEach((hidden) => hidden.remove());
    return clone.textContent ?? '';
}

function navigations(): unknown[] {
    return posted.filter((message) => message.type === 'navigate').map((message) => message.payload);
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('0025 AC-027: step IDs in Overview rows are step links', () => {
    it('0025 AC-027: a click on T-003 in Continue · Implement T-003 sends one navigation for that row\'s spec and activates no row control', async () => {
        const container = await open();
        const item = rowOf(container, '0001-a');
        const link = item.querySelector<HTMLButtonElement>('.step-text button.file-link')!;
        expect(textOf(item.querySelector('.step-text')!)).toBe('Next Continue · Implement T-003');
        expect(link.textContent).toBe('T-003');
        expect(link.title).toBe('T-003\nShow T-003 in the plan map · Ctrl+click opens the plan file');
        expect(item.querySelector('.ov-row')?.contains(link)).toBe(false);
        await click(link);
        expect(navigations()).toEqual([{ area: 'planMap', target: { kind: 'spec', stem: '0001-a', step: 'T-003' } }]);
        expect(posted.filter((message) => message.type === 'select' || message.type === 'copyText')).toEqual([]);
    });

    it.each(['Enter', ' '] as const)('0025 AC-027: %j on the link navigates once and activates no row control', async (key) => {
        const container = await open();
        await pressKey(rowOf(container, '0001-a').querySelector<HTMLButtonElement>('.step-text button.file-link')!, key);
        expect(navigations()).toEqual([{ area: 'planMap', target: { kind: 'spec', stem: '0001-a', step: 'T-003' } }]);
        expect(posted.filter((message) => message.type === 'select' || message.type === 'copyText')).toEqual([]);
    });

    it('0025 AC-027: Ctrl or Cmd gives the open request only', async () => {
        const container = await open();
        const link = rowOf(container, '0001-a').querySelector<HTMLButtonElement>('.step-text button.file-link')!;
        await ctrlClick(link);
        expect(navigations()).toEqual([]);
        expect(posted.filter((message) => message.type === 'openFile').map((message) => message.payload)).toEqual([{ key: PLAN, line: 40 }]);
    });

    it('0025 AC-027: the Up next row links too, and a row without a link keeps plain text and no button', async () => {
        const container = await open();
        const plain = rowOf(container, '0002-b');
        expect(plain.querySelector('.step-text button')).toBeNull();
        expect(textOf(plain.querySelector('.step-text')!)).toBe('Next Continue · Implement T-003');
        await click(rowOf(container, '0003-c').querySelector<HTMLButtonElement>('.step-text button.file-link')!);
        expect(navigations()).toEqual([{ area: 'planMap', target: { kind: 'spec', stem: '0003-c', step: 'T-001' } }]);
    });

    it('0025 AC-027: a click on the row outside the link still selects, and Copy stays after the step text', async () => {
        const container = await open();
        const item = rowOf(container, '0001-a');
        await click(item.querySelector('.ov-row')!);
        expect(posted.filter((message) => message.type === 'select').map((message) => message.payload)).toEqual([{ stem: '0001-a' }]);
        expect(item.querySelector('.step-text')?.nextElementSibling).toBe(item.querySelector('.next-step-copy'));
    });
});
