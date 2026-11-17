import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../shared/protocol/envelope';
import { App } from '../App';
import { createClient, type ShellClient } from '../client';
import { baseView, mount, send, shellEvent, type Mounted } from '../testing/dom';
import { BUDGET_MS, bestOfThree } from '../../shared/testing/timing';
import { resetSectionMemory } from './sectionMemory';
import { detailEvent, detailView, PLAN_KEY, sections, SPEC_KEY } from './testing/views';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(view = detailView()): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'specExplorer' }), 1));
    await send(detailEvent(view));
    return mounted.container;
}

function section(container: HTMLElement, title: string): HTMLElement {
    const heading = [...container.querySelectorAll('h3')].find((candidate) => candidate.textContent === title)!;
    return heading.closest('section')!;
}

function openButtons(root: Element): HTMLButtonElement[] {
    return [...root.querySelectorAll<HTMLButtonElement>('button')].filter((button) => button.textContent === 'Open file');
}

function requests(type: string): unknown[] {
    return posted.filter((message) => message.type === type).map((message) => message.payload);
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    resetSectionMemory();
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('AC-019: the detail is in the DOM within 500 ms of the event (PD-047; a large spec)', () => {
    it('renders the update fast enough: 120 requirements, 200 criteria, 150 steps, 100 runs', async () => {
        const base = sections();
        const container = await open();
        const large = detailView(
            sections({
                requirements: { open: base.requirements.open, items: Array.from({ length: 120 }, (_, index) => ({ id: `FR-${index + 1}`, text: `Requirement ${index + 1}`, open: { key: SPEC_KEY, line: index + 1 } })) },
                criteria: {
                    open: base.criteria.open,
                    items: Array.from({ length: 200 }, (_, index) => ({ id: `AC-${index + 1}`, text: `Criterion ${index + 1}`, illustration: 'Given x, when y, then z', uncertain: index % 7 === 0, struck: index % 11 === 0, open: { key: SPEC_KEY, line: index + 1 } })),
                },
                plan: {
                    open: { key: PLAN_KEY },
                    stages: ['1. T-001'],
                    steps: Array.from({ length: 150 }, (_, index) => ({ id: `T-${index + 1}`, title: `Step ${index + 1}`, ticked: index % 2 === 0, struck: false, verified: index % 2 === 0 ? 'green' : undefined })),
                },
                history: {
                    runs: Array.from({ length: 100 }, (_, index) => ({ runId: `r${index}`, provider: 'claude', status: 'Completed', created: '2026-11-16T10:00:00Z', started: undefined, ended: undefined, historyIncomplete: false, historyUnreadable: false })),
                    statusHistory: [],
                    label: base.history.label,
                },
            }),
        );
        const best = await bestOfThree(
            () => send(detailEvent(large)),
            () => send(detailEvent(detailView())),
        );
        expect(container.querySelectorAll('.detail-runs li')).toHaveLength(100);
        expect(container.querySelectorAll('.detail-steps li')).toHaveLength(150);
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
    });
});

describe('0015 AC-007: a new next step is in the DOM within 500 ms of the event (PD-047)', () => {
    it('shows the line of the new detail view', async () => {
        const container = await open();
        const next = detailView({}, { rule: 'NS-5', lines: [{ text: '/sdd-compile k' }, { text: '/sdd-lifecycle k', label: 'Then, after a READY verdict:' }] });
        const best = await bestOfThree(
            () => send(detailEvent(next)),
            () => send(detailEvent(detailView())),
        );
        await send(detailEvent(next));
        expect(section(container, 'Next step').textContent).toContain('/sdd-compile k');
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
    });
});
