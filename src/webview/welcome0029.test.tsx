import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../shared/protocol/envelope';
import type { OverviewView } from '../shared/protocol/overview';
import type { SendView } from '../shared/protocol/assistant';
import { sampleView } from '../shared/protocol/testing/overviewSample';
import { App } from './App';
import { createClient, type ShellClient } from './client';
import { boardEvent, boardView } from './board/testing/views';
import { baseView, click, mount, overviewEvent, send, shellEvent, type Mounted } from './testing/dom';

const HEADING = 'Welcome to FeatherSpec';
const BODY =
    'Set up this project first: run /sdd-setup with the AI assistant of your choice. It asks for the language of your docs, fills the Memory Bank and records the architecture snapshot.';
const CLAUDE: SendView = { assistant: 'claudeCode', target: 'new', targets: ['new'] };
const TWO_TARGETS: SendView = { assistant: 'copilot', target: 'new', targets: ['new', 'current'] };

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

function overview(welcome: OverviewView['welcome']): OverviewView {
    return { ...sampleView(), figures: { kind: 'empty' }, problems: { rows: [], lines: [] }, ...(welcome === undefined ? {} : { welcome }) };
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
    ['Overview', () => open('overview', overviewEvent(overview({ send: CLAUDE }))), '[data-welcome]'],
    ['Board', () => open('board', boardEvent(boardView([], { welcome: { send: CLAUDE } }))), '.board-empty[data-welcome]'],
] as const)('0029 AC-003, AC-004: the welcome in the %s', (_name, render, selector) => {
    it(`0029 AC-003 shows glyph (hidden from screen readers), heading, body and one action, in that order, literally`, async () => {
        const container = await render();
        const welcome = container.querySelector<HTMLElement>(selector)!;
        const children = [...welcome.children];
        expect(children[0]?.matches('svg[data-icon="feather"][aria-hidden="true"]')).toBe(true);
        expect(children[1]?.tagName).toBe('H2');
        expect(children[1]?.textContent).toBe(HEADING);
        expect(children[2]?.textContent).toBe(BODY);
        expect(children[3]?.querySelector('button') ?? children[3]).not.toBeNull();
        expect(welcome.querySelectorAll('button.send-main')).toHaveLength(1);
    });

    it('0029 AC-003 names /sdd-setup in the action and no text of the screen contains /sdd-specify, no attachment line, no figures', async () => {
        const container = await render();
        const welcome = container.querySelector<HTMLElement>(selector)!;
        expect(welcome.querySelector('button.send-main')?.getAttribute('aria-label')).toContain('/sdd-setup');
        expect(container.textContent).not.toContain('/sdd-specify');
        expect(container.textContent).not.toContain('No specs yet');
        expect(container.querySelector('.send-attach, [data-total], [data-now], [data-up-next]')).toBeNull();
    });

    it('0029 AC-003 the feather glyph takes the theme colour: no fill or stroke of its own', async () => {
        const glyph = (await render()).querySelector<SVGElement>('svg[data-icon="feather"]')!;
        expect(glyph.getAttribute('fill')).toBe('currentColor');
        expect(glyph.querySelector('[fill]:not([fill="currentColor"]), [stroke], [style]')).toBeNull();
        expect(glyph.hasAttribute('style')).toBe(false);
    });
});

describe('0029 AC-003, AC-005: Send and Copy prompt of the welcome', () => {
    it('0029 AC-005 Send hands /sdd-setup to the assistant with the default target and no attachment', async () => {
        const container = await open('overview', overviewEvent(overview({ send: TWO_TARGETS })));
        await click(container.querySelector<HTMLButtonElement>('[data-welcome] button.send-main')!);
        expect(requests('sendPrompt')).toEqual([{ assistant: 'copilot', target: 'new', line: '/sdd-setup', token: expect.stringMatching(/^[A-Za-z0-9-]{1,64}$/) }]);
        expect(requests('copyText')).toEqual([]);
    });

    it('0029 AC-005 Send on the Board posts the same request', async () => {
        const container = await open('board', boardEvent(boardView([], { welcome: { send: CLAUDE } })));
        await click(container.querySelector<HTMLButtonElement>('.board-empty button.send-main')!);
        expect(requests('sendPrompt')).toEqual([{ assistant: 'claudeCode', target: 'new', line: '/sdd-setup', token: expect.any(String) }]);
    });

    it('0029 AC-003 without an offered assistant the action is Copy prompt, and it copies /sdd-setup', async () => {
        const container = await open('overview', overviewEvent(overview({})));
        expect(container.querySelector('[data-welcome] button.send-main')).toBeNull();
        await click(container.querySelector<HTMLButtonElement>('[data-welcome] button.copy-button')!);
        expect(requests('copyText')).toEqual([{ text: '/sdd-setup' }]);
    });

    it('0029 AC-005 Copy prompt on the Board copies /sdd-setup', async () => {
        const container = await open('board', boardEvent(boardView([], { welcome: {} })));
        await click(container.querySelector<HTMLButtonElement>('.board-empty button.copy-button')!);
        expect(requests('copyText')).toEqual([{ text: '/sdd-setup' }]);
    });
});

describe('0029 AC-006: without a welcome the empty states are as before', () => {
    it('0029 AC-006 the Overview of a project whose setup ran shows No specs yet and Copy of /sdd-specify', async () => {
        const container = await open('overview', overviewEvent(overview(undefined)));
        expect(container.querySelector('[data-welcome]')).toBeNull();
        expect(container.querySelector('[data-zero-specs]')?.textContent).toContain('No specs yet. Start with /sdd-specify');
        await click(container.querySelector<HTMLButtonElement>('[data-zero-specs] .next-step-copy')!);
        expect(requests('copyText')).toEqual([{ text: '/sdd-specify' }]);
    });

    it('0029 AC-006 the Board of a project whose setup ran shows No specs yet and Copy of /sdd-specify', async () => {
        const container = await open('board', boardEvent(boardView([])));
        expect(container.querySelector('[data-welcome]')).toBeNull();
        expect(container.querySelector('.board-empty')?.textContent).toContain('No specs yet. Start with /sdd-specify');
    });
});

describe('0029 AC-007: the Up next line while setup has not run and specs exist', () => {
    function withSpecs(setup: boolean): OverviewView {
        const view = sampleView();
        view.upNext = { rows: [], more: 0, stems: [], ...(setup ? { setup: true as const } : {}) };
        return view;
    }

    it('0029 AC-007 shows the line of 0029 with an icon Copy of /sdd-setup and no welcome', async () => {
        const container = await open('overview', overviewEvent(withSpecs(true)));
        const next = container.querySelector('[data-up-next]')!;
        expect(next.querySelector('[data-nothing-up-next] span')?.textContent).toBe('Nothing up next. Set up this project first with /sdd-setup');
        expect(container.querySelector('[data-welcome]')).toBeNull();
        const copy = next.querySelector<HTMLButtonElement>('.next-step-copy')!;
        expect(copy.getAttribute('aria-label')).toBe('Copy prompt: /sdd-setup');
        await click(copy);
        expect(requests('copyText')).toEqual([{ text: '/sdd-setup' }]);
    });

    it('0029 AC-006 negative control: without the flag the line of today stays, copying /sdd-specify', async () => {
        const container = await open('overview', overviewEvent(withSpecs(false)));
        expect(container.querySelector('[data-nothing-up-next] span')?.textContent).toBe('Nothing up next. Start the next spec with /sdd-specify');
    });
});
