import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SendPromptPayload, SendResultEventPayload, SendView } from '../../shared/protocol/assistant';
import { waitsForStart } from '../../shared/protocol/assistant';
import { sendOpenedLabel, sendStartingLabel, sendStartingName } from '../../shared/protocol/assistantTexts';
import { click, mount, type Mounted } from '../testing/dom';
import { SendButton } from './SendButton';

const LINE = '/sdd-plan .specs/active/0001-tip-splitter.md';
const OTHER = 'Implement T-002 of .specs/active/0001-tip-splitter.plan.md';
const SPEC = { name: '0001-tip-splitter.md', path: '.specs/active/0001-tip-splitter.md' };
const TERMINAL_VIEW: SendView = { assistant: 'claudeCode', target: 'current', targets: ['current', 'new'], attach: SPEC };
const VS_CODE_CLAUDE: SendView = { assistant: 'claudeCode', target: 'new', targets: ['new'], attach: SPEC };
const VS_CODE_SEND_TO_OTHER: SendView = { assistant: 'copilot', target: 'new', targets: ['new', 'current'], attach: SPEC };
const COPY_FOR: SendView = { assistant: 'junie', handover: 'copyFor', target: 'new', targets: ['new'] };
const IDLE_NAME = `Send to Claude Code (current chat): ${LINE}. Attaches ${SPEC.name}.`;

let mounted: Mounted | undefined;
let sent: SendPromptPayload[];
let deliver: (result: { outcome: SendResultEventPayload['outcome']; text: string }, token?: string) => Promise<void>;

function Harness(props: { views: SendView[]; lines?: string[] }) {
    const [sendResult, setSendResult] = useState<SendResultEventPayload | undefined>(undefined);
    deliver = async (next, token) => {
        await act(async () => {
            setSendResult({ ...next, token: token ?? sent[sent.length - 1]?.token ?? 'none-0' });
        });
    };
    return (
        <div>
            {props.views.map((view, index) => (
                <SendButton key={index} send={view} line={props.lines?.[index] ?? LINE} sendResult={sendResult} onSend={(request) => void sent.push(request)} copyResult={undefined} onCopy={() => undefined} />
            ))}
        </div>
    );
}

async function show(views: SendView[], lines?: string[]): Promise<HTMLElement> {
    mounted = await mount(<Harness views={views} lines={lines} />);
    return mounted.container;
}

const mains = (container: HTMLElement) => [...container.querySelectorAll<HTMLButtonElement>('button.send-main')];
const main = (container: HTMLElement) => mains(container)[0]!;
const arrow = (container: HTMLElement) => container.querySelector<HTMLButtonElement>('button.send-arrow')!;
const items = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
const live = (container: HTMLElement) => container.querySelector<HTMLElement>('[role="status"]')!;

beforeEach(() => {
    vi.useFakeTimers();
    sent = [];
});

afterEach(async () => {
    if (mounted !== undefined) {
        await deliver({ outcome: 'copied', text: 'x' }, 'none-0');
    }
    mounted?.unmount();
    mounted = undefined;
    await act(async () => {
        vi.advanceTimersByTime(60_000);
    });
    vi.useRealTimers();
});

