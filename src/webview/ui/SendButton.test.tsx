import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SendPromptPayload, SendResultEventPayload, SendView } from '../../shared/protocol/assistant';
import { COPIED_LABEL, COPIED_TEXT, COPY_FAILED_LABEL, COPY_FAILED_TEXT } from '../../shared/protocol/nextStepTexts';
import { click, mount, pressKey, type Mounted } from '../testing/dom';
import type { CopyResult } from './CopyButton';
import { SendButton } from './SendButton';
import { Toggletip } from './Toggletip';

const LINE = 'Implement T-003 of .specs/active/0001-tip-splitter.plan.md';
const VIEW_A: SendView = { assistant: 'copilot', target: 'current', targets: ['new', 'current'] };
const VIEW_A_NEW: SendView = { assistant: 'copilot', target: 'new', targets: ['new', 'current'] };
const CLAUDE_VIEW: SendView = { assistant: 'claudeCode', target: 'new', targets: ['new'] };
const TOKEN = expect.stringMatching(/^[A-Za-z0-9-]{1,64}$/);
const OPENED_A = "The prompt is in Copilot's chat. Check it, then send it there.";
const OPENED_CLAUDE = "The prompt is in Claude Code's chat. Check it, then send it there.";

let mounted: Mounted | undefined;
let sent: SendPromptPayload[];
let copied: string[];
type Delivered = Omit<SendResultEventPayload, 'token'> & { token?: string };

let deliverSend: (result: Delivered | undefined) => Promise<void>;
let deliverCopy: (result: CopyResult | undefined) => Promise<void>;

