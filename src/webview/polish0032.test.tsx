import { afterEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../shared/protocol/envelope';
import type { OverviewView } from '../shared/protocol/overview';
import type { SendView } from '../shared/protocol/assistant';
import { sampleView } from '../shared/protocol/testing/overviewSample';
import { App } from './App';
import { createClient, type ShellClient } from './client';
import { baseView, mount, overviewEvent, send, shellEvent, type Mounted } from './testing/dom';

const TIP = 'Tip: Use a new chat with a strong model.';
const CLAUDE: SendView = { assistant: 'claudeCode', target: 'new', targets: ['new'] };

let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(welcome: OverviewView['welcome']): Promise<HTMLElement> {
    const client = createClient({ post: (_message: Envelope) => undefined });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'overview' }), 1));
    await send(overviewEvent({ ...sampleView(), figures: { kind: 'empty' }, problems: { rows: [], lines: [] }, ...(welcome === undefined ? {} : { welcome }) }));
    return mounted.container;
}

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('0032 AC-001: the Send arrow in the onboarding is 14 x 14 px', () => {
    it('0032 AC-001 the feather glyph carries its own class; the Send arrow glyph carries none and is 14 x 14', async () => {
        const container = await open({ send: CLAUDE, coach: TIP });
        const feather = container.querySelector<SVGElement>('[data-welcome] svg[data-icon="feather"]')!;
        expect(feather.getAttribute('class')).toBe('icon empty-state-feather');
        const arrow = container.querySelector<SVGElement>('[data-welcome] .send-arrow svg')!;
        expect(arrow.getAttribute('class')).toBe('icon');
        expect([arrow.getAttribute('width'), arrow.getAttribute('height')]).toEqual(['14', '14']);
    });
});

describe('0032 AC-007: the onboarding Tip', () => {
    it('0032 AC-007 the Tip stands under the Send split button', async () => {
        const container = await open({ send: CLAUDE, coach: TIP });
        const action = container.querySelector<HTMLElement>('[data-welcome] .welcome-action')!;
        expect(action.querySelector('.send-split')).not.toBeNull();
        expect(action.querySelector('.step-coach')?.textContent).toBe(TIP);
        expect(action.lastElementChild?.className).toBe('step-coach');
    });

    it('0032 AC-007 without an offer the Tip stands under Copy prompt (A-003); tips off: no Tip', async () => {
        const plain = await open({ coach: TIP });
        expect(plain.querySelector('[data-welcome] .welcome-action .step-coach')?.textContent).toBe(TIP);
        expect(plain.querySelector('[data-welcome] .send-split')).toBeNull();
        mounted?.unmount();
        const off = await open({ send: CLAUDE });
        expect(off.querySelector('[data-welcome] .step-coach')).toBeNull();
    });
});
