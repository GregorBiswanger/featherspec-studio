import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SendPromptPayload, SendResultEventPayload, SendView } from '../../shared/protocol/assistant';
import { copyForMainLabel, copyForMainName, copyForTipText } from '../../shared/protocol/assistantTexts';
import { COPIED_TEXT } from '../../shared/protocol/nextStepTexts';
import { click, mount, type Mounted } from '../testing/dom';
import type { CopyResult } from './CopyButton';
import { SendButton } from './SendButton';

const LINE = '/sdd-plan .specs/active/0001-tip-splitter.md';
const SPEC = { name: '0001-tip-splitter.md', path: '.specs/active/0001-tip-splitter.md' };
const PLAN = { name: '0001-tip-splitter.plan.md', path: '.specs/active/0001-tip-splitter.plan.md' };
const GH_VIEW: SendView = { assistant: 'copilot', handover: 'copyFor', target: 'new', targets: ['new'] };
const JUNIE_VIEW: SendView = { assistant: 'junie', handover: 'copyFor', target: 'new', targets: ['new'], attach: SPEC, attachAlso: [PLAN] };
const TOKEN = expect.stringMatching(/^[A-Za-z0-9-]{1,64}$/);
const DONE = 'Copied. Paste it into GitHub Copilot Chat with Ctrl+V.';

let mounted: Mounted | undefined;
let sent: SendPromptPayload[];
let copied: string[];
let deliverSend: (result: { outcome: SendResultEventPayload['outcome']; text: string }) => Promise<void>;
let deliverCopy: (result: CopyResult) => Promise<void>;

function Harness(props: { send: SendView }) {
    const [sendResult, setSendResult] = useState<SendResultEventPayload | undefined>(undefined);
    const [copyResult, setCopyResult] = useState<CopyResult | undefined>(undefined);
    deliverSend = async (next) => {
        await act(async () => {
            setSendResult({ ...next, token: sent[sent.length - 1]?.token ?? 'none-0' });
        });
    };
    deliverCopy = async (next) => {
        await act(async () => {
            setCopyResult(next);
        });
    };
    return <SendButton send={props.send} line={LINE} sendResult={sendResult} onSend={(request) => void sent.push(request)} copyResult={copyResult} onCopy={(line) => void copied.push(line)} />;
}

async function show(send: SendView): Promise<HTMLElement> {
    mounted = await mount(<Harness send={send} />);
    return mounted.container;
}

const main = (container: HTMLElement) => container.querySelector<HTMLButtonElement>('button.send-main')!;
const arrow = (container: HTMLElement) => container.querySelector<HTMLButtonElement>('button.send-arrow')!;
const items = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
const live = (container: HTMLElement) => container.querySelector<HTMLElement>('[role="status"]')!;

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

