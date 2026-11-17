import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { TimelinePayload, TimelineRow } from '../../../shared/protocol/agentCenter';
import type { Envelope } from '../../../shared/protocol/envelope';
import { sampleCenterView, sampleDetail, sampleRow } from '../../../shared/protocol/testing/agentCenterSample';
import { App } from '../../App';
import { createClient, type ShellClient } from '../../client';
import { agentCenterEvent, agentCenterTimelineEvent, baseView, click, mount, send, shellEvent, type Mounted } from '../../testing/dom';
import { act } from 'react';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

function row(key: number, kind = 'Message', text = `row ${key}`): TimelineRow {
    return { key, kind, time: '10:00:0' + (key % 10), source: 'provider', fields: [{ label: 'Text', text }] };
}

function payload(keys: number[], hasEarlier = false, runId = 'run-1'): TimelinePayload {
    return { runId, rows: keys.map((key) => row(key)), hasEarlier };
}

async function open(initial?: TimelinePayload): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'agentCenter' }), 1));
    await send(agentCenterEvent(sampleCenterView({ rows: [sampleRow()], detail: sampleDetail() })));
    if (initial !== undefined) {
        await send(agentCenterTimelineEvent(initial));
    }
    return mounted.container;
}

function requests(type: string): Envelope[] {
    return posted.filter((message) => message.kind === 'req' && message.type === type);
}

function scroller(container: HTMLElement): HTMLElement {
    const found = container.querySelector<HTMLElement>('[data-timeline-scroll]');
    if (found === null) {
        throw new Error('no timeline scroller');
    }
    return found;
}

function metrics(element: HTMLElement, scrollHeight: number, clientHeight: number, scrollTop: number): void {
    Object.defineProperty(element, 'scrollHeight', { configurable: true, value: scrollHeight });
    Object.defineProperty(element, 'clientHeight', { configurable: true, value: clientHeight });
    element.scrollTop = scrollTop;
}

async function scrollTo(element: HTMLElement, scrollTop: number): Promise<void> {
    element.scrollTop = scrollTop;
    await act(async () => {
        element.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
}

function button(container: HTMLElement, label: string): HTMLButtonElement | undefined {
    return [...container.querySelectorAll<HTMLButtonElement>('button')].find((candidate) => candidate.textContent?.trim() === label);
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('0012 Timeline', () => {
    it('renders the rows as plain text in order, with time, kind and source', async () => {
        const container = await open({ runId: 'run-1', rows: [row(1, 'Message', '<b>bold</b>'), row(2, 'Tool started')], hasEarlier: false });
        const items = [...container.querySelectorAll('[data-timeline-row]')];
        expect(items).toHaveLength(2);
        expect(items[0]?.textContent).toContain('<b>bold</b>');
        expect(items[0]?.querySelector('b')).toBeNull();
        expect(items[1]?.textContent).toContain('Tool started');
        expect(items[0]?.textContent).toContain('provider');
    });

    it('shows nothing for a timeline of another run', async () => {
        const container = await open(payload([1, 2], false, 'run-9'));
        expect(container.querySelectorAll('[data-timeline-row]')).toHaveLength(0);
    });

    it('Load earlier shows only while hasEarlier and sends one request per click', async () => {
        const container = await open(payload([5, 6], true));
        const load = button(container, 'Load earlier');
        expect(load).toBeDefined();
        await click(load!);
        expect(requests('acLoadEarlier').map((message) => message.payload)).toEqual([{ runId: 'run-1' }]);
        await send(agentCenterTimelineEvent(payload([1, 2, 3, 5, 6], false)));
        expect(button(container, 'Load earlier')).toBeUndefined();
    });

    it('applies new rows synchronously from the timeline event', async () => {
        const container = await open(payload([1]));
        await send(agentCenterTimelineEvent(payload([1, 2, 3])));
        expect(container.querySelectorAll('[data-timeline-row]')).toHaveLength(3);
    });

    it('follows when the run opens: no Jump to latest, new rows scroll to the end', async () => {
        const container = await open(payload([1]));
        const element = scroller(container);
        expect(button(container, 'Jump to latest')).toBeUndefined();
        metrics(element, 900, 300, 0);
        await send(agentCenterTimelineEvent(payload([1, 2])));
        expect(element.scrollTop).toBe(900);
        expect(requests('acFollow')).toHaveLength(0);
    });

    it('scrolling away turns follow off once, shows Jump to latest and stops scrolling', async () => {
        const container = await open(payload([1, 2]));
        const element = scroller(container);
        metrics(element, 900, 300, 600);
        await scrollTo(element, 100);
        await scrollTo(element, 80);
        expect(requests('acFollow').map((message) => message.payload)).toEqual([{ runId: 'run-1', on: false }]);
        expect(button(container, 'Jump to latest')).toBeDefined();
        metrics(element, 1200, 300, 80);
        await send(agentCenterTimelineEvent(payload([1, 2, 3])));
        expect(element.scrollTop).toBe(80);
    });

    it('Jump to latest scrolls to the end and follows again', async () => {
        const container = await open(payload([1, 2]));
        const element = scroller(container);
        metrics(element, 900, 300, 600);
        await scrollTo(element, 100);
        await click(button(container, 'Jump to latest')!);
        expect(element.scrollTop).toBe(900);
        expect(requests('acFollow').map((message) => message.payload)).toEqual([
            { runId: 'run-1', on: false },
            { runId: 'run-1', on: true },
        ]);
        expect(button(container, 'Jump to latest')).toBeUndefined();
    });

    it('scrolling back to the end turns follow on again', async () => {
        const container = await open(payload([1, 2]));
        const element = scroller(container);
        metrics(element, 900, 300, 600);
        await scrollTo(element, 100);
        await scrollTo(element, 600);
        expect(requests('acFollow').map((message) => message.payload)).toEqual([
            { runId: 'run-1', on: false },
            { runId: 'run-1', on: true },
        ]);
        expect(button(container, 'Jump to latest')).toBeUndefined();
    });

    it('opening another run starts with follow on again', async () => {
        const container = await open(payload([1, 2]));
        const element = scroller(container);
        metrics(element, 900, 300, 600);
        await scrollTo(element, 100);
        expect(button(container, 'Jump to latest')).toBeDefined();
        await send(agentCenterEvent(sampleCenterView({ rows: [sampleRow({ runId: 'run-2' })], detail: sampleDetail({ header: { ...sampleDetail().header, runId: 'run-2' } }) })));
        await send(agentCenterTimelineEvent(payload([1], false, 'run-2')));
        expect(button(container, 'Jump to latest')).toBeUndefined();
    });
});
