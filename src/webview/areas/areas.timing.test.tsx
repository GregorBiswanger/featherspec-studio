import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AreaInfo } from '../../shared/protocol/areas';
import type { Envelope } from '../../shared/protocol/envelope';
import type { ShellView } from '../../shared/protocol/messages';
import { App } from '../App';
import { createClient, type ShellClient } from '../client';
import mainCss from '../main.css?raw';
import { BUDGET_MS, bestOfThree } from '../../shared/testing/timing';
import { baseView, mount, send, shellEvent, type Mounted } from '../testing/dom';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(view: ShellView): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(view, 1));
    return mounted.container;
}

function nav(container: HTMLElement, title: string): HTMLButtonElement {
    return [...container.querySelectorAll<HTMLButtonElement>('nav button')].find((button) => button.textContent?.includes(title))!;
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

const SYNTHETIC: AreaInfo = { id: 'board', title: 'Synthetic area', purpose: 'A purpose for a placeholder test.', placeholder: true };

describe('0005 AC-010 (PD-047): a shell event with a notice reaches the DOM', () => {
    it('a new shell event with a notice is in the DOM within 500 ms of the message event (PD-047)', async () => {
        const container = await open(baseView({ area: 'overview' }));
        let version = 1;
        const best = await bestOfThree(
            () => send(shellEvent(baseView({ area: 'overview', notice: { number: '0003' } }), (version += 1))),
            () => send(shellEvent(baseView({ area: 'overview' }), (version += 1))),
        );
        expect(container.querySelector('[data-notice]')?.textContent).toContain('Spec 0003 is no longer in the project');
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
    });
});
