import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Envelope } from '../../shared/protocol/envelope';
import { createClient, type ShellClient } from '../client';
import { baseView, mount, send, shellEvent, type Mounted } from '../testing/dom';
import { act } from 'react';
import { StepLink } from './StepLink';
import { ShellProvider } from '../shell';

let mounted: Mounted | undefined;
let posted: Envelope[];
const clients: ShellClient[] = [];
let opened: Array<[string, number]>;

beforeEach(() => {
    posted = [];
    opened = [];
});

afterEach(() => {
    vi.restoreAllMocks();
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

async function link(): Promise<HTMLButtonElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(
        <ShellProvider client={client}>
            <StepLink id="T-003" target={{ key: '.specs/active/0001-a.plan.md', line: 42 }} fileResult={undefined} onOpen={(key, line) => void opened.push([key, line])} reason="T-003 Step T-003, next">
                T-003
            </StepLink>
        </ShellProvider>,
    );
    await send(shellEvent(baseView({ area: 'board', selection: { stem: '0001-a', path: '.specs/active/0001-a.md', number: '0001' } }), 1));
    return mounted.container.querySelector<HTMLButtonElement>('button.file-link')!;
}

function navigations(): unknown[] {
    return posted.filter((message) => message.type === 'navigate').map((message) => message.payload);
}

function mouse(button: HTMLElement, init: MouseEventInit): Promise<void> {
    return act(async () => {
        button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, ...init }));
    });
}

function key(button: HTMLElement, name: string, init: KeyboardEventInit = {}): Promise<void> {
    return act(async () => {
        const down = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init });
        button.dispatchEvent(down);
        if (!down.defaultPrevented) {
            button.click();
        }
    });
}

describe('0025 AC-002: a step link with Ctrl or Cmd opens the plan at the heading', () => {
    it.each([{ ctrlKey: true }, { metaKey: true }])('0025 AC-002: click with %o sends the open request only', async (modifier) => {
        const button = await link();
        await mouse(button, modifier);
        expect(opened).toEqual([['.specs/active/0001-a.plan.md', 42]]);
        expect(navigations()).toEqual([]);
    });

    it.each([{ ctrlKey: true }, { metaKey: true }])('0025 AC-002: Enter or Space with %o opens the plan file once and navigates nowhere', async (modifier) => {
        const button = await link();
        await key(button, 'Enter', modifier);
        await key(button, ' ', modifier);
        expect(opened).toEqual([
            ['.specs/active/0001-a.plan.md', 42],
            ['.specs/active/0001-a.plan.md', 42],
        ]);
        expect(navigations()).toEqual([]);
    });
});

describe('0025 AC-001: a plain activation navigates into the Plan map', () => {
    it('0025 AC-001: click, Enter and Space each send one navigation request for planMap with the spec and the step, and no open request', async () => {
        const button = await link();
        await mouse(button, {});
        await key(button, 'Enter');
        await key(button, ' ');
        expect(navigations()).toEqual(Array(3).fill({ area: 'planMap', target: { kind: 'spec', stem: '0001-a', path: '.specs/active/0001-a.md', step: 'T-003' } }));
        expect(opened).toEqual([]);
    });
});

describe('0025 AC-004: tooltip and description', () => {
    it('0025 AC-004: the name, a line break and U-02 with Ctrl+click; Cmd+click on macOS; the accessible name is unchanged', async () => {
        const button = await link();
        expect(button.title).toBe('T-003 Step T-003, next\nShow T-003 in the plan map · Ctrl+click opens the plan file');
        expect(document.getElementById(button.getAttribute('aria-describedby')!)?.textContent).toBe(button.title);
        expect(button.hasAttribute('aria-label')).toBe(false);
        mounted?.unmount();
        mounted = undefined;
        vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
        const mac = await link();
        expect(mac.title).toBe('T-003 Step T-003, next\nShow T-003 in the plan map · Cmd+click opens the plan file');
    });
});
