import { afterEach, describe, expect, it } from 'vitest';
import type { PanelState } from '../shared/protocol/messages';
import { App } from './App';
import { createClient, type ShellClient } from './client';
import { baseView, mount, send, shellEvent, type Mounted } from './testing/dom';

let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function show(state: PanelState | undefined, restricted: boolean, host: string | undefined): Promise<HTMLElement> {
    if (host === undefined) {
        delete document.body.dataset.host;
    } else {
        document.body.dataset.host = host;
    }
    const client = createClient({ post: () => undefined });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ state, restricted }), 1));
    return mounted.container;
}

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
    delete document.body.dataset.host;
});

describe('AC-019 and AC-030: the S7 note and the panel states read the host vocabulary', () => {
    it('shows the JetBrains S7 note, label and trust action with data-host jetbrains', async () => {
        const container = await show(undefined, true, 'jetbrains');
        const note = container.querySelector('.restricted-note');
        expect(note?.getAttribute('aria-label')).toBe('Safe Mode');
        expect(note?.textContent).toContain('This project is not trusted. Setting up FeatherSpec needs a trusted project.');
        expect(note?.querySelector('button')?.textContent).toBe('Trust Project');
    });

    it('shows the VS Code S7 note unchanged without the host attribute', async () => {
        const container = await show(undefined, true, undefined);
        const note = container.querySelector('.restricted-note');
        expect(note?.getAttribute('aria-label')).toBe('Restricted Mode');
        expect(note?.textContent).toContain('This workspace is in Restricted Mode. Setting up FeatherSpec needs a trusted workspace.');
        expect(note?.querySelector('button')?.textContent).toBe('Manage Workspace Trust');
    });

    it('shows the JetBrains S2 line with the project wording', async () => {
        const container = await show({ id: 'S2' }, false, 'jetbrains');
        expect(container.querySelector('.panel-state')?.textContent).toContain('No FeatherSpec project found in this project.');
    });

    it('shows the JetBrains S5 protocol line with the plugin, and the VS Code one with the extension', async () => {
        const jetbrains = await show({ id: 'S5', reason: { cause: 'protocol' } }, false, 'jetbrains');
        expect(jetbrains.querySelector('.panel-state')?.textContent).toContain('the Studio panel and the plugin could not exchange data.');
        mounted?.unmount();
        mounted = undefined;
        const vscode = await show({ id: 'S5', reason: { cause: 'protocol' } }, false, undefined);
        expect(vscode.querySelector('.panel-state')?.textContent).toContain('the Studio panel and the extension could not exchange data.');
    });
});
