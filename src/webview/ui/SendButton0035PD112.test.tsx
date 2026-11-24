import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SendPromptPayload, SendResultEventPayload, SendView } from '../../shared/protocol/assistant';
import { SEND_ITEM_TEXT } from '../../shared/protocol/assistantTexts';
import { click, mount, type Mounted } from '../testing/dom';
import type { CopyResult } from './CopyButton';
import { SendButton } from './SendButton';

const REMOVED_LABEL = ['Copy', 'for'].join(' ');
const LINE = '/sdd-plan .specs/active/0001-tip-splitter.md';
const SPEC = { name: '0001-tip-splitter.md', path: '.specs/active/0001-tip-splitter.md' };
const VIEWS: ReadonlyArray<readonly [string, SendView]> = [
    ['Junie', { assistant: 'junie', terminal: true, target: 'current', targets: ['current', 'new'], attach: SPEC }],
    ['Claude Code', { assistant: 'claudeCode', terminal: true, target: 'current', targets: ['current', 'new'], attach: SPEC }],
    ['Copilot', { assistant: 'copilot', terminal: true, target: 'current', targets: ['current', 'new'], attach: SPEC }],
];

let mounted: Mounted | undefined;
let sent: SendPromptPayload[];
let copied: string[];
let deliverCopy: (result: CopyResult) => Promise<void>;
let deliverSend: (result: { outcome: SendResultEventPayload['outcome']; text: string }) => Promise<void>;

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

beforeEach(() => {
    vi.useFakeTimers();
    sent = [];
    copied = [];
});

afterEach(async () => {
    mounted?.unmount();
    mounted = undefined;
    await act(async () => {
        vi.advanceTimersByTime(60_000);
    });
    vi.useRealTimers();
});

describe('0035 PD-112 AC-050: the split button of each JetBrains Send', () => {
    for (const [name, view] of VIEWS) {
        it(`AC-050 ${name}: the main part reads Send to ${name}, and the menu holds the two targets and Copy prompt in this order`, async () => {
            const container = await show(view);
            expect(main(container).textContent).toBe(`Send to ${name}`);
            await click(arrow(container));
            expect(items(container).map((item) => item.textContent)).toEqual([SEND_ITEM_TEXT.current, SEND_ITEM_TEXT.new, 'Copy prompt']);
        });

        it(`AC-050 ${name}: no text of the button names the removed handover`, async () => {
            const container = await show(view);
            await click(arrow(container));
            expect(container.textContent).not.toContain(REMOVED_LABEL);
            expect(`${main(container).getAttribute('aria-label')}${main(container).getAttribute('title')}`).not.toContain(REMOVED_LABEL);
        });

        it(`AC-050 ${name}: Copy prompt asks for the line alone, sends no request and shows Copied`, async () => {
            const container = await show(view);
            await click(arrow(container));
            await click(items(container)[2]!);
            expect(copied).toEqual([LINE]);
            expect(sent).toEqual([]);
            await deliverCopy({ ok: true, text: 'Copied.' });
            expect(main(container).textContent).toBe('Copied');
        });

        it(`AC-031 ${name}: the main part sends once with the target of the view, then waits as Starting ${name}…`, async () => {
            const container = await show(view);
            await click(main(container));
            expect(sent).toEqual([expect.objectContaining({ assistant: view.assistant, target: 'current', line: LINE, attach: SPEC.path })]);
            expect(main(container).textContent).toBe(`Starting ${name}…`);
            expect(main(container).getAttribute('aria-busy')).toBe('true');
            await click(main(container));
            expect(sent).toHaveLength(1);
            await deliverSend({ outcome: 'opened', text: 'The prompt is in the chat.' });
            expect(main(container).textContent).toBe(`Opened in ${name}`);
        });

        it(`AC-035 ${name}: a main part aimed at a new chat sends the target new`, async () => {
            const container = await show({ ...view, target: 'new' });
            await click(main(container));
            expect(sent[0]?.target).toBe('new');
        });
    }

    it('negative control: a view without terminal does not wait, as VS Code never does', async () => {
        const container = await show({ assistant: 'junie', target: 'current', targets: ['current', 'new'] });
        await click(main(container));
        await click(main(container));
        expect(sent).toHaveLength(2);
        expect(main(container).hasAttribute('aria-busy')).toBe(false);
    });
});
