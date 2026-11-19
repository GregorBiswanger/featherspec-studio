import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SpecDetailView } from '../shared/protocol/detail';
import { NARROW_QUERY } from '../shared/protocol/layout';
import type { SelectedSpec } from '../shared/protocol/messages';
import { planSample } from '../shared/protocol/testing/planSample';
import { App } from './App';
import { boardEvent, boardView, card } from './board/testing/views';
import { createClient, type ShellClient } from './client';
import { resetSectionMemory } from './detail/sectionMemory';
import { detailEvent, detailView } from './detail/testing/views';
import { baseView, mount, send, shellEvent, type Mounted } from './testing/dom';

const SELECTED: SelectedSpec = { stem: '0007-thing', number: '0007' };

let mounted: Mounted | undefined;
let seq: number;
let narrow: boolean;
let listeners: (() => void)[];
const clients: ShellClient[] = [];

const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
const savedRect = proto.getBoundingClientRect;
const originalMatchMedia = window.matchMedia;

beforeEach(() => {
    seq = 0;
    narrow = false;
    listeners = [];
    proto.getBoundingClientRect = function (this: HTMLElement) {
        const width = this.classList.contains('area-frame') ? 1428 : 0;
        return { left: 0, top: 0, right: width, bottom: width === 0 ? 0 : 800, width, height: width === 0 ? 0 : 800, x: 0, y: 0, toJSON: () => ({}) };
    };
    window.matchMedia = ((query: string) => ({
        get matches() {
            return query === NARROW_QUERY && narrow;
        },
        media: query,
        addEventListener: (_type: string, listener: () => void) => void listeners.push(listener),
        removeEventListener: (_type: string, listener: () => void) => void (listeners = listeners.filter((entry) => entry !== listener)),
    })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
    proto.getBoundingClientRect = savedRect;
    window.matchMedia = originalMatchMedia;
    resetSectionMemory();
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

async function setNarrow(value: boolean): Promise<void> {
    narrow = value;
    await act(async () => listeners.forEach((listener) => listener()));
}

async function open(area: 'board' | 'planMap'): Promise<HTMLElement> {
    const client = createClient({ post: () => undefined });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    seq += 1;
    await send(shellEvent(baseView({ area, selection: SELECTED }), seq));
    await send(boardEvent(boardView([card('0007')], { planSpecs: [{ stem: '0007-thing', number: '0007', title: 'Thing 0007', problems: [] }] })));
    const view = detailView() as SpecDetailView;
    await send(detailEvent(area === 'planMap' ? { ...view, plan: planSample() } : view));
    return mounted.container;
}

function divider(container: HTMLElement): HTMLElement {
    return container.querySelector<HTMLElement>('[role="separator"]')!;
}

describe('0022 AC-029: crossing 900 px while the divider holds the focus (PR #1 comment 3)', () => {
    it('Board: the divider is removed with the side panel set aside as the detail alone, and focus lands on the detail heading, not on the body', async () => {
        const container = await open('board');
        const handle = divider(container);
        await act(async () => handle.focus());
        expect(document.activeElement).toBe(handle);
        await setNarrow(true);
        expect(container.querySelector('[role="separator"]')).toBeNull();
        expect(document.activeElement).toBe(container.querySelector('aside.side-panel [data-detail-heading]'));
    });

    it('Plan map: the divider is removed with the side panel and focus lands on the map heading', async () => {
        const container = await open('planMap');
        const handle = divider(container);
        await act(async () => handle.focus());
        expect(document.activeElement).toBe(handle);
        await setNarrow(true);
        expect(container.querySelector('[role="separator"]')).toBeNull();
        expect(container.querySelector('aside.side-panel')).toBeNull();
        expect(document.activeElement).toBe(container.querySelector('[data-map-heading]'));
    });

    it('control: with the focus on another control of the side panel the divider leaving takes no focus from it', async () => {
        const container = await open('board');
        const heading = container.querySelector<HTMLElement>('aside.side-panel [data-detail-heading]')!;
        await act(async () => heading.focus());
        await setNarrow(true);
        expect(document.activeElement).toBe(heading);
    });

    it('control: with nothing focused the crossing moves no focus', async () => {
        const container = await open('board');
        expect(document.activeElement).toBe(document.body);
        await setNarrow(true);
        expect(container.querySelector('[role="separator"]')).toBeNull();
        expect(document.activeElement).toBe(document.body);
    });

    it('control: while the width stays at 900 px or more the divider keeps its focus', async () => {
        const container = await open('board');
        const handle = divider(container);
        await act(async () => handle.focus());
        await act(async () => window.dispatchEvent(new Event('resize')));
        expect(document.activeElement).toBe(handle);
    });
});
