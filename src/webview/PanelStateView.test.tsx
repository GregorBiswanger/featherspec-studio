import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../shared/protocol/envelope';
import type { PanelState } from '../shared/protocol/messages';
import { App } from './App';
import { createClient, type ShellClient } from './client';
import { baseView, click, isKeyboardReachable, mount, pressKey, send, shellEvent, type Mounted } from './testing/dom';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    return mounted.container;
}

async function show(state: PanelState | undefined, extra: { restricted?: boolean } = {}): Promise<HTMLElement> {
    const container = await open();
    await send(shellEvent(baseView({ state, restricted: extra.restricted ?? false }), 1));
    return container;
}

function actions(container: HTMLElement): string[] {
    return [...container.querySelectorAll('.panel-state button')].map((button) => button.textContent ?? '');
}

function runActions(): unknown[] {
    return posted.filter((message) => message.type === 'runAction').map((message) => (message.payload as { action: string }).action);
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('panel states S1 to S9 in the panel UI', () => {
    const cases: { name: string; state: PanelState; text: string[]; actions: string[]; label: string }[] = [
        { name: 'AC-011 S1', state: { id: 'S1' }, text: ['Open a folder to use FeatherSpec Studio.'], actions: ['Open Folder'], label: 'No folder open' },
        { name: 'AC-012 S2', state: { id: 'S2' }, text: ['No FeatherSpec project found in this workspace.'], actions: ['Open setup guide', 'Refresh'], label: 'No project found' },
        { name: 'AC-013 S3', state: { id: 'S3' }, text: ['Several FeatherSpec projects found. Select one to continue.'], actions: ['Select project'], label: 'Several projects found' },
        {
            name: 'AC-015 S5 discovery',
            state: { id: 'S5', reason: { cause: 'discovery', message: 'disk gone' } },
            text: ['The project could not be loaded: project discovery failed (disk gone).'],
            actions: ['Show output', 'Retry'],
            label: 'Project could not be loaded',
        },
        {
            name: 'AC-015 S5 listing',
            state: { id: 'S5', reason: { cause: 'listing', folder: '.specs/active', reason: 'permission denied' } },
            text: ['The project could not be loaded: the lifecycle folders of .specs/ could not be listed (.specs/active: permission denied).'],
            actions: ['Show output', 'Retry'],
            label: 'Project could not be loaded',
        },
        {
            name: 'AC-015 S5 protocol',
            state: { id: 'S5', reason: { cause: 'protocol' } },
            text: ['The project could not be loaded: the Studio panel and the extension could not exchange data.'],
            actions: ['Show output', 'Retry'],
            label: 'Project could not be loaded',
        },
        {
            name: 'AC-026 S8 with another project',
            state: { id: 'S8', name: 'demo', canSelect: true },
            text: ['FeatherSpec project demo was not found.'],
            actions: ['Select project', 'Refresh'],
            label: 'Project not found',
        },
        {
            name: 'AC-026 S8 without another project',
            state: { id: 'S8', name: 'demo', canSelect: false },
            text: ['FeatherSpec project demo was not found.'],
            actions: ['Refresh'],
            label: 'Project not found',
        },
        {
            name: 'AC-027 S9 with two folders',
            state: {
                id: 'S9',
                folders: [
                    { folder: 'api', markers: ['.specs/ directory'] },
                    { folder: 'web', markers: ['AGENTS.md with a FeatherSpecVersion: line'] },
                ],
            },
            text: [
                'FeatherSpec project incomplete: api has no .specs/ directory.',
                'FeatherSpec project incomplete: web has no AGENTS.md with a FeatherSpecVersion: line.',
            ],
            actions: ['Open setup guide', 'Refresh'],
            label: 'Project incomplete',
        },
    ];

    it.each(cases)('$name: shows its own text and actions in a labelled status region', async ({ state, text, actions: expected, label }) => {
        const container = await show(state);
        const region = container.querySelector('section[role="status"]');
        expect(region?.getAttribute('aria-label')).toBe(label);
        expect([...(region?.querySelectorAll('p') ?? [])].map((paragraph) => paragraph.textContent)).toEqual(text);
        expect(actions(container)).toEqual(expected);
    });

    it('AC-014 S4: shows "Loading project…" with a progress indicator and no action', async () => {
        const container = await show({ id: 'S4' });
        const region = container.querySelector('section[role="status"]');
        expect(region?.getAttribute('aria-label')).toBe('Loading');
        expect(region?.querySelector('[role="progressbar"]')?.textContent).toBe('Loading project…');
        expect(actions(container)).toEqual([]);
    });

    it('AC-016 S6: shows its text and the Reload action, and Reload sends runAction reload', async () => {
        const container = await open();
        await send({ v: 2, kind: 'evt', type: 'shell', seq: 1, payload: {} });
        const region = container.querySelector('section[role="status"]');
        expect(region?.getAttribute('aria-label')).toBe('Reload needed');
        expect(region?.textContent).toContain('FeatherSpec Studio was updated. Reload to continue.');
        await click(container.querySelector('.panel-state button')!);
        expect(runActions()).toEqual(['reload']);
    });

    it('AC-016 S6 wins over every state the host reports', async () => {
        const container = await show({ id: 'S1' });
        await send({ v: 2, kind: 'evt', type: 'shell', seq: 2, payload: {} });
        expect(container.querySelector('section[role="status"]')?.getAttribute('aria-label')).toBe('Reload needed');
    });

    it('AC-018: the navigation stays while a state is shown, and the state takes the place of the area content', async () => {
        const container = await show({ id: 'S2' });
        expect(container.querySelectorAll('nav button')).toHaveLength(4);
        expect(container.querySelectorAll('section[role="status"]')).toHaveLength(1);
    });

    it('every state action is a button that sends its runAction, reachable and activatable by keyboard', async () => {
        const container = await show({ id: 'S5', reason: { cause: 'protocol' } });
        const buttons = [...container.querySelectorAll<HTMLButtonElement>('.panel-state button')];
        buttons.forEach((button) => expect(isKeyboardReachable(button)).toBe(true));
        await pressKey(buttons[0]!, 'Enter');
        await pressKey(buttons[1]!, ' ');
        expect(runActions()).toEqual(['showOutput', 'retry']);
    });
});

describe('AC-017: the Restricted Mode note', () => {
    it('shows beside S2 and does not replace it', async () => {
        const container = await show({ id: 'S2' }, { restricted: true });
        const note = container.querySelector('[role="note"]');
        expect(note?.textContent).toContain('This workspace is in Restricted Mode. Agent actions are unavailable.');
        expect(note?.getAttribute('aria-label')).toBe('Restricted Mode');
        expect(container.querySelector('section[role="status"]')?.textContent).toContain('No FeatherSpec project found');
    });

    it('shows above an area when no state applies', async () => {
        const container = await show(undefined, { restricted: true });
        expect(container.querySelector('[role="note"]')).not.toBeNull();
        expect(container.querySelector('section[role="status"]')).toBeNull();
    });

    it('control: with trust there is no note; when trust is granted the note disappears without a reload', async () => {
        const container = await show({ id: 'S2' }, { restricted: false });
        expect(container.querySelector('[role="note"]')).toBeNull();
        await send(shellEvent(baseView({ state: { id: 'S2' }, restricted: true }), 2));
        expect(container.querySelector('[role="note"]')).not.toBeNull();
        await send(shellEvent(baseView({ state: { id: 'S2' }, restricted: false }), 3));
        expect(container.querySelector('[role="note"]')).toBeNull();
    });

    it('its action "Manage Workspace Trust" sends runAction manageTrust by keyboard', async () => {
        const container = await show(undefined, { restricted: true });
        const button = container.querySelector<HTMLButtonElement>('[role="note"] button')!;
        expect(isKeyboardReachable(button)).toBe(true);
        await pressKey(button, 'Enter');
        expect(runActions()).toEqual(['manageTrust']);
    });
});
