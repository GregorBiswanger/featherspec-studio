import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AREAS } from '../shared/protocol/areas';
import { PROTOCOL_VERSION, type Envelope } from '../shared/protocol/envelope';
import { App } from './App';
import { createClient, type ShellClient } from './client';
import { baseView, click, isKeyboardReachable, mount, pressKey, send, shellEvent, type Mounted } from './testing/dom';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function start(): Promise<Mounted> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    return mounted;
}

function items(container: HTMLElement): HTMLButtonElement[] {
    return [...container.querySelectorAll<HTMLButtonElement>('nav button')];
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('AC-004: the navigation', () => {
    it('0020 AC-016: lists exactly Overview and Board, in this order', async () => {
        const { container } = await start();
        expect(items(container).map((item) => item.textContent?.trim())).toEqual(AREAS.map((area) => area.title));
        expect(items(container).map((item) => item.textContent?.trim())).toEqual(['Overview', 'Board']);
    });

    it('sends hello on boot', async () => {
        await start();
        expect(posted).toHaveLength(1);
        expect(posted[0]).toMatchObject({ v: PROTOCOL_VERSION, kind: 'req', type: 'hello', payload: { lastSeq: 0 } });
    });

    it('a click on an item shows that area at once and sends navigate', async () => {
        const { container } = await start();
        await click(items(container)[1]!);
        expect(container.querySelector('h1')?.textContent).toBe('Board');
        const navigate = posted.find((message) => message.type === 'navigate');
        expect(navigate?.payload).toEqual({ area: 'board' });
        expect(navigate?.id).toBeTypeOf('string');
    });

    it('AC-022: Enter and Space on the focused item switch the area', async () => {
        const { container } = await start();
        await pressKey(items(container)[1]!, 'Enter');
        expect(container.querySelector('h1')?.textContent).toBe('Board');
        await pressKey(items(container)[0]!, ' ');
        expect(container.querySelector('h1')?.textContent).toBe('Overview');
        expect(posted.filter((message) => message.type === 'navigate')).toHaveLength(2);
    });

    it('AC-022: every item is a native button that can take keyboard focus', async () => {
        const { container } = await start();
        for (const item of items(container)) {
            expect(item.type).toBe('button');
            expect(isKeyboardReachable(item)).toBe(true);
            item.focus();
            expect(document.activeElement).toBe(item);
        }
    });

    it('0018 AC-026: the current area is marked with aria-current and the area heading; no marker and no ▸ anywhere in the navigation', async () => {
        const { container } = await start();
        await click(items(container)[1]!);
        const current = items(container).filter((item) => item.getAttribute('aria-current') === 'page');
        expect(current).toHaveLength(1);
        expect(current[0]?.textContent).toContain('Board');
        expect(container.querySelector('nav')?.textContent).not.toContain('▸');
        expect(container.querySelector('nav [data-marker]')).toBeNull();
        expect(container.querySelector('h1')?.textContent).toBe('Board');
    });

    it('PD-054: every item shows the icon of its area before its title, hidden from assistive technology, and no two items share one', async () => {
        const { container } = await start();
        const icons = items(container).map((item) => item.querySelector('svg[data-icon]'));
        expect(icons.map((icon) => icon?.getAttribute('data-icon'))).toEqual(['overview', 'board']);
        expect(icons.every((icon) => icon?.getAttribute('aria-hidden') === 'true')).toBe(true);
        expect(new Set(icons.map((icon) => icon?.querySelector('path')?.getAttribute('d'))).size).toBe(2);
        expect(items(container).map((item) => item.textContent?.replace('▸', '').trim())).toEqual(['Overview', 'Board']);
    });

    it('0020 AC-016: no panel element sends a request for the removed Spec Explorer, whichever item is activated', async () => {
        const { container } = await start();
        for (const item of items(container)) {
            await click(item);
        }
        const areas = posted.filter((message) => message.type === 'navigate').map((message) => (message.payload as { area: string }).area);
        expect(areas).toEqual(['overview', 'board']);
        expect(JSON.stringify(posted)).not.toContain('specExplorer');
    });

    it('AC-023: the navigation has an accessible name', async () => {
        const { container } = await start();
        expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe('Studio areas');
    });
});

describe('0018 AC-025: the project name once, with a tooltip', () => {
    it('shows the folder name exactly once in the panel and the version and read time as its tooltip', async () => {
        const { container } = await start();
        await send(shellEvent(baseView({ projectName: 'alpha-project', projectVersion: '1.10.0', updatedAt: new Date(2026, 10, 16, 9, 5).toISOString() }), 1));
        expect(container.textContent?.split('alpha-project').length).toBe(2);
        expect(container.querySelector('.project-name')?.getAttribute('title')).toBe('FeatherSpec 1.10.0 · Updated 2026-11-16 09:05');
    });

    it('T-02: the time reads Updated HH:MM today', async () => {
        const { container } = await start();
        const now = new Date();
        const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        await send(shellEvent(baseView({ projectName: 'alpha-project', projectVersion: '1.10.0', updatedAt: now.toISOString() }), 1));
        expect(container.querySelector('.project-name')?.getAttribute('title')).toBe(`FeatherSpec 1.10.0 · Updated ${hhmm}`);
    });

    it('a legacy project reads "FeatherSpec unknown"', async () => {
        const { container } = await start();
        await send(shellEvent(baseView({ projectName: 'alpha-project', projectVersion: 'unknown', updatedAt: new Date().toISOString() }), 1));
        expect(container.querySelector('.project-name')?.getAttribute('title')).toMatch(/^FeatherSpec unknown · Updated /);
    });
});

describe('AC-014: loading', () => {
    it('shows "Loading project…" with a progress indicator before the first snapshot, in place of the area content', async () => {
        const { container } = await start();
        const progress = container.querySelector('[role="progressbar"]');
        expect(progress).not.toBeNull();
        expect(container.textContent).toContain('Loading project…');
    });

    it('the navigation stays operable while loading: an item changes the current area', async () => {
        const { container } = await start();
        await click(items(container)[1]!);
        expect(container.querySelector('h1')?.textContent).toBe('Board');
        expect(container.textContent).toContain('Loading project…');
    });

    it('control: after the first snapshot the loading text is gone', async () => {
        const { container } = await start();
        await send(shellEvent(baseView(), 1));
        expect(container.textContent).not.toContain('Loading project…');
    });

    it('the host decides the area once a snapshot arrives, and the pending local choice ends with the response', async () => {
        const { container } = await start();
        await send(shellEvent(baseView({ area: 'board' }), 1));
        expect(container.querySelector('h1')?.textContent).toBe('Board');
    });

    it('re-sends hello with the last seen sequence number when an event is missing', async () => {
        await start();
        await send(shellEvent(baseView(), 1));
        await send(shellEvent(baseView({ area: 'board' }), 4));
        const hellos = posted.filter((message) => message.type === 'hello');
        expect(hellos).toHaveLength(2);
        expect(hellos[1]?.payload).toEqual({ lastSeq: 1 });
    });

    it('ignores a stale event with a lower sequence number', async () => {
        const { container } = await start();
        await send(shellEvent(baseView({ area: 'board' }), 2));
        await send(shellEvent(baseView({ area: 'overview' }), 1));
        expect(container.querySelector('h1')?.textContent).toBe('Board');
    });
});
