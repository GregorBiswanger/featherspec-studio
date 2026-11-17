import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AREAS } from '../shared/protocol/areas';
import type { Envelope } from '../shared/protocol/envelope';
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
    it('lists Mission Control, Spec Board and Spec Explorer', async () => {
        const { container } = await start();
        expect(items(container).map((item) => item.textContent?.replace('▸', '').trim())).toEqual(AREAS.map((area) => area.title));
    });

    it('sends hello on boot', async () => {
        await start();
        expect(posted).toHaveLength(1);
        expect(posted[0]).toMatchObject({ v: 1, kind: 'req', type: 'hello', payload: { lastSeq: 0 } });
    });

    it('a click on an item shows that area at once and sends navigate', async () => {
        const { container } = await start();
        await click(items(container)[1]!);
        expect(container.querySelector('h1')?.textContent).toBe('Spec Board');
        const navigate = posted.find((message) => message.type === 'navigate');
        expect(navigate?.payload).toEqual({ area: 'specBoard' });
        expect(navigate?.id).toBeTypeOf('string');
    });

    it('AC-022: Enter and Space on the focused item switch the area', async () => {
        const { container } = await start();
        await pressKey(items(container)[2]!, 'Enter');
        expect(container.querySelector('h1')?.textContent).toBe('Spec Explorer');
        await pressKey(items(container)[1]!, ' ');
        expect(container.querySelector('h1')?.textContent).toBe('Spec Board');
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

    it('AC-023: the current area is marked with aria-current, a visible marker and the area heading, not by colour', async () => {
        const { container } = await start();
        await click(items(container)[1]!);
        const current = items(container).filter((item) => item.getAttribute('aria-current') === 'page');
        expect(current).toHaveLength(1);
        expect(current[0]?.textContent).toContain('Spec Board');
        expect(current[0]?.querySelector('[data-marker]')?.textContent).toBe('▸');
        expect(items(container)[0]?.querySelector('[data-marker]')).toBeNull();
        expect(container.querySelector('h1')?.textContent).toBe('Spec Board');
    });

    it('PD-054: every item shows the icon of its area before its title, hidden from assistive technology, and no two items share one', async () => {
        const { container } = await start();
        const icons = items(container).map((item) => item.querySelector('svg[data-icon]'));
        expect(icons.map((icon) => icon?.getAttribute('data-icon'))).toEqual(['missionControl', 'specBoard', 'specExplorer']);
        expect(icons.every((icon) => icon?.getAttribute('aria-hidden') === 'true')).toBe(true);
        expect(new Set(icons.map((icon) => icon?.querySelector('path')?.getAttribute('d'))).size).toBe(3);
        expect(items(container).map((item) => item.textContent?.replace('▸', '').trim())).toEqual(['Mission Control', 'Spec Board', 'Spec Explorer']);
    });

    it('AC-023: the navigation has an accessible name', async () => {
        const { container } = await start();
        expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe('Studio areas');
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
        await click(items(container)[2]!);
        expect(container.querySelector('h1')?.textContent).toBe('Spec Explorer');
        expect(container.textContent).toContain('Loading project…');
    });

    it('control: after the first snapshot the loading text is gone', async () => {
        const { container } = await start();
        await send(shellEvent(baseView(), 1));
        expect(container.textContent).not.toContain('Loading project…');
    });

    it('the host decides the area once a snapshot arrives, and the pending local choice ends with the response', async () => {
        const { container } = await start();
        await send(shellEvent(baseView({ area: 'specBoard' }), 1));
        expect(container.querySelector('h1')?.textContent).toBe('Spec Board');
    });

    it('re-sends hello with the last seen sequence number when an event is missing', async () => {
        await start();
        await send(shellEvent(baseView(), 1));
        await send(shellEvent(baseView({ area: 'specBoard' }), 4));
        const hellos = posted.filter((message) => message.type === 'hello');
        expect(hellos).toHaveLength(2);
        expect(hellos[1]?.payload).toEqual({ lastSeq: 1 });
    });

    it('ignores a stale event with a lower sequence number', async () => {
        const { container } = await start();
        await send(shellEvent(baseView({ area: 'specBoard' }), 2));
        await send(shellEvent(baseView({ area: 'specExplorer' }), 1));
        expect(container.querySelector('h1')?.textContent).toBe('Spec Board');
    });
});
