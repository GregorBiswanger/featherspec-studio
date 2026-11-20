import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { NextStepView } from '../shared/protocol/detail';
import type { SelectedSpec } from '../shared/protocol/messages';
import type { SendView } from '../shared/protocol/assistant';
import { App } from './App';
import { boardEvent, boardView } from './board/testing/views';
import { createClient, type ShellClient } from './client';
import { detailEvent, detailView } from './detail/testing/views';
import { baseView, click, mount, send, shellEvent, type Mounted } from './testing/dom';

let mounted: Mounted | undefined;
const clients: ShellClient[] = [];
let seq: number;

beforeEach(() => {
    seq = 0;
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

const SPEC = '.specs/backlog/0002-x.md';
const PLAN = '.specs/backlog/0002-x.plan.md';
const LINE = `/sdd-lifecycle ${SPEC} In Progress`;
const FIRST: SelectedSpec = { stem: '0002-x', number: '0002' };
const BOTH: SendView = { assistant: 'copilot', target: 'new', targets: ['new', 'current'], attach: { name: '0002-x.md', path: SPEC }, attachAlso: [{ name: '0002-x.plan.md', path: PLAN }] };
const NEXT = { rule: 'NS-7', lines: [{ text: LINE, intent: 'Start: move the spec and its plan to active' }], send: BOTH } as NextStepView;

async function show(): Promise<{ container: HTMLElement; posted: Array<{ type?: string; payload?: unknown }> }> {
    const posted: Array<{ type?: string; payload?: unknown }> = [];
    const client = createClient({ post: (message) => void posted.push(message as { type?: string; payload?: unknown }) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    seq += 1;
    await send(shellEvent(baseView({ area: 'board', selection: FIRST }), seq));
    await send(boardEvent(boardView([])));
    await send(detailEvent(detailView(FIRST, NEXT)));
    return { container: mounted.container, posted };
}

describe('0033 AC-006: a displayed prompt breaks only after a slash', () => {
    it('0033 AC-006 the display holds a <wbr> after each slash of the path and nowhere in a file name', async () => {
        const { container } = await show();
        const code = container.querySelector('.next-step-lines li > code')!;
        expect(code.innerHTML.replace(/<wbr>/g, '|').replace(/<\/?span[^>]*>/g, '')).toBe('/sdd-lifecycle .specs/|backlog/|0002-x.md In Progress');
    });

    it('0033 AC-006 a hyphenated file name is one unbreakable unit, a break opportunity exists only after a slash', async () => {
        const name = '0001-restaurant-rechnung-aufteilen.plan.md';
        const line = `Implement T-001 of .specs/active/${name}`;
        const view = { rule: 'NS-6-open', lines: [{ text: line, intent: 'Continue' }] } as NextStepView;
        const posted: unknown[] = [];
        const client = createClient({ post: (message) => void posted.push(message) });
        clients.push(client);
        client.start();
        mounted = await mount(<App client={client} />);
        seq += 1;
        await send(shellEvent(baseView({ area: 'board', selection: FIRST }), seq));
        await send(boardEvent(boardView([])));
        await send(detailEvent(detailView(FIRST, view)));
        const code = mounted.container.querySelector('.next-step-lines li > code')!;
        const units = [...code.querySelectorAll('.path-seg')].map((unit) => unit.textContent);
        expect(units).toEqual(['.specs/', 'active/', name]);
        expect([...code.childNodes].filter((node) => node.nodeName === 'WBR')).toHaveLength(2);
        expect(code.querySelectorAll('.path-seg wbr')).toHaveLength(0);
        expect(code.textContent).toBe(line);
    });

    it('0033 AC-006 copy puts the bare line on the clipboard', async () => {
        const { container, posted } = await show();
        posted.length = 0;
        await click(container.querySelector<HTMLButtonElement>('button.send-arrow')!);
        await click(container.querySelector<HTMLButtonElement>('[role="menuitem"]')!);
        expect(posted).toHaveLength(1);
        expect(posted[0]).toMatchObject({ type: 'copyText', payload: { text: LINE } });
    });

    it('0033 AC-006 the text content, the clipboard line and the sent line are unchanged', async () => {
        const { container, posted } = await show();
        expect(container.querySelector('.next-step-lines li > code')!.textContent).toBe(LINE);
        await click(container.querySelector<HTMLButtonElement>('button.send-main')!);
        const request = posted.find((message) => message.type === 'sendPrompt');
        expect(request?.payload).toMatchObject({ line: LINE, attach: SPEC, attachAlso: [PLAN] });
    });

    it('0033 AC-003 AC-004 the Send item names every attached file', async () => {
        const { container } = await show();
        expect(container.querySelector('button.send-main')!.getAttribute('title')).toBe(`Send to Copilot (new chat): ${LINE}. Attaches 0002-x.md and 0002-x.plan.md.`);
    });
});
