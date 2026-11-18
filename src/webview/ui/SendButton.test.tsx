import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SendPromptPayload, SendResultEventPayload, SendView } from '../../shared/protocol/assistant';
import { COPIED_LABEL, COPIED_TEXT, COPY_FAILED_LABEL, COPY_FAILED_TEXT } from '../../shared/protocol/nextStepTexts';
import { click, mount, type Mounted } from '../testing/dom';
import type { CopyResult } from './CopyButton';
import { SendButton } from './SendButton';

const LINE = 'Implement T-003 of .specs/active/0001-tip-splitter.plan.md';
const COPILOT_VIEW: SendView = { assistant: 'copilot', target: 'current', targets: ['new', 'current'] };
const COPILOT_NEW: SendView = { assistant: 'copilot', target: 'new', targets: ['new', 'current'] };
const CLAUDE_VIEW: SendView = { assistant: 'claudeCode', target: 'new', targets: ['new'] };
const OPENED_COPILOT = "The prompt is in Copilot's chat. Check it, then send it there.";
const OPENED_CLAUDE = "The prompt is in Claude Code's chat. Check it, then send it there.";

let mounted: Mounted | undefined;
let sent: SendPromptPayload[];
let copied: string[];
let deliverSend: (result: SendResultEventPayload | undefined) => Promise<void>;
let deliverCopy: (result: CopyResult | undefined) => Promise<void>;

function Harness(props: { send: SendView; sendResult?: SendResultEventPayload; copyResult?: CopyResult }) {
    const [sendResult, setSendResult] = useState<SendResultEventPayload | undefined>(props.sendResult);
    const [copyResult, setCopyResult] = useState<CopyResult | undefined>(props.copyResult);
    deliverSend = async (next) => {
        await act(async () => {
            setSendResult(next);
        });
    };
    deliverCopy = async (next) => {
        await act(async () => {
            setCopyResult(next);
        });
    };
    return <SendButton send={props.send} line={LINE} sendResult={sendResult} onSend={(request) => void sent.push(request)} copyResult={copyResult} onCopy={(line) => void copied.push(line)} />;
}

async function show(send: SendView, extra: { sendResult?: SendResultEventPayload; copyResult?: CopyResult } = {}): Promise<HTMLElement> {
    mounted = await mount(<Harness send={send} {...extra} />);
    return mounted.container;
}

const main = (container: HTMLElement) => container.querySelector<HTMLButtonElement>('button.send-main')!;
const arrow = (container: HTMLElement) => container.querySelector<HTMLButtonElement>('button.send-arrow')!;
const menu = (container: HTMLElement) => container.querySelector<HTMLElement>('[role="menu"]');
const items = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('[role="menuitem"]')];
const live = (container: HTMLElement) => container.querySelector<HTMLElement>('[role="status"]')!;

async function advance(ms: number): Promise<void> {
    await act(async () => {
        vi.advanceTimersByTime(ms);
    });
}

beforeEach(() => {
    vi.useFakeTimers();
    sent = [];
    copied = [];
});

afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
    vi.useRealTimers();
});

