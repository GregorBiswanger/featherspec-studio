import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../shared/protocol/envelope';
import type { OverviewView } from '../shared/protocol/overview';
import type { SendView } from '../shared/protocol/assistant';
import { sampleView } from '../shared/protocol/testing/overviewSample';
import { App } from './App';
import { createClient, type ShellClient } from './client';
import { boardEvent, boardView } from './board/testing/views';
import { baseView, click, mount, overviewEvent, send, shellEvent, type Mounted } from './testing/dom';

const TWO_TARGETS: SendView = { assistant: 'copilot', target: 'new', targets: ['new', 'current'] };
const ONE_TARGET: SendView = { assistant: 'claudeCode', target: 'new', targets: ['new'] };
const TEXT = 'No specs yet. Start with /sdd-specify';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(area: 'overview' | 'board', event: Envelope): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area }), 1));
    await send(event);
    return mounted.container;
}

function overview(start: SendView | undefined): OverviewView {
    return { ...sampleView(), figures: { kind: 'empty' }, problems: { rows: [], lines: [] }, ...(start === undefined ? {} : { start }) };
}

const requests = (type: string): unknown[] => posted.filter((message) => message.type === type).map((message) => message.payload);

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe.each([
    ['Overview', (start: SendView | undefined) => open('overview', overviewEvent(overview(start))), '[data-zero-specs]'],
    ['Board', (start: SendView | undefined) => open('board', boardEvent(boardView([], start === undefined ? {} : { start }))), '.board-empty'],
] as const)('0035 AC-007: No specs yet in the %s', (_name, render, selector) => {
    it('0035 AC-007 keeps the text literally and replaces Copy prompt by Send to <Name>', async () => {
        const container = await render(TWO_TARGETS);
        const empty = container.querySelector<HTMLElement>(selector)!;
        expect(empty.textContent).toContain(TEXT);
        expect(empty.querySelector('button.copy-button:not(.send-main)')).toBeNull();
        expect(empty.querySelector('button.send-main')?.textContent).toBe('Send to Copilot');
        expect(empty.querySelector('button.send-main')?.getAttribute('aria-label')).toContain('/sdd-specify');
        expect(empty.querySelector('.send-attach, .step-coach')).toBeNull();
    });

    it('0035 AC-007 Send hands /sdd-specify over with the default target and no attachment', async () => {
        const container = await render(ONE_TARGET);
        await click(container.querySelector<HTMLButtonElement>(`${selector} button.send-main`)!);
        expect(requests('sendPrompt')).toEqual([{ assistant: 'claudeCode', target: 'new', line: '/sdd-specify', token: expect.any(String) }]);
        expect(requests('copyText')).toEqual([]);
    });

    it('0035 AC-007 the menu is the one of 0026: new chat, current chat, Copy prompt', async () => {
        const container = await render(TWO_TARGETS);
        await click(container.querySelector<HTMLButtonElement>(`${selector} button.send-arrow`)!);
        const items = [...container.querySelectorAll<HTMLElement>(`${selector} [role^="menuitem"]`)];
        expect(items.map((item) => item.textContent)).toEqual(['Send to a new chat', 'Send to the current chat', 'Copy prompt']);
    });

    it('0035 AC-008 without start the action is Copy prompt of /sdd-specify as before', async () => {
        const container = await render(undefined);
        const empty = container.querySelector<HTMLElement>(selector)!;
        expect(empty.querySelector('button.send-main')).toBeNull();
        await click(empty.querySelector<HTMLButtonElement>('button.copy-button:not(.send-main)')!);
        expect(requests('copyText')).toEqual([{ text: '/sdd-specify' }]);
    });
});