function Harness(props: { send: SendView; sendResult?: SendResultEventPayload; copyResult?: CopyResult }) {
    const [sendResult, setSendResult] = useState<SendResultEventPayload | undefined>(props.sendResult);
    const [copyResult, setCopyResult] = useState<CopyResult | undefined>(props.copyResult);
    deliverSend = async (next) => {
        await act(async () => {
            setSendResult(next === undefined ? undefined : { ...next, token: next.token ?? sent[sent.length - 1]?.token ?? 'none-0' });
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
        const container = await show(VIEW_A);
        const wrapper = container.querySelector('.send-split')!;
        expect([...wrapper.children].map((child) => `${child.tagName.toLowerCase()}.${child.className}`)).toEqual(['button.copy-button send-main', 'button.send-arrow', 'span.visually-hidden']);
        expect(wrapper.classList.contains('next-step-copy')).toBe(true);
        expect(main(container).textContent).toBe('Send to Copilot');
        expect(main(container).getAttribute('aria-label')).toBe(`Send to Copilot (current chat): ${LINE}`);
        expect(main(container).getAttribute('title')).toBe(`Send to Copilot (current chat): ${LINE}`);
        expect(menu(container)).toBeNull();
    });

    it('Copilot, new chat names the new chat; Claude Code names its new chat and its own name', async () => {
        const fresh = await show(VIEW_A_NEW);
        expect(main(fresh).getAttribute('aria-label')).toBe(`Send to Copilot (new chat): ${LINE}`);
        mounted?.unmount();
        const claude = await show(CLAUDE_VIEW);
        expect(main(claude).textContent).toBe('Send to Claude Code');
        expect(main(claude).getAttribute('title')).toBe(`Send to Claude Code (new chat): ${LINE}`);
    });

    it('the arrow part has a hidden glyph, its name with the line, the tooltip More actions, aria-haspopup menu and aria-expanded false', async () => {
        const container = await show(VIEW_A);
        expect(arrow(container).getAttribute('aria-label')).toBe(`More actions: ${LINE}`);
        expect(arrow(container).getAttribute('title')).toBe('More actions');
        expect(arrow(container).getAttribute('aria-haspopup')).toBe('menu');
        expect(arrow(container).getAttribute('aria-expanded')).toBe('false');
        expect(arrow(container).textContent).toBe('');
        expect(arrow(container).querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
        expect(arrow(container).type).toBe('button');
    });

    it('the Copilot menu holds Send to a new chat, Send to the current chat and Copy prompt, in this order, labelled by the arrow part', async () => {
        const container = await show(VIEW_A);
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
        const container = await show(VIEW_A);
        await click(arrow(container));
        await click(arrow(container));
        expect(menu(container)).toBeNull();
        expect(arrow(container).getAttribute('aria-expanded')).toBe('false');
    });
});

describe('0024 AC-005: the main part and each item send exactly one request', () => {
    it('the main part posts the assistant, the default target and the line; nothing changes while it is pending', async () => {
        const container = await show(VIEW_A);
        const before = container.innerHTML;
        await click(main(container));
        expect(sent).toEqual([{ assistant: 'copilot', target: 'current', line: LINE, token: TOKEN }]);
        expect(copied).toEqual([]);
        await advance(10_000);
        expect(container.innerHTML).toBe(before);
        expect(live(container).textContent).toBe('');
    });

    it('the Send items post their own target and close the menu; Claude Code posts its new chat', async () => {
        const container = await show(VIEW_A);
        await click(arrow(container));
        await click(items(container)[0]!);
        expect(sent).toEqual([{ assistant: 'copilot', target: 'new', line: LINE, token: TOKEN }]);
        expect(menu(container)).toBeNull();
        await click(arrow(container));
        await click(items(container)[1]!);
        expect(sent[1]).toEqual({ assistant: 'copilot', target: 'current', line: LINE, token: TOKEN });
        mounted?.unmount();
        const claude = await show(CLAUDE_VIEW);
        await click(arrow(claude));
        await click(items(claude)[0]!);
        expect(sent[2]).toEqual({ assistant: 'claudeCode', target: 'new', line: LINE, token: TOKEN });
    });

    it('opened: the label, the name, the tooltip and the announcement; 2000 ms after the result the main part reads Send to Copilot again', async () => {
        const container = await show(VIEW_A);
        await click(main(container));
        await deliverSend({ outcome: 'opened', text: OPENED_A });
        expect(main(container).textContent).toBe('Opened in Copilot');
        expect(main(container).getAttribute('aria-label')).toBe(`Opened in Copilot: ${LINE}`);
        expect(main(container).getAttribute('title')).toBe(OPENED_A);
        expect(live(container).textContent).toBe(OPENED_A);
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
        const container = await show(VIEW_A);
        await click(main(container));
        await click(main(container));
        await deliverSend({ outcome: 'opened', text: OPENED_A, token: sent[0]!.token });
        await advance(1500);
        await deliverSend({ outcome: 'opened', text: `${OPENED_A}`, token: sent[1]!.token });
        await advance(1999);
        expect(main(container).textContent).toBe('Opened in Copilot');
        await advance(1);
        expect(main(container).textContent).toBe('Send to Copilot');
    });

    it('copied and copyFailed results give 0021’s Copied and Could not copy with their sentences', async () => {
        const container = await show(VIEW_A);
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
        const container = await show(VIEW_A);
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
        const container = await show(VIEW_A, { sendResult: { outcome: 'opened', text: OPENED_A, token: 'before-1' }, copyResult: { ok: true, text: COPIED_TEXT } });
        expect(main(container).textContent).toBe('Send to Copilot');
        await click(main(container));
        expect(main(container).textContent).toBe('Send to Copilot');
        await click(arrow(container));
        await click(items(container)[2]!);
        expect(main(container).textContent).toBe('Send to Copilot');
    });

    it('a result nobody asked for (no activation here) is not shown, a later one is shown only once per activation', async () => {
        const container = await show(VIEW_A);
        await deliverSend({ outcome: 'opened', text: OPENED_A });
        expect(main(container).textContent).toBe('Send to Copilot');
        await click(main(container));
        await deliverSend({ outcome: 'opened', text: `${OPENED_A} ` });
        expect(main(container).textContent).toBe('Opened in Copilot');
        await advance(2000);
        await deliverSend({ outcome: 'opened', text: `${OPENED_A}  ` });
        expect(main(container).textContent).toBe('Send to Copilot');
    });

    it('a dropped result (the detail changed) clears the feedback and the pending activation', async () => {
        const container = await show(VIEW_A);
        await click(main(container));
        await deliverSend({ outcome: 'opened', text: OPENED_A });
        await deliverSend(undefined);
        expect(main(container).textContent).toBe('Send to Copilot');
        await deliverSend({ outcome: 'opened', text: OPENED_A });
        expect(main(container).textContent).toBe('Send to Copilot');
    });
});

describe('0024 AC-005: a split button shows only the results of its own Sends (PR #1 comment 2)', () => {
    function Two(props: { second?: string }) {
        const [result, setResult] = useState<SendResultEventPayload | undefined>(undefined);
        deliverSend = async (next) => {
            await act(async () => {
                setResult(next === undefined ? undefined : { ...next, token: next.token ?? 'none-0' });
            });
        };
        return (
            <div>
                <section data-id="row">
                    <SendButton send={VIEW_A} line={LINE} sendResult={result} onSend={(request) => void sent.push(request)} copyResult={undefined} onCopy={() => undefined} />
                </section>
                <section data-id="panel">
                    <SendButton send={VIEW_A} line={props.second ?? LINE} sendResult={result} onSend={(request) => void sent.push(request)} copyResult={undefined} onCopy={() => undefined} />
                </section>
            </div>
        );
    }

    const part = (container: HTMLElement, id: 'row' | 'panel') => container.querySelector<HTMLButtonElement>(`[data-id="${id}"] button.send-main`)!;
    const said = (container: HTMLElement, id: 'row' | 'panel') => container.querySelector<HTMLElement>(`[data-id="${id}"] [role="status"]`)!.textContent;

    it('two Sends pending, one at the row and one at the panel: each result goes to the control that sent it, and a failed Send does not read as opened', async () => {
        mounted = await mount(<Two />);
        const container = mounted.container;
        await click(part(container, 'row'));
        await click(part(container, 'panel'));
        expect(sent).toHaveLength(2);
        expect(sent[0]!.token).not.toBe(sent[1]!.token);
        await deliverSend({ outcome: 'opened', text: OPENED_A, token: sent[0]!.token });
        expect(part(container, 'row').textContent).toBe('Opened in Copilot');
        expect(part(container, 'panel').textContent).toBe('Send to Copilot');
        expect(said(container, 'panel')).toBe('');
        await deliverSend({ outcome: 'copied', text: COPIED_TEXT, token: sent[1]!.token });
        expect(part(container, 'panel').textContent).toBe('Copied');
        expect(said(container, 'panel')).toBe(COPIED_TEXT);
        expect(part(container, 'row').textContent).toBe('Opened in Copilot');
        expect(said(container, 'row')).toBe(OPENED_A);
    });

    it('the result of the second activation arriving first is not taken by the first control', async () => {
        mounted = await mount(<Two />);
        const container = mounted.container;
        await click(part(container, 'row'));
        await click(part(container, 'panel'));
        await deliverSend({ outcome: 'copyFailed', text: COPY_FAILED_TEXT, token: sent[1]!.token });
        expect(part(container, 'row').textContent).toBe('Send to Copilot');
        expect(part(container, 'panel').textContent).toBe('Could not copy');
    });

    it('a result of another token, and a result of a Send of an earlier page, show nothing, and the own result still shows afterwards', async () => {
        mounted = await mount(<Two />);
        const container = mounted.container;
        await click(part(container, 'row'));
        await deliverSend({ outcome: 'opened', text: OPENED_A, token: 'elsewhere-1' });
        expect(part(container, 'row').textContent).toBe('Send to Copilot');
        await deliverSend({ outcome: 'opened', text: `${OPENED_A} `, token: sent[0]!.token });
        expect(part(container, 'row').textContent).toBe('Opened in Copilot');
        await advance(2000);
        await deliverSend({ outcome: 'opened', text: `${OPENED_A}  `, token: sent[0]!.token });
        expect(part(container, 'row').textContent).toBe('Send to Copilot');
    });

    it('the step changes while the Send is pending: its late result is not shown at the control that now names another step', async () => {
        const container = await show(VIEW_A);
        await click(main(container));
        const token = sent[0]!.token;
        mounted?.unmount();
        mounted = await mount(<Harness send={VIEW_A} />);
        await click(main(mounted.container));
        await deliverSend({ outcome: 'opened', text: OPENED_A, token });
        expect(main(mounted.container).textContent).toBe('Send to Copilot');
        await deliverSend({ outcome: 'opened', text: `${OPENED_A} `, token: sent[1]!.token });
        expect(main(mounted.container).textContent).toBe('Opened in Copilot');
    });

    it('the same control with another line: the result of the Send of the old line is dropped, the one of the new line is shown', async () => {
        function Changing() {
            const [line, setLine] = useState(LINE);
            const [result, setResult] = useState<SendResultEventPayload | undefined>(undefined);
            deliverSend = async (next) => {
                await act(async () => {
                    setResult(next === undefined ? undefined : { ...next, token: next.token ?? 'none-0' });
                });
            };
            return (
                <div>
                    <button type="button" data-id="next" onClick={() => setLine(`${LINE} again`)}>
                        next
                    </button>
                    <SendButton send={VIEW_A} line={line} sendResult={result} onSend={(request) => void sent.push(request)} copyResult={undefined} onCopy={() => undefined} />
                </div>
            );
        }
        mounted = await mount(<Changing />);
        const container = mounted.container;
        await click(main(container));
        await click(container.querySelector('[data-id="next"]')!);
        await deliverSend({ outcome: 'opened', text: OPENED_A, token: sent[0]!.token });
        expect(main(container).textContent).toBe('Send to Copilot');
        await click(main(container));
        expect(sent[1]!.line).toBe(`${LINE} again`);
        await deliverSend({ outcome: 'opened', text: `${OPENED_A} `, token: sent[1]!.token });
        expect(main(container).textContent).toBe('Opened in Copilot');
    });
});

describe('0024 AC-009: the DOM keeps its elements and their order while the feedback shows', () => {
    it('the tag and class sequence is the same idle, opened and copied', async () => {
        const container = await show(VIEW_A);
        const shape = () => [...container.querySelectorAll('*')].map((element) => `${element.tagName}.${element.getAttribute('class') ?? ''}`).join('|');
        const idle = shape();
        await click(main(container));
        await deliverSend({ outcome: 'opened', text: OPENED_A });
        expect(shape()).toBe(idle);
        await advance(2000);
        await click(main(container));
        await deliverSend({ outcome: 'copied', text: COPIED_TEXT });
        expect(shape()).toBe(idle);
    });
});

async function key(element: Element, name: string, init: KeyboardEventInit = {}): Promise<KeyboardEvent> {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init });
    await act(async () => {
        element.dispatchEvent(event);
    });
    return event;
}

