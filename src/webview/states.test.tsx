import { afterEach, describe, expect, it } from 'vitest';
import type { PanelState } from '../shared/protocol/messages';
import { sampleView } from '../shared/protocol/testing/overviewSample';
import { App } from './App';
import { Placeholder } from './areas/Placeholder';
import { boardEvent, boardView } from './board/testing/views';
import { createClient, type ShellClient } from './client';
import { baseView, overviewEvent, mount, send, shellEvent, type Mounted } from './testing/dom';

let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(view = baseView()): Promise<HTMLElement> {
    const client = createClient({ post: () => undefined });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(view, 1));
    return mounted.container;
}

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

function hasIcon(element: Element | null): boolean {
    const icon = element?.querySelector('svg');
    return icon !== null && icon !== undefined && icon.getAttribute('aria-hidden') === 'true';
}

describe('0013 §3.6: empty, placeholder and panel-level states show an icon beside their unchanged text', () => {
    it.each([{ id: 'S1' }, { id: 'S2' }, { id: 'S5', reason: { cause: 'protocol' } }, { id: 'S6' }] as PanelState[])('panel state %j', async (state) => {
        const container = await open(baseView({ state }));
        const region = container.querySelector('.panel-state');
        expect(hasIcon(region)).toBe(true);
        expect(region?.querySelector('p')?.textContent?.length).toBeGreaterThan(0);
    });

    it('the placeholder component (through a synthetic area; no real area is a placeholder any more)', async () => {
        mounted = await mount(<Placeholder area={{ id: 'board', title: 'Synthetic', purpose: 'A purpose.', placeholder: true }} />);
        expect(hasIcon(mounted.container.querySelector('[data-placeholder]'))).toBe(true);
    });

    it('the empty board and the empty Overview', async () => {
        const board = await open(baseView({ area: 'board' }));
        await send(boardEvent(boardView([])));
        expect(board.querySelector('.board-empty')?.textContent).toBe('No specs yet. Start with /sdd-specifyCopy');
        expect(hasIcon(board.querySelector('.board-empty'))).toBe(true);
        mounted?.unmount();
        const mission = await open(baseView({ area: 'overview' }));
        const view = sampleView();
        view.figures = { kind: 'empty' };
        await send(overviewEvent(view));
        expect(hasIcon(mission.querySelector('[data-zero-specs]'))).toBe(true);
    });
});