describe('0035 amendment 2026-11-23 / AC-031: Send to Claude Code in JetBrains waits for its start', () => {
    it('AC-031 the texts of section 7 are literal', () => {
        expect(sendStartingLabel('Claude Code')).toBe('Starting Claude Code…');
        expect(sendStartingName('Claude Code', LINE)).toBe(`Starting Claude Code: ${LINE}`);
    });

    it('AC-031 only the JetBrains terminal handover waits: Send to Claude Code with the target current', () => {
        expect(waitsForStart(TERMINAL_VIEW)).toBe(true);
        for (const view of [VS_CODE_CLAUDE, VS_CODE_SEND_TO_OTHER, COPY_FOR, { assistant: 'claudeCode', target: 'new', targets: ['current', 'new'] } as SendView]) {
            expect(waitsForStart(view), JSON.stringify(view)).toBe(view.targets.includes('current') && view.assistant === 'claudeCode' && view.handover === undefined);
        }
        expect(waitsForStart(VS_CODE_CLAUDE)).toBe(false);
        expect(waitsForStart(VS_CODE_SEND_TO_OTHER)).toBe(false);
        expect(waitsForStart(COPY_FOR)).toBe(false);
    });

    it('AC-031 while the Send runs the main part is aria-disabled and aria-busy, never disabled, and keeps the focus', async () => {
        const container = await show([TERMINAL_VIEW]);
        expect(main(container).textContent).toBe('Send to Claude Code');
        expect(main(container).hasAttribute('aria-disabled')).toBe(false);
        expect(main(container).hasAttribute('aria-busy')).toBe(false);
        main(container).focus();
        await click(main(container));
        expect(sent).toHaveLength(1);
        expect(main(container).getAttribute('aria-disabled')).toBe('true');
        expect(main(container).getAttribute('aria-busy')).toBe('true');
        expect(main(container).hasAttribute('disabled')).toBe(false);
        expect(main(container).textContent).toBe('Starting Claude Code…');
        expect(main(container).getAttribute('aria-label')).toBe(`Starting Claude Code: ${LINE}`);
        expect(main(container).getAttribute('title')).toBe(`Starting Claude Code: ${LINE}`);
        expect(document.activeElement).toBe(main(container));
        expect(live(container).textContent).toBe(`Starting Claude Code: ${LINE}`);
    });

    it('AC-031 a second click during the wait sends and types nothing, by mouse and by the menu items', async () => {
        const container = await show([TERMINAL_VIEW]);
        await click(main(container));
        await click(main(container));
        await click(main(container));
        expect(sent).toHaveLength(1);
        await click(arrow(container));
        const targets = items(container).filter((item) => item.getAttribute('role') === 'menuitemradio');
        expect(targets.map((item) => item.textContent)).toEqual(['Send to the current chat', 'Send to a new chat']);
        for (const item of targets) {
            expect(item.getAttribute('aria-disabled')).toBe('true');
            await click(item);
        }
        expect(sent).toHaveLength(1);
        const copyItem = items(container).find((item) => item.getAttribute('role') === 'menuitem')!;
        expect(copyItem.hasAttribute('aria-disabled')).toBe(false);
    });

    it('AC-031 the same line in a second place waits as well; another line does not', async () => {
        const container = await show([TERMINAL_VIEW, TERMINAL_VIEW, TERMINAL_VIEW], [LINE, LINE, OTHER]);
        await click(mains(container)[0]!);
        expect(mains(container).map((button) => button.getAttribute('aria-busy'))).toEqual(['true', 'true', null]);
        await click(mains(container)[1]!);
        expect(sent).toHaveLength(1);
        await click(mains(container)[2]!);
        expect(sent.map((request) => request.line)).toEqual([LINE, OTHER]);
    });

    it('AC-031 the answer opened ends the wait: Opened in Claude Code, then the label again, and the next click sends', async () => {
        const container = await show([TERMINAL_VIEW]);
        await click(main(container));
        await deliver({ outcome: 'opened', text: 'The prompt is in Claude Code\'s chat. Check it, then send it there.' });
        expect(main(container).textContent).toBe(sendOpenedLabel('Claude Code'));
        expect(main(container).hasAttribute('aria-busy')).toBe(false);
        expect(main(container).hasAttribute('aria-disabled')).toBe(false);
        await act(async () => {
            vi.advanceTimersByTime(5000);
        });
        expect(main(container).textContent).toBe('Send to Claude Code');
        expect(main(container).getAttribute('aria-label')).toBe(IDLE_NAME);
        await click(main(container));
        expect(sent).toHaveLength(2);
    });

    it('AC-031 the answer copied (the warning) ends the wait as well', async () => {
        const container = await show([TERMINAL_VIEW]);
        await click(main(container));
        await deliver({ outcome: 'copied', text: 'Copied.' });
        expect(main(container).textContent).toBe('Copied');
        expect(main(container).hasAttribute('aria-busy')).toBe(false);
        await act(async () => {
            vi.advanceTimersByTime(5000);
        });
        await click(main(container));
        expect(sent).toHaveLength(2);
    });

    it('AC-031 no answer at all frees the button after the budget of the core and a margin', async () => {
        const container = await show([TERMINAL_VIEW]);
        await click(main(container));
        await act(async () => {
            vi.advanceTimersByTime(20_000);
        });
        expect(main(container).getAttribute('aria-busy')).toBe('true');
        await act(async () => {
            vi.advanceTimersByTime(10_000);
        });
        expect(main(container).hasAttribute('aria-busy')).toBe(false);
        await click(main(container));
        expect(sent).toHaveLength(2);
    });

    it('AC-031 VS Code and every other handover are unchanged: two clicks send twice, no aria-busy or aria-disabled ever', async () => {
        for (const view of [VS_CODE_CLAUDE, VS_CODE_SEND_TO_OTHER, COPY_FOR]) {
            sent = [];
            const container = await show([view]);
            const before = container.innerHTML;
            await click(main(container));
            expect(main(container).hasAttribute('aria-busy'), view.assistant).toBe(false);
            expect(main(container).hasAttribute('aria-disabled'), view.assistant).toBe(false);
            expect(main(container).textContent, view.assistant).not.toContain('Starting');
            expect(container.innerHTML, view.assistant).toBe(before);
            await click(main(container));
            expect(sent, view.assistant).toHaveLength(2);
            mounted?.unmount();
            mounted = undefined;
        }
    });
});