describe('0024 AC-003: the split button, its texts, names, tooltips and menu', () => {
    it('Copilot, current chat: main part, arrow part and the live region, in this order, nothing else, no menu', async () => {
        const container = await show(COPILOT_VIEW);
        const wrapper = container.querySelector('.send-split')!;
        expect([...wrapper.children].map((child) => `${child.tagName.toLowerCase()}.${child.className}`)).toEqual(['button.copy-button send-main', 'button.send-arrow', 'span.visually-hidden']);
        expect(wrapper.classList.contains('next-step-copy')).toBe(true);
        expect(main(container).textContent).toBe('Send to Copilot');
        expect(main(container).getAttribute('aria-label')).toBe(`Send to Copilot (current chat): ${LINE}`);
        expect(main(container).getAttribute('title')).toBe(`Send to Copilot (current chat): ${LINE}`);
        expect(menu(container)).toBeNull();
    });

    it('Copilot, new chat names the new chat; Claude Code names its new chat and its own name', async () => {
        const fresh = await show(COPILOT_NEW);
        expect(main(fresh).getAttribute('aria-label')).toBe(`Send to Copilot (new chat): ${LINE}`);
        mounted?.unmount();
        const claude = await show(CLAUDE_VIEW);
        expect(main(claude).textContent).toBe('Send to Claude Code');
        expect(main(claude).getAttribute('title')).toBe(`Send to Claude Code (new chat): ${LINE}`);
    });

    it('the arrow part has a hidden glyph, its name with the line, the tooltip More actions, aria-haspopup menu and aria-expanded false', async () => {
        const container = await show(COPILOT_VIEW);
        expect(arrow(container).getAttribute('aria-label')).toBe(`More actions: ${LINE}`);
        expect(arrow(container).getAttribute('title')).toBe('More actions');
        expect(arrow(container).getAttribute('aria-haspopup')).toBe('menu');
        expect(arrow(container).getAttribute('aria-expanded')).toBe('false');
        expect(arrow(container).textContent).toBe('');
        expect(arrow(container).querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
        expect(arrow(container).type).toBe('button');
    });

    it('the Copilot menu holds Send to a new chat, Send to the current chat and Copy prompt, in this order, labelled by the arrow part', async () => {
        const container = await show(COPILOT_VIEW);
        await click(arrow(container));
        expect(arrow(container).getAttribute('aria-expanded')).toBe('true');
        expect(menu(container)?.getAttribute('aria-labelledby')).toBe(arrow(container).id);
        expect(arrow(container).id).not.toBe('');
        expect(items(container).map((item) => item.textContent)).toEqual(['Send to a new chat', 'Send to the current chat', 'Copy prompt']);
        expect(items(container).every((item) => item.tagName === 'BUTTON' && (item as HTMLButtonElement).type === 'button')).toBe(true);
        expect([...menu(container)!.children]).toHaveLength(3);
    });

    it('the Claude Code menu holds Send to a new chat and Copy prompt', async () => {
        const container = await show(CLAUDE_VIEW);
        await click(arrow(container));
        expect(items(container).map((item) => item.textContent)).toEqual(['Send to a new chat', 'Copy prompt']);
    });

    it('a second click on the arrow part closes the menu', async () => {
        const container = await show(COPILOT_VIEW);
        await click(arrow(container));
        await click(arrow(container));
        expect(menu(container)).toBeNull();
        expect(arrow(container).getAttribute('aria-expanded')).toBe('false');
    });
});

describe('0024 AC-005: the main part and each item send exactly one request', () => {
    it('the main part posts the assistant, the default target and the line; nothing changes while it is pending', async () => {
        const container = await show(COPILOT_VIEW);
        const before = container.innerHTML;
        await click(main(container));
        expect(sent).toEqual([{ assistant: 'copilot', target: 'current', line: LINE }]);
        expect(copied).toEqual([]);
        await advance(10_000);
        expect(container.innerHTML).toBe(before);
        expect(live(container).textContent).toBe('');
    });

    it('the Send items post their own target and close the menu; Claude Code posts its new chat', async () => {
        const container = await show(COPILOT_VIEW);
        await click(arrow(container));
        await click(items(container)[0]!);
        expect(sent).toEqual([{ assistant: 'copilot', target: 'new', line: LINE }]);
        expect(menu(container)).toBeNull();
        await click(arrow(container));
        await click(items(container)[1]!);
        expect(sent[1]).toEqual({ assistant: 'copilot', target: 'current', line: LINE });
        mounted?.unmount();
        const claude = await show(CLAUDE_VIEW);
        await click(arrow(claude));
        await click(items(claude)[0]!);
        expect(sent[2]).toEqual({ assistant: 'claudeCode', target: 'new', line: LINE });
    });

    it('opened: the label, the name, the tooltip and the announcement; 2000 ms after the result the main part reads Send to Copilot again', async () => {
        const container = await show(COPILOT_VIEW);
        await click(main(container));
        await deliverSend({ outcome: 'opened', text: OPENED_COPILOT });
        expect(main(container).textContent).toBe('Opened in Copilot');
        expect(main(container).getAttribute('aria-label')).toBe(`Opened in Copilot: ${LINE}`);
        expect(main(container).getAttribute('title')).toBe(OPENED_COPILOT);
        expect(live(container).textContent).toBe(OPENED_COPILOT);
        await advance(1999);
        expect(main(container).textContent).toBe('Opened in Copilot');
        await advance(1);
        expect(main(container).textContent).toBe('Send to Copilot');
        expect(main(container).getAttribute('aria-label')).toBe(`Send to Copilot (current chat): ${LINE}`);
        expect(live(container).textContent).toBe('');
    });

    it('the time counts from the result, not from the activation: a result after 4 s still shows for 2 s', async () => {
        const container = await show(CLAUDE_VIEW);
        await click(main(container));
        await advance(4000);
        expect(main(container).textContent).toBe('Send to Claude Code');
        await deliverSend({ outcome: 'opened', text: OPENED_CLAUDE });
        expect(main(container).textContent).toBe('Opened in Claude Code');
        await advance(1999);
        expect(main(container).textContent).toBe('Opened in Claude Code');
        await advance(1);
        expect(main(container).textContent).toBe('Send to Claude Code');
    });

    it('a second result restarts the 2000 ms: the feedback runs until 2000 ms after the last result', async () => {
        const container = await show(COPILOT_VIEW);
        await click(main(container));
        await click(main(container));
        await deliverSend({ outcome: 'opened', text: OPENED_COPILOT });
        await advance(1500);
        await deliverSend({ outcome: 'opened', text: `${OPENED_COPILOT}` });
        await advance(1999);
        expect(main(container).textContent).toBe('Opened in Copilot');
        await advance(1);
        expect(main(container).textContent).toBe('Send to Copilot');
    });

    it('copied and copyFailed results give 0021’s Copied and Could not copy with their sentences', async () => {
        const container = await show(COPILOT_VIEW);
        await click(main(container));
        await deliverSend({ outcome: 'copied', text: COPIED_TEXT });
        expect(main(container).textContent).toBe(COPIED_LABEL);
        expect(main(container).getAttribute('aria-label')).toBe(`Copied: ${LINE}`);
        expect(main(container).getAttribute('title')).toBe('Copied to the clipboard.');
        expect(live(container).textContent).toBe('Copied to the clipboard.');
        await advance(2000);
        await click(main(container));
        await deliverSend({ outcome: 'copyFailed', text: COPY_FAILED_TEXT });
        expect(main(container).textContent).toBe(COPY_FAILED_LABEL);
        expect(main(container).getAttribute('aria-label')).toBe(`Could not copy: ${LINE}`);
        expect(live(container).textContent).toBe('Could not copy to the clipboard.');
    });

    it('the Copy prompt item posts the copy request, not a send, closes the menu and shows 0021’s Copied on the main part', async () => {
        const container = await show(COPILOT_VIEW);
        await click(arrow(container));
        await click(items(container)[2]!);
        expect(copied).toEqual([LINE]);
        expect(sent).toEqual([]);
        expect(menu(container)).toBeNull();
        await deliverCopy({ ok: true, text: COPIED_TEXT });
        expect(main(container).textContent).toBe('Copied');
        expect(main(container).getAttribute('title')).toBe('Copied to the clipboard.');
        expect(live(container).textContent).toBe('Copied to the clipboard.');
        await advance(2000);
        expect(main(container).textContent).toBe('Send to Copilot');
        await click(arrow(container));
        await click(items(container)[2]!);
        await deliverCopy({ ok: false, text: COPY_FAILED_TEXT });
        expect(main(container).textContent).toBe('Could not copy');
    });

    it('negative control: a result that was there before the activation does not set the label', async () => {
        const container = await show(COPILOT_VIEW, { sendResult: { outcome: 'opened', text: OPENED_COPILOT }, copyResult: { ok: true, text: COPIED_TEXT } });
        expect(main(container).textContent).toBe('Send to Copilot');
        await click(main(container));
        expect(main(container).textContent).toBe('Send to Copilot');
        await click(arrow(container));
        await click(items(container)[2]!);
        expect(main(container).textContent).toBe('Send to Copilot');
    });

    it('a result nobody asked for (no activation here) is not shown, a later one is shown only once per activation', async () => {
        const container = await show(COPILOT_VIEW);
        await deliverSend({ outcome: 'opened', text: OPENED_COPILOT });
        expect(main(container).textContent).toBe('Send to Copilot');
        await click(main(container));
        await deliverSend({ outcome: 'opened', text: `${OPENED_COPILOT} ` });
        expect(main(container).textContent).toBe('Opened in Copilot');
        await advance(2000);
        await deliverSend({ outcome: 'opened', text: `${OPENED_COPILOT}  ` });
        expect(main(container).textContent).toBe('Send to Copilot');
    });

    it('a dropped result (the detail changed) clears the feedback and the pending activation', async () => {
        const container = await show(COPILOT_VIEW);
        await click(main(container));
        await deliverSend({ outcome: 'opened', text: OPENED_COPILOT });
        await deliverSend(undefined);
        expect(main(container).textContent).toBe('Send to Copilot');
        await deliverSend({ outcome: 'opened', text: OPENED_COPILOT });
        expect(main(container).textContent).toBe('Send to Copilot');
    });
});

describe('0024 AC-009: the DOM keeps its elements and their order while the feedback shows', () => {
    it('the tag and class sequence is the same idle, opened and copied', async () => {
        const container = await show(COPILOT_VIEW);
        const shape = () => [...container.querySelectorAll('*')].map((element) => `${element.tagName}.${element.getAttribute('class') ?? ''}`).join('|');
        const idle = shape();
        await click(main(container));
        await deliverSend({ outcome: 'opened', text: OPENED_COPILOT });
        expect(shape()).toBe(idle);
        await advance(2000);
        await click(main(container));
        await deliverSend({ outcome: 'copied', text: COPIED_TEXT });
        expect(shape()).toBe(idle);
    });
});
