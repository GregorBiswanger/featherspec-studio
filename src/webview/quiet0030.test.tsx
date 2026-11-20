import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SendView } from '../shared/protocol/assistant';
import type { NextStepView, SpecDetailView } from '../shared/protocol/detail';
import type { SelectedSpec } from '../shared/protocol/messages';
import type { OverviewRow, OverviewView } from '../shared/protocol/overview';
import { planSample } from '../shared/protocol/testing/planSample';
import { sampleView } from '../shared/protocol/testing/overviewSample';
import { App } from './App';
import { boardEvent, boardView } from './board/testing/views';
import { createClient, type ShellClient } from './client';
import { detailEvent, detailView } from './detail/testing/views';
import { baseView, click, mount, overviewEvent, send, shellEvent, type Mounted } from './testing/dom';
import { StepAction } from './ui/StepAction';

let mounted: Mounted | undefined;
const clients: ShellClient[] = [];
let seq: number;

beforeEach(() => {
    seq = 0;
});

function reset(): void {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
}

afterEach(reset);

const KEY = '.specs/backlog/0002-x.md';
const LINE = `/sdd-clarify ${KEY}`;
const STEP = { intent: 'Challenge', short: '/sdd-clarify', line: LINE, lines: [{ text: LINE, intent: 'Have the spec challenged, then plan it' }] };
const FIRST: SelectedSpec = { stem: '0002-x', number: '0002' };
const ATTACH = { name: '0002-x.md', path: KEY };
const WITH: SendView = { assistant: 'copilot', target: 'new', targets: ['new', 'current'], attach: ATTACH };
const WITHOUT: SendView = { assistant: 'copilot', target: 'new', targets: ['new', 'current'] };
const CLAUDE: SendView = { assistant: 'claudeCode', target: 'new', targets: ['new'], attach: ATTACH };
const NAME_WITH = `Send to Copilot (new chat): ${LINE}. Attaches 0002-x.md.`;
const NAME_WITHOUT = `Send to Copilot (new chat): ${LINE}`;

function nextStepOf(sendView: SendView | undefined): NextStepView {
    return { rule: 'NS-9', lines: [{ text: LINE, intent: 'Have the spec challenged, then plan it' }], ...(sendView === undefined ? {} : { send: sendView }) } as NextStepView;
}

function overview(sendView: SendView): OverviewView {
    const result = sampleView();
    const row: OverviewRow = { spec: { stem: '0002-x', number: '0002', title: 'Row', found: true }, state: 'Active', status: 'Active', problems: 0, step: STEP, send: sendView };
    result.now = { rows: [row], more: 0, stems: ['0002-x'] };
    return result;
}

async function start(area: 'overview' | 'planMap' | 'board', selection: SelectedSpec | undefined, view?: OverviewView): Promise<HTMLElement> {
    const client = createClient({ post: () => undefined });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    seq += 1;
    await send(shellEvent(baseView({ area, selection }), seq));
    if (view !== undefined) {
        await send(overviewEvent(view));
    }
    await send(boardEvent(boardView([])));
    return mounted.container;
}

async function showDetail(next: NextStepView, plan = false): Promise<void> {
    const detail = detailView({ stem: '0002-x', number: '0002' }, next) as SpecDetailView;
    await send(detailEvent(plan ? { ...detail, plan: planSample() } : detail));
}

function quiet(container: HTMLElement): void {
    expect(container.querySelector('.send-attach')).toBeNull();
    expect(container.textContent).not.toContain('attached when sent');
    expect(container.querySelector('.send-split [aria-describedby]')).toBeNull();
    expect(container.querySelector('.send-main')).not.toBeNull();
}

describe('0030 AC-006: a Send view with an attachment renders no attachment line', () => {
    it('0030 AC-006 detail: no line, no description, the Send request still carries attach', async () => {
        const posted: unknown[] = [];
        const client = createClient({ post: (message) => void posted.push(message) });
        clients.push(client);
        client.start();
        mounted = await mount(<App client={client} />);
        seq += 1;
        await send(shellEvent(baseView({ area: 'board', selection: FIRST }), seq));
        await send(boardEvent(boardView([])));
        await showDetail(nextStepOf(WITH));
        const container = mounted.container;
        quiet(container);
        await click(container.querySelector<HTMLButtonElement>('button.send-main')!);
        const request = posted.map((message) => message as { type?: string; payload?: unknown }).find((message) => message.type === 'sendPrompt');
        expect(request?.payload).toMatchObject({ assistant: 'copilot', target: 'new', line: LINE, attach: KEY });
    });

    it('0030 AC-006 first Now row: no line, no description', async () => {
        const container = await start('overview', undefined, overview(WITH));
        quiet(container);
        expect(container.querySelector('[data-now] [data-spec-row="0002-x"] button.send-main')).not.toBeNull();
    });

    it('0030 AC-006 Plan map header: no line, no description', async () => {
        const container = await start('planMap', FIRST);
        await showDetail(nextStepOf(WITH), true);
        quiet(container.querySelector<HTMLElement>('.plan-map-header')!);
    });
});

describe('0030 AC-007: the main part names the attachment, the menu items keep their names', () => {
    const noop = (): void => undefined;

    it('0030 AC-007 with an attachment the main part is named and titled with the attached file', async () => {
        mounted = await mount(<StepAction send={WITH} look="primary" line={LINE} copyResult={undefined} onCopy={noop} sendResult={undefined} onSend={noop} />);
        const main = mounted.container.querySelector('button.send-main')!;
        expect(main.getAttribute('aria-label')).toBe(NAME_WITH);
        expect(main.getAttribute('title')).toBe(NAME_WITH);
        expect(main.textContent).toBe('Send to Copilot');
    });

    it('0030 AC-007 Claude Code names itself and the file in the same form', async () => {
        mounted = await mount(<StepAction send={CLAUDE} look="primary" line={LINE} copyResult={undefined} onCopy={noop} sendResult={undefined} onSend={noop} />);
        expect(mounted.container.querySelector('button.send-main')!.getAttribute('aria-label')).toBe(`Send to Claude Code (new chat): ${LINE}. Attaches 0002-x.md.`);
    });

    it('0030 AC-007 the menu items keep today\'s names and carry no aria-describedby', async () => {
        mounted = await mount(<StepAction send={WITH} look="primary" line={LINE} copyResult={undefined} onCopy={noop} sendResult={undefined} onSend={noop} />);
        await click(mounted.container.querySelector('button.send-arrow')!);
        const items = [...mounted.container.querySelectorAll('[role="menuitemradio"], [role="menuitem"]')];
        expect(items.map((item) => item.textContent)).toEqual(['Send to a new chat', 'Send to the current chat', 'Copy prompt']);
        items.forEach((item) => expect(item.hasAttribute('aria-describedby')).toBe(false));
        expect(items.every((item) => !item.hasAttribute('aria-label'))).toBe(true);
    });

    it('0030 AC-007 without an attachment the name and tooltip are today\'s', async () => {
        mounted = await mount(<StepAction send={WITHOUT} look="primary" line={LINE} copyResult={undefined} onCopy={noop} sendResult={undefined} onSend={noop} />);
        const main = mounted.container.querySelector('button.send-main')!;
        expect(main.getAttribute('aria-label')).toBe(NAME_WITHOUT);
        expect(main.getAttribute('title')).toBe(NAME_WITHOUT);
        expect(mounted.container.querySelector('[aria-describedby]')).toBeNull();
    });
});
