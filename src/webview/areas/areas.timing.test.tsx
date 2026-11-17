import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AreaInfo } from '../../shared/protocol/areas';
import type { Envelope } from '../../shared/protocol/envelope';
import type { ShellView, SpecRow } from '../../shared/protocol/messages';
import { App } from '../App';
import { createClient, type ShellClient } from '../client';
import mainCss from '../main.css?raw';
import { BUDGET_MS, bestOfThree } from '../../shared/testing/timing';
import { baseView, mount, send, shellEvent, type Mounted } from '../testing/dom';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

function row(number: string, overrides: Partial<SpecRow> = {}): SpecRow {
    return {
        stem: `${number}-thing`,
        path: `.specs/active/${number}-thing.md`,
        number,
        title: `Thing ${number}`,
        state: 'Active',
        derivedRule: undefined,
        showPath: false,
        selected: false,
        ...overrides,
    };
}

const THREE = [row('0001'), row('0002', { state: 'Backlog' }), row('0003', { state: 'Review', derivedRule: 'S-REVIEW' })];

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

function optionRows(container: HTMLElement): HTMLElement[] {
    return [...container.querySelectorAll<HTMLElement>('[role="option"]')];
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

const SYNTHETIC: AreaInfo = { id: 'agentCenter', title: 'Synthetic area', purpose: 'A purpose for a placeholder test.', placeholder: true };

describe('AC-007: the Spec Explorer list', () => {
    it('a new shell event with changed rows is in the DOM within 500 ms of the message event (PD-047)', async () => {
        const container = await open(baseView({ area: 'specExplorer', rows: [row('0001')] }));
        let version = 1;
        const best = await bestOfThree(
            () => send(shellEvent(baseView({ area: 'specExplorer', rows: [row('0001'), row('0002', { title: 'Brand new' })] }), (version += 1))),
            () => send(shellEvent(baseView({ area: 'specExplorer', rows: [row('0001')] }), (version += 1))),
        );
        expect(container.textContent).toContain('Brand new');
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
    });
});
