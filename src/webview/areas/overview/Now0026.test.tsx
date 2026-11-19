import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../../shared/protocol/envelope';
import type { OverviewRow, OverviewView } from '../../../shared/protocol/overview';
import { sampleView } from '../../../shared/protocol/testing/overviewSample';
import { App } from '../../App';
import { createClient, type ShellClient } from '../../client';
import { baseView, click, mount, overviewEvent, send, shellEvent, type Mounted } from '../../testing/dom';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(view: OverviewView): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'overview' }), 1));
    await send(overviewEvent(view));
    return mounted.container;
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

const STEP = { intent: 'Continue', short: 'Implement T-003', line: 'Implement T-003 of p', lines: [{ text: 'Implement T-003 of p', intent: 'Continue with T-003 Step' }] };
const SEND = { assistant: 'copilot' as const, target: 'new' as const, targets: ['new', 'current'] as Array<'new' | 'current'> };

function row(number: string, extra: Partial<OverviewRow> = {}): OverviewRow {
    return { spec: { stem: `${number}-r`, number, title: `Row ${number}`, found: true }, state: 'Active', status: 'Active', problems: 0, ...extra };
}

function withNow(count: number, total = count, extra: Partial<OverviewRow> = {}): OverviewView {
    const view = sampleView();
    const numbers = Array.from({ length: total }, (_, index) => String(index + 1).padStart(4, '0'));
    view.now = { rows: numbers.slice(0, count).map((number, index) => row(number, index === 0 ? extra : {})), more: Math.max(0, total - count), stems: numbers.map((number) => `${number}-r`) };
    return view;
}

const navigations = () => posted.filter((message) => message.type === 'navigate').map((message) => message.payload);
const nowMore = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-now] [data-drill="moreNow"]');

describe('0026 AC-007: + n more under Now asks for the Board with the named set Now', () => {
    it('Given AC-007\'s eight entries (five rows) the section shows + 3 more and one activation sends one request with label Now and every stem', async () => {
        const view = withNow(5, 8);
        const container = await open(view);
        expect(container.querySelectorAll('[data-now] [data-row-group="now"]')).toHaveLength(5);
        expect(nowMore(container)?.textContent).toBe('+ 3 more');
        await click(nowMore(container)!);
        expect(navigations()).toEqual([{ area: 'board', target: { kind: 'boardFilter', filter: { set: { label: 'Now', stems: view.now.stems } } } }]);
        expect(view.now.stems).toHaveLength(8);
    });

    it('+ n more follows the list inside the Now section, not the Up next one', async () => {
        const container = await open(withNow(5, 7));
        const more = nowMore(container)!;
        expect(more.closest('[data-now]')).not.toBeNull();
        expect(more.closest('[data-up-next]')).toBeNull();
        expect(container.querySelector('[data-now] ul.ov-list')?.compareDocumentPosition(more)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
});

describe('0026 AC-008: five entries show no more, six one, none Nothing in progress.', () => {
    it('five rows: no + n more; six entries: + 1 more', async () => {
        expect(nowMore(await open(withNow(5)))).toBeNull();
        mounted?.unmount();
        mounted = undefined;
        expect(nowMore(await open(withNow(5, 6)))?.textContent).toBe('+ 1 more');
    });

    it('no entry: Nothing in progress. and no + n more', async () => {
        const container = await open(withNow(0));
        expect(container.querySelector('[data-now] .ov-empty')?.textContent).toBe('Nothing in progress.');
        expect(nowMore(container)).toBeNull();
    });

    it('the first row carries the coach line, (?) and the split button; every later row only an icon Copy', async () => {
        const container = await open(withNow(3, 3, { step: STEP, send: SEND, tips: { coach: 'current or new chat · fast model', about: ['a', 'b', 'c', 'd'] } }));
        const rows = [...container.querySelectorAll('[data-now] [data-spec-row]')];
        expect(rows[0]?.querySelector('.send-split')).not.toBeNull();
        expect(rows[0]?.querySelector('.ov-coach')).not.toBeNull();
        for (const later of rows.slice(1)) {
            expect(later.querySelector('.send-split')).toBeNull();
            expect(later.querySelector('.ov-coach')).toBeNull();
        }
    });
});