describe('0035 T-006 / AC-020, AC-021: the Copy for split button', () => {
    it('AC-021 the main part reads Copy for <Name>; name and tooltip are §7 literally, with the paths of the files', async () => {
        const container = await show(GH_VIEW);
        expect(main(container).textContent).toBe('Copy for Copilot');
        expect(main(container).getAttribute('aria-label')).toBe(`Copy for Copilot: ${LINE}`);
        expect(main(container).getAttribute('title')).toBe(`Copy for Copilot: ${LINE}`);
        mounted?.unmount();
        const junie = await show(JUNIE_VIEW);
        expect(main(junie).textContent).toBe('Copy for Junie');
        expect(main(junie).getAttribute('aria-label')).toBe(`Copy for Junie: ${LINE}. Adds the paths of 0001-tip-splitter.md and 0001-tip-splitter.plan.md.`);
        expect(main(junie).getAttribute('title')).toBe(`Copy for Junie: ${LINE}. Adds the paths of 0001-tip-splitter.md and 0001-tip-splitter.plan.md.`);
    });

    it('AC-020 the menu holds exactly one item, Copy prompt, and no target item', async () => {
        const container = await show(JUNIE_VIEW);
        await click(arrow(container));
        expect(items(container).map((item) => [item.getAttribute('role'), item.textContent])).toEqual([['menuitem', 'Copy prompt']]);
        expect(arrow(container).getAttribute('aria-label')).toBe(`More actions: ${LINE}`);
        expect(arrow(container).getAttribute('title')).toBe('More actions');
    });

    it('AC-016 the main part sends one request with target new and every attached path; no target item exists to choose another', async () => {
        const container = await show(JUNIE_VIEW);
        await click(main(container));
        expect(sent).toEqual([{ assistant: 'junie', target: 'new', line: LINE, attach: SPEC.path, attachAlso: [PLAN.path], token: TOKEN }]);
    });

    it('AC-019 the answer copied shows Copied, the name Copied: <line> and the core text as tooltip and announcement', async () => {
        const container = await show(GH_VIEW);
        await click(main(container));
        await deliverSend({ outcome: 'copied', text: DONE });
        expect(main(container).textContent).toBe('Copied');
        expect(main(container).getAttribute('aria-label')).toBe(`Copied: ${LINE}`);
        expect(main(container).getAttribute('title')).toBe(DONE);
        expect(live(container).textContent).toBe(DONE);
    });

    it('AC-019 the answer copyFailed shows Could not copy with the core text', async () => {
        const container = await show(GH_VIEW);
        await click(main(container));
        await deliverSend({ outcome: 'copyFailed', text: 'Could not copy to the clipboard.' });
        expect(main(container).textContent).toBe('Could not copy');
        expect(main(container).getAttribute('aria-label')).toBe(`Could not copy: ${LINE}`);
        expect(live(container).textContent).toBe('Could not copy to the clipboard.');
    });

    it('AC-020 the menu item Copy prompt asks for the line alone and shows Copied', async () => {
        const container = await show(GH_VIEW);
        await click(arrow(container));
        await click(items(container)[0]!);
        expect(copied).toEqual([LINE]);
        expect(sent).toEqual([]);
        await deliverCopy({ ok: true, text: COPIED_TEXT });
        expect(main(container).textContent).toBe('Copied');
        expect(live(container).textContent).toBe(COPIED_TEXT);
    });

    it('the feedback returns to the label after the feedback time', async () => {
        const container = await show(GH_VIEW);
        await click(main(container));
        await deliverSend({ outcome: 'copied', text: DONE });
        await act(async () => {
            vi.advanceTimersByTime(5000);
        });
        expect(main(container).textContent).toBe('Copy for Copilot');
    });

    it('negative control: a Send view without handover still reads Send to <Name> with its target menu', async () => {
        const container = await show({ assistant: 'copilot', target: 'new', targets: ['new', 'current'] });
        expect(main(container).textContent).toBe('Send to Copilot');
        await click(arrow(container));
        expect(items(container).map((item) => item.textContent)).toEqual(['Send to a new chat', 'Send to the current chat', 'Copy prompt']);
    });
});

describe('0035 T-006 / AC-021, AC-022: the texts of section 7', () => {
    it('AC-021 label, name and toggletip sentence', () => {
        expect(copyForMainLabel('Copilot')).toBe('Copy for Copilot');
        expect(copyForMainName('Junie', LINE)).toBe(`Copy for Junie: ${LINE}`);
        expect(copyForMainName('Junie', LINE, 'a.md and b.md')).toBe(`Copy for Junie: ${LINE}. Adds the paths of a.md and b.md.`);
        expect(copyForTipText('Copilot', 'GitHub Copilot Chat')).toBe('Copy for Copilot copies the prompt with the file paths and sends nothing: paste it into GitHub Copilot Chat, choose the model there, check the prompt, then send it.');
        expect(copyForTipText('Junie', 'the Junie tool window')).toBe('Copy for Junie copies the prompt with the file paths and sends nothing: paste it into the Junie tool window, choose the model there, check the prompt, then send it.');
    });
});
