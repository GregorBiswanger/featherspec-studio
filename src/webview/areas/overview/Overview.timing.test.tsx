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

async function open(view?: OverviewView, client?: ShellClient): Promise<HTMLElement> {
    const made = client ?? createClient({ post: (message) => void posted.push(message) });
    clients.push(made);
    made.start();
    mounted = await mount(<App client={made} />);
    await send(shellEvent(baseView({ area: 'overview' }), 1));
    if (view !== undefined) {
        await send(overviewEvent(view));
    }
    return mounted.container;
}

function area(container: HTMLElement): HTMLElement {
    return container.querySelector<HTMLElement>('[data-overview]')!;
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
        next.problems = { rows: [], lines: Array.from({ length: 5 }, (_, index) => ({ where: 'project', reason: `reason ${index}`, sentence: `reason ${index}` })) };
        const best = await bestOfThree(
            () => send(overviewEvent(next)),
            () => send(overviewEvent(sampleView())),
        );
        expect(area(container).textContent).toContain('Problems (5)');
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
    });

    it('AC-024: the view of a 200-spec project renders within 1000 ms of the message event', async () => {
        const container = await open();
        const big = bigView(200, 5);
        const best = await bestOfThree(
            () => send(overviewEvent(big)),
            () => send(overviewEvent(sampleView())),
        );
        expect(area(container).textContent).toContain('Total 200');
        expect(best).toBeLessThan(BUDGET_MS.frame);
    });
});
