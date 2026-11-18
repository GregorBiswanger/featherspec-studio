import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../../shared/protocol/envelope';
import type { OverviewView } from '../../../shared/protocol/overview';
import { bigView, sampleView } from '../../../shared/protocol/testing/overviewSample';
import { BUDGET_MS, bestOfThree } from '../../../shared/testing/timing';
import { App } from '../../App';
import { createClient, type ShellClient } from '../../client';
import { baseView, overviewEvent, mount, send, shellEvent, type Mounted } from '../../testing/dom';

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

function section(container: HTMLElement, name: 'now' | 'activity'): HTMLElement {
    return container.querySelector<HTMLElement>(`[data-${name}]`)!;
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('AC-024: the whole content of a 200-spec project', () => {
    it('renders Now and activity within 1000 ms of the message event', async () => {
        const container = await open(sampleView());
        const big = bigView(200, 5);
        const best = await bestOfThree(
            () => send(overviewEvent(big)),
            () => send(overviewEvent(sampleView())),
        );
        expect(section(container, 'now').querySelectorAll('[data-spec-row]')).toHaveLength(200);
        expect(section(container, 'activity').querySelectorAll('[data-activity-entry]')).toHaveLength(10);
        expect(best).toBeLessThan(BUDGET_MS.frame);
    });
});
