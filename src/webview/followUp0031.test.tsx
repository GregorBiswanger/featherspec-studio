import { act, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { SendPromptPayload, SendResultEventPayload, SendView } from '../shared/protocol/assistant';
import type { NextStepView, SpecDetailView } from '../shared/protocol/detail';
import { sendMainName, sendOpenedName } from '../shared/protocol/assistantTexts';
import { planSample } from '../shared/protocol/testing/planSample';
import { App } from './App';
import { boardEvent, boardView, card } from './board/testing/views';
import { createClient, type ShellClient } from './client';
import { NextStep } from './detail/NextStep';
import { detailEvent, detailView } from './detail/testing/views';
import { baseView, click, mount, send, shellEvent, type Mounted } from './testing/dom';

let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

const KEY = '.specs/backlog/0002-x.md';
const CLARIFY = `/sdd-clarify ${KEY}`;
const PLAN = `/sdd-plan ${KEY}`;
const ATTACH = { name: '0002-x.md', path: KEY };
const FIRST: SendView = { assistant: 'copilot', target: 'new', targets: ['new', 'current'], attach: ATTACH };
const FOLLOW: SendView = { assistant: 'copilot', target: 'new', targets: ['new', 'current'], attach: ATTACH };
const FOLLOW_CLAUDE: SendView = { assistant: 'claudeCode', target: 'new', targets: ['new'], attach: ATTACH };
const COACH = 'Tip: Use any chat with a strong model, and allow web search.';
const FIRST_COACH = 'Tip: Use a new chat with a strong model.';
const noop = (): void => undefined;

function twoLines(options: { first?: SendView; follow?: SendView; coach?: string } = {}): NextStepView {
    return {
        rule: 'NS-9',
        lines: [
            { text: CLARIFY, intent: 'Have the spec challenged, then plan it' },
            { text: PLAN, intent: 'Then: write the plan', ...(options.follow === undefined ? {} : { send: options.follow }), ...(options.coach === undefined ? {} : { coach: options.coach }) },
        ],
        ...(options.first === undefined ? {} : { send: options.first, tips: { coach: FIRST_COACH, about: ['a', 'b', 'c', 'd'] } }),
    } as NextStepView;
}

interface Props {
    sendResult?: SendResultEventPayload;
    onSend?: (request: SendPromptPayload) => void;
    onCopy?: (text: string) => void;
}

async function renderStep(next: NextStepView, props: Props = {}): Promise<HTMLElement> {
    mounted = await mount(<NextStep nextStep={next} copyResult={undefined} onCopy={props.onCopy ?? noop} sendResult={props.sendResult} onSend={props.onSend ?? noop} />);
    return mounted.container;
}

function items(container: HTMLElement): HTMLElement[] {
    return [...container.querySelectorAll<HTMLElement>('.next-step-lines > li')];
}

describe('0031 AC-001: the follow-up line renders 0024\'s split button, secondary', () => {
    it('0031 AC-001 detail: the second line has a split button named by its own line, main part and menu', async () => {
        const container = await renderStep(twoLines({ first: FIRST, follow: FOLLOW, coach: COACH }));
        const [one, two] = items(container);
        expect(one!.querySelector('button.send-main')!.getAttribute('aria-label')).toBe(sendMainName('Copilot', 'new', CLARIFY, '0002-x.md'));
        const main = two!.querySelector('button.send-main')!;
        expect(main.getAttribute('aria-label')).toBe(sendMainName('Copilot', 'new', PLAN, '0002-x.md'));
        expect(main.getAttribute('title')).toBe(sendMainName('Copilot', 'new', PLAN, '0002-x.md'));
        expect(main.textContent).toBe('Send to Copilot');
        await click(two!.querySelector('button.send-arrow')!);
        const menu = [...container.querySelectorAll('[role="menuitemradio"], [role="menuitem"]')].map((item) => item.textContent);
        expect(menu).toEqual(['Send to a new chat', 'Send to the current chat', 'Copy prompt']);
    });

    it('0031 AC-001 Claude Code: new chat and Copy prompt only', async () => {
        const container = await renderStep(twoLines({ first: { ...FOLLOW_CLAUDE }, follow: FOLLOW_CLAUDE }));
        const two = items(container)[1]!;
        expect(two.querySelector('button.send-main')!.getAttribute('aria-label')).toBe(sendMainName('Claude Code', 'new', PLAN, '0002-x.md'));
        await click(two.querySelector('button.send-arrow')!);
        expect([...container.querySelectorAll('[role="menuitemradio"], [role="menuitem"]')].map((item) => item.textContent)).toEqual(['Send to a new chat', 'Copy prompt']);
    });

    it('0031 AC-001 the Plan map header renders the same split button', async () => {
        const client = createClient({ post: () => undefined });
        clients.push(client);
        client.start();
        mounted = await mount(<App client={client} />);
        const view = { ...(detailView({ stem: '0002-x', number: '0002' }, twoLines({ first: FIRST, follow: FOLLOW, coach: COACH })) as SpecDetailView), plan: planSample() };
        await send(shellEvent(baseView({ area: 'planMap', selection: { stem: '0002-x', number: '0002' } }), 1));
        await send(boardEvent(boardView([card('0002')], { planSpecs: [{ stem: '0002-x', number: '0002', title: view.title, problems: [] }] })));
        await send(detailEvent(view as never));
        const header = mounted.container.querySelector<HTMLElement>('.plan-map-header')!;
        const mains = [...header.querySelectorAll('button.send-main')];
        expect(mains.map((main) => main.getAttribute('aria-label'))).toEqual([sendMainName('Copilot', 'new', CLARIFY, '0002-x.md'), sendMainName('Copilot', 'new', PLAN, '0002-x.md')]);
        expect(header.querySelectorAll('.step-coach')).toHaveLength(2);
    });
});

describe('0031 AC-003: one primary, the follow-up is secondary', () => {
    it('0031 AC-003 the first line is primary, every follow-up send is secondary', async () => {
        const container = await renderStep(twoLines({ first: FIRST, follow: FOLLOW }));
        const [one, two] = items(container);
        expect(one!.querySelector('button.send-main')!.classList.contains('copy-secondary')).toBe(false);
        expect(two!.querySelector('button.send-main')!.classList.contains('copy-secondary')).toBe(true);
        expect(container.querySelectorAll('button.send-main:not(.copy-secondary)')).toHaveLength(1);
    });
});

describe('0031 AC-004: without an offer the follow-up line is today\'s', () => {
    it('0031 AC-004 a secondary Copy prompt and no Tip', async () => {
        const container = await renderStep(twoLines());
        const two = items(container)[1]!;
        expect(two.querySelector('button.send-main')).toBeNull();
        expect(two.querySelector('button.copy-button.copy-secondary.next-step-copy')).not.toBeNull();
        expect(two.querySelector('.step-coach')).toBeNull();
    });

    it('0031 AC-004 a follow-up line without its own send keeps Copy prompt and no Tip even next to a first-line Send', async () => {
        const container = await renderStep(twoLines({ first: FIRST }));
        const [one, two] = items(container);
        expect(one!.querySelector('.step-coach')!.textContent).toBe(FIRST_COACH);
        expect(two!.querySelector('button.send-main')).toBeNull();
        expect(two!.querySelector('button.copy-secondary')).not.toBeNull();
        expect(two!.querySelector('.step-coach')).toBeNull();
    });
});

describe('0031 AC-011: the follow-up Tip sits under its own button', () => {
    it('0031 AC-011 the coach of the line renders in its own item, the first line keeps its Tip', async () => {
        const container = await renderStep(twoLines({ first: FIRST, follow: FOLLOW, coach: COACH }));
        const [one, two] = items(container);
        expect(one!.querySelector('.step-coach')!.textContent).toBe(FIRST_COACH);
        const coach = two!.querySelector('.step-coach')!;
        expect(coach.textContent).toBe(COACH);
        expect(coach.previousElementSibling?.classList.contains('send-split')).toBe(true);
    });

    it('0031 AC-011 no coach field: no follow-up Tip renders although the line has a Send', async () => {
        const container = await renderStep(twoLines({ first: FIRST, follow: FOLLOW }));
        expect(items(container)[1]!.querySelector('.step-coach')).toBeNull();
    });
});

describe('0031 AC-005: feedback only on the button that was activated', () => {
    it('0031 AC-005 settling a follow-up send shows the feedback on its button only', async () => {
        const next = twoLines({ first: FIRST, follow: FOLLOW, coach: COACH });
        let settle: (result: SendResultEventPayload) => void = noop;
        const posted: SendPromptPayload[] = [];
        function Harness() {
            const [result, setResult] = useState<SendResultEventPayload | undefined>(undefined);
            settle = setResult;
            return <NextStep nextStep={next} copyResult={undefined} onCopy={noop} sendResult={result} onSend={(request) => void posted.push(request)} />;
        }
        mounted = await mount(<Harness />);
        const [one, two] = items(mounted.container);
        await click(two!.querySelector('button.send-main')!);
        expect(posted).toHaveLength(1);
        await act(async () => settle({ outcome: 'opened', text: 'Opened in Copilot', token: posted[0]!.token }));
        expect(two!.querySelector('button.send-main')!.getAttribute('aria-label')).toBe(sendOpenedName('Copilot', PLAN));
        expect(one!.querySelector('button.send-main')!.getAttribute('aria-label')).toBe(sendMainName('Copilot', 'new', CLARIFY, '0002-x.md'));
    });
});

describe('0031 AC-012: the menu items act on the follow-up line', () => {
    async function posts(menuText: string): Promise<{ sends: SendPromptPayload[]; copies: string[] }> {
        const sends: SendPromptPayload[] = [];
        const copies: string[] = [];
        const container = await renderStep(twoLines({ first: FIRST, follow: FOLLOW }), { onSend: (request) => void sends.push(request), onCopy: (text) => void copies.push(text) });
        await click(items(container)[1]!.querySelector('button.send-arrow')!);
        const item = [...container.querySelectorAll<HTMLElement>('[role="menuitemradio"], [role="menuitem"]')].find((candidate) => candidate.textContent === menuText)!;
        await click(item);
        return { sends, copies };
    }

    it('0031 AC-012 Send to a new chat', async () => {
        const { sends, copies } = await posts('Send to a new chat');
        expect(sends.map((request) => ({ target: request.target, line: request.line }))).toEqual([{ target: 'new', line: PLAN }]);
        expect(copies).toEqual([]);
    });

    it('0031 AC-012 Send to the current chat', async () => {
        const { sends } = await posts('Send to the current chat');
        expect(sends.map((request) => ({ target: request.target, line: request.line }))).toEqual([{ target: 'current', line: PLAN }]);
    });

    it('0031 AC-012 Copy prompt copies the line and sends nothing', async () => {
        const { sends, copies } = await posts('Copy prompt');
        expect(sends).toEqual([]);
        expect(copies).toEqual([PLAN]);
    });
});
