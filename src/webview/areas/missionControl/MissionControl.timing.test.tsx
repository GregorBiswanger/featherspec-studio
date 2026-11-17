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

async function open(view?: MissionControlView, client?: ShellClient): Promise<HTMLElement> {
    const made = client ?? createClient({ post: (message) => void posted.push(message) });
    clients.push(made);
    made.start();
    mounted = await mount(<App client={made} />);
    await send(shellEvent(baseView({ area: 'missionControl' }), 1));
    if (view !== undefined) {
        await send(missionControlEvent(view));
    }
    return mounted.container;
}

function area(container: HTMLElement): HTMLElement {
    return container.querySelector<HTMLElement>('[data-mission-control]')!;
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('AC-016, AC-024: timing', () => {
    it('AC-016: a new event is in the DOM within 500 ms of the message event', async () => {
        const container = await open(sampleView());
        const next = sampleView();
        next.header.name = 'renamed';
        const best = await bestOfThree(
            () => send(missionControlEvent(next)),
            () => send(missionControlEvent(sampleView())),
        );
        expect(area(container).textContent).toContain('renamed');
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
    });

    it('AC-024: the view of a 200-spec project renders within 1000 ms of the message event', async () => {
        const container = await open();
        const big = bigView(200, 5);
        const best = await bestOfThree(
            () => send(missionControlEvent(big)),
            () => send(missionControlEvent(sampleView())),
        );
        expect(area(container).textContent).toContain('Total 200');
        expect(best).toBeLessThan(BUDGET_MS.frame);
    });
});
