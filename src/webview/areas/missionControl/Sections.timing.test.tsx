import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../../shared/protocol/envelope';
import type { MissionControlView } from '../../../shared/protocol/missionControl';
import { bigView, sampleView } from '../../../shared/protocol/testing/missionControlSample';
import { BUDGET_MS, bestOfThree } from '../../../shared/testing/timing';
import { App } from '../../App';
import { createClient, type ShellClient } from '../../client';
import { baseView, missionControlEvent, mount, send, shellEvent, type Mounted } from '../../testing/dom';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(view: MissionControlView): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'overview' }), 1));
    await send(missionControlEvent(view));
    return mounted.container;
}

function section(container: HTMLElement, name: 'attention' | 'activity'): HTMLElement {
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
    it('renders attention and activity within 1000 ms of the message event', async () => {
        const container = await open(sampleView());
        const big = bigView(200, 5);
        const best = await bestOfThree(
            () => send(missionControlEvent(big)),
            () => send(missionControlEvent(sampleView())),
        );
        expect(section(container, 'attention').querySelectorAll('[data-attention-row]')).toHaveLength(200);
        expect(section(container, 'activity').querySelectorAll('[data-activity-entry]')).toHaveLength(10);
        expect(best).toBeLessThan(BUDGET_MS.frame);
    });
});
