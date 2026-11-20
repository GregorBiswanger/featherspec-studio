import { afterEach, describe, expect, it } from 'vitest';
import type { NextStepView, SpecDetailView } from '../../../shared/protocol/detail';
import { BUDGET_MS, bestOfThree } from '../../../shared/testing/timing';
import { planSample } from '../../../shared/protocol/testing/planSample';
import { App } from '../../App';
import { boardEvent, boardView, card } from '../../board/testing/views';
import { createClient, type ShellClient } from '../../client';
import { detailEvent, detailView } from '../../detail/testing/views';
import { baseView, mount, send, shellEvent, type Mounted } from '../../testing/dom';
import { forgetTarget } from './target';

let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
    forgetTarget();
});

const OPEN: NextStepView = { rule: 'NS-6', lines: [{ text: 'Implement T-003 of .specs/active/0007-thing.plan.md', intent: 'Continue with T-003 Step' }] };
const LAST: NextStepView = { rule: 'NS-5', lines: [{ text: '/sdd-compile .specs/active/0007-thing.md', intent: 'Have the result verified' }] };

function planned(nextStep: NextStepView, done: number): SpecDetailView {
    const view = detailView({}, nextStep) as SpecDetailView;
    return { ...view, plan: planSample({ count: { done, total: 5 } }) };
}

async function open(): Promise<HTMLElement> {
    const client = createClient({ post: () => undefined });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'planMap', selection: { stem: '0007-thing', number: '0007' } }), 1));
    await send(boardEvent(boardView([card('0007')], { planSpecs: [{ stem: '0007-thing', number: '0007', title: 'Thing 0007', problems: [] }] })));
    return mounted.container;
}

function header(container: HTMLElement): string {
    const clone = container.querySelector('.plan-map-header')!.cloneNode(true) as Element;
    clone.querySelectorAll('.visually-hidden').forEach((hidden) => hidden.remove());
    return (clone.textContent ?? '').replace(/\s+/g, ' ');
}

describe('0025 AC-011: the header follows the model within the freshness budget', () => {
    it('0025 AC-011: the next step and the percentage show the new state within BUDGET_MS.uiFreshness of the message', async () => {
        const container = await open();
        await send(detailEvent(planned(OPEN, 2)));
        expect(header(container)).toContain('Continue with T-003 Step');
        expect(header(container)).toContain('2 of 5 done · 40%');
        const best = await bestOfThree(
            () => send(detailEvent(planned(LAST, 5))),
            () => send(detailEvent(planned(OPEN, 2))),
        );
        expect(header(container)).toContain('Have the result verified');
        expect(header(container)).toContain('/sdd-compile');
        expect(header(container)).toContain('5 of 5 done · 100%');
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
    });

    it('0025 AC-011: negative control - without the update the header keeps the old state', async () => {
        const container = await open();
        await send(detailEvent(planned(OPEN, 2)));
        expect(header(container)).not.toContain('Have the result verified');
        expect(header(container)).not.toContain('100%');
    });
});