async function focus(element: HTMLElement): Promise<void> {
    await act(async () => element.focus());
}

describe('0024 AC-008: the menu keys and pointer rules', () => {
    it('while closed: aria-expanded is false and no role=menu is in the DOM', async () => {
        const container = await show(VIEW_A);
        expect(arrow(container).getAttribute('aria-expanded')).toBe('false');
        expect(container.querySelector('[role="menu"]')).toBeNull();
    });

    it('Enter, Space and a click on the arrow part open the menu on the first item', async () => {
        for (const how of ['enter', 'space', 'click'] as const) {
            const container = await show(VIEW_A);
            await focus(arrow(container));
            if (how === 'click') {
                await click(arrow(container));
            } else {
                await pressKey(arrow(container), how === 'enter' ? 'Enter' : ' ');
            }
            expect(arrow(container).getAttribute('aria-expanded'), how).toBe('true');
            expect(document.activeElement, how).toBe(items(container)[0]);
            mounted?.unmount();
            mounted = undefined;
        }
    });

    it('ArrowDown opens on the first item, ArrowUp on the last; both are prevented', async () => {
        const container = await show(VIEW_A);
        await focus(arrow(container));
        expect((await key(arrow(container), 'ArrowDown')).defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(items(container)[0]);
        await key(document.activeElement!, 'Escape');
        expect(menu(container)).toBeNull();
        expect((await key(arrow(container), 'ArrowUp')).defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(items(container)[2]);
    });

    it('the items are in the menu, not in the tab order, and ArrowDown and ArrowUp wrap', async () => {
        const container = await show(VIEW_A);
        await click(arrow(container));
        const all = items(container);
        expect(all).toHaveLength(3);
        expect(all.every((item) => item.tabIndex === -1)).toBe(true);
        await key(all[0]!, 'ArrowDown');
        expect(document.activeElement).toBe(all[1]);
        await key(all[1]!, 'ArrowDown');
        expect(document.activeElement).toBe(all[2]);
        await key(all[2]!, 'ArrowDown');
        expect(document.activeElement).toBe(all[0]);
        await key(all[0]!, 'ArrowUp');
        expect(document.activeElement).toBe(all[2]);
        await key(all[2]!, 'ArrowUp');
        expect(document.activeElement).toBe(all[1]);
    });

    it('Home goes to the first item, End to the last', async () => {
        const container = await show(VIEW_A);
        await click(arrow(container));
        const all = items(container);
        expect((await key(all[0]!, 'End')).defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(all[2]);
        await key(all[2]!, 'Home');
        expect(document.activeElement).toBe(all[0]);
    });

    it('Enter, Space and a click on an item activate it, close the menu and put focus on the arrow part', async () => {
        for (const how of ['enter', 'space', 'click'] as const) {
            sent = [];
            const container = await show(VIEW_A);
            await click(arrow(container));
            const item = items(container)[1]!;
            await focus(item);
            if (how === 'click') {
                await click(item);
            } else {
                await pressKey(item, how === 'enter' ? 'Enter' : ' ');
            }
            expect(sent, how).toEqual([{ assistant: 'copilot', target: 'current', line: LINE, token: TOKEN }]);
            expect(menu(container), how).toBeNull();
            expect(arrow(container).getAttribute('aria-expanded'), how).toBe('false');
            expect(document.activeElement, how).toBe(arrow(container));
            mounted?.unmount();
            mounted = undefined;
        }
    });

    it('the Copy prompt item copies and closes with focus on the arrow part', async () => {
        const container = await show(VIEW_A);
        await click(arrow(container));
        await click(items(container)[2]!);
        expect(copied).toEqual([LINE]);
        expect(menu(container)).toBeNull();
        expect(document.activeElement).toBe(arrow(container));
    });

    it('Escape closes the menu, is prevented, and puts focus on the arrow part, from an item and from the arrow part', async () => {
        const container = await show(VIEW_A);
        await click(arrow(container));
        const fromItem = await key(document.activeElement!, 'Escape');
        expect(fromItem.defaultPrevented).toBe(true);
        expect(menu(container)).toBeNull();
        expect(document.activeElement).toBe(arrow(container));
        await click(arrow(container));
        await focus(arrow(container));
        await key(arrow(container), 'Escape');
        expect(menu(container)).toBeNull();
        expect(document.activeElement).toBe(arrow(container));
    });

    it('Escape with the menu closed is not prevented', async () => {
        const container = await show(VIEW_A);
        await focus(arrow(container));
        expect((await key(arrow(container), 'Escape')).defaultPrevented).toBe(false);
    });

    it('Tab and Shift+Tab close the menu and put focus on the arrow part; the key itself is not prevented', async () => {
        for (const shiftKey of [false, true]) {
            const container = await show(VIEW_A);
            await click(arrow(container));
            const event = await key(document.activeElement!, 'Tab', { shiftKey });
            expect(event.defaultPrevented).toBe(false);
            expect(menu(container)).toBeNull();
            expect(document.activeElement).toBe(arrow(container));
            mounted?.unmount();
            mounted = undefined;
        }
    });

    it('a pointer press outside the menu closes it; a press on the arrow part or inside the menu does not', async () => {
        const container = await show(VIEW_A);
        await click(arrow(container));
        const press = async (target: Element): Promise<void> => {
            await act(async () => {
                target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
            });
        };
        await press(menu(container)!);
        await press(arrow(container));
        expect(menu(container)).not.toBeNull();
        await press(document.body);
        expect(menu(container)).toBeNull();
        expect(arrow(container).getAttribute('aria-expanded')).toBe('false');
    });

    it('a second click on the arrow part closes the menu', async () => {
        const container = await show(VIEW_A);
        await click(arrow(container));
        await click(arrow(container));
        expect(menu(container)).toBeNull();
        expect(document.activeElement).toBe(arrow(container));
    });

    it('unmounting with the menu open leaves no open popup: a new split button opens its menu normally and no listener stays', async () => {
        const first = await show(VIEW_A);
        await click(arrow(first));
        mounted?.unmount();
        mounted = undefined;
        const second = await show(VIEW_A);
        expect(menu(second)).toBeNull();
        await click(arrow(second));
        expect(menu(second)).not.toBeNull();
    });

    it('opening the menu closes an open toggletip; opening a toggletip closes the menu', async () => {
        mounted = await mount(
            <div>
                <Harness send={VIEW_A} />
                <Toggletip label="About" glyph="?" paragraphs={['One.']} />
            </div>,
        );
        const container = mounted.container;
        const tip = container.querySelector<HTMLButtonElement>('button.toggletip')!;
        await click(tip);
        expect(tip.getAttribute('aria-expanded')).toBe('true');
        await click(arrow(container));
        expect(tip.getAttribute('aria-expanded')).toBe('false');
        expect(menu(container)).not.toBeNull();
        await click(tip);
        expect(tip.getAttribute('aria-expanded')).toBe('true');
        expect(menu(container)).toBeNull();
        expect(arrow(container).getAttribute('aria-expanded')).toBe('false');
    });

    it('the assistant changing closes the menu and moves focus from an item to the arrow part; focus elsewhere stays', async () => {
        let change: (next: SendView) => Promise<void> = async () => undefined;
        function Switch() {
            const [view, setView] = useState<SendView>(VIEW_A);
            change = async (next) => {
                await act(async () => setView(next));
            };
            return (
                <div>
                    <Harness send={view} />
                    <button type="button" data-id="elsewhere">
                        elsewhere
                    </button>
                </div>
            );
        }
        mounted = await mount(<Switch />);
        const container = mounted.container;
        await click(arrow(container));
        expect(document.activeElement).toBe(items(container)[0]);
        await change(CLAUDE_VIEW);
        expect(menu(container)).toBeNull();
        expect(document.activeElement).toBe(arrow(container));
        const elsewhere = container.querySelector<HTMLElement>('[data-id="elsewhere"]')!;
        await focus(elsewhere);
        await change(VIEW_A);
        expect(document.activeElement).toBe(elsewhere);
    });

    it('Claude Code, two items: ArrowDown from the last item wraps to the first', async () => {
        const container = await show(CLAUDE_VIEW);
        await click(arrow(container));
        const all = items(container);
        expect(all).toHaveLength(2);
        await focus(all[1]!);
        await key(all[1]!, 'ArrowDown');
        expect(document.activeElement).toBe(all[0]);
    });
});


describe('0025 AC-026: the secondary look of the split button', () => {
    it('look secondary makes the main part secondary and the arrow part carry the secondary class; the default stays primary', async () => {
        const send = { assistant: 'copilot' as const, target: 'new' as const, targets: ['new' as const, 'current' as const] };
        const props = { send, line: '/sdd-plan x', sendResult: undefined, onSend: () => undefined, copyResult: undefined, onCopy: () => undefined };
        mounted = await mount(<SendButton {...props} look="secondary" />);
        expect(mounted.container.querySelector('button.send-main')!.classList.contains('copy-secondary')).toBe(true);
        expect(mounted.container.querySelector('button.send-arrow')!.classList.contains('send-arrow-secondary')).toBe(true);
        mounted.unmount();
        mounted = await mount(<SendButton {...props} />);
        expect(mounted.container.querySelector('button.send-main')!.classList.contains('copy-secondary')).toBe(false);
        expect(mounted.container.querySelector('button.send-arrow')!.classList.contains('send-arrow-secondary')).toBe(false);
    });
});
