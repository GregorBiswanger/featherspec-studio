import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../shared/protocol/envelope';
import { App } from '../App';
import { createClient, type ShellClient } from '../client';
import { baseView, mount, send, shellEvent, type Mounted } from '../testing/dom';
import { BUDGET_MS, bestOfThree } from '../../shared/testing/timing';
import { boardEvent, boardView, card } from './testing/views';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(view = boardView([card('0001')]), area: 'board' | 'overview' = 'board'): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area }), 1));
    await send(boardEvent(view));
    return mounted.container;
}

function requests(type: string): unknown[] {
    return posted.filter((message) => message.type === type).map((message) => message.payload);
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('AC-019: the board is in the DOM within 500 ms of the event (PD-047; 200 cards, 180 in one column)', () => {
    it('renders the update fast enough', async () => {
        const container = await open(boardView([card('0001')]));
        const many = [...Array.from({ length: 180 }, (_, index) => card(String(index + 1).padStart(4, '0'), { state: 'Done' })), ...Array.from({ length: 20 }, (_, index) => card(String(index + 201).padStart(4, '0')))];
        const best = await bestOfThree(
            () => send(boardEvent(boardView(many))),
            () => send(boardEvent(boardView([card('0001')]))),
        );
        expect(container.querySelectorAll('[data-card]')).toHaveLength(200);
        expect(best).toBeLessThan(BUDGET_MS.uiFreshness);
    });
});
