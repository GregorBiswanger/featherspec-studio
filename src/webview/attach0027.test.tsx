import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { NextStepView, SpecDetailView } from '../shared/protocol/detail';
import type { SelectedSpec } from '../shared/protocol/messages';
import type { OverviewRow, OverviewView } from '../shared/protocol/overview';
import type { SendView } from '../shared/protocol/assistant';
import { planSample } from '../shared/protocol/testing/planSample';
import { sampleView } from '../shared/protocol/testing/overviewSample';
import { App } from './App';
import { boardEvent, boardView } from './board/testing/views';
import { createClient, type ShellClient } from './client';
import { detailEvent, detailView } from './detail/testing/views';
import { baseView, click, mount, overviewEvent, send, shellEvent, type Mounted } from './testing/dom';

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

const COACH = 'Tip: Use a new chat with a strong model from another model family.';
const KEY = '.specs/backlog/0002-x.md';
const LINE = `/sdd-clarify ${KEY}`;
const TIPS = { coach: COACH, about: ['Effect.', 'Reasons.', 'Choose.', 'Settings.'] };
const STEP = { intent: 'Challenge', short: '/sdd-clarify', line: LINE, lines: [{ text: LINE, intent: 'Have the spec challenged' }] };
const FIRST: SelectedSpec = { stem: '0002-x', number: '0002' };
const ATTACH = { name: '0002-x.md', path: KEY };
const WITH: SendView = { assistant: 'copilot', target: 'new', targets: ['new', 'current'], attach: ATTACH };
const WITHOUT: SendView = { assistant: 'copilot', target: 'new', targets: ['new', 'current'] };
const CLAUDE: SendView = { assistant: 'claudeCode', target: 'new', targets: ['new'], attach: ATTACH };
const NAME_WITH = `Send to Copilot (new chat): ${LINE}. Attaches 0002-x.md.`;
const GONE = 'attached when sent';

function nextStepOf(sendView: SendView | undefined, tips = true): NextStepView {
    return { rule: 'NS-9', lines: [{ text: LINE, intent: 'Have the spec challenged' }], ...(tips ? { tips: TIPS } : {}), ...(sendView === undefined ? {} : { send: sendView }) } as NextStepView;
}

function row(sendView: SendView | undefined, tips = true): OverviewRow {
    return { spec: { stem: '0002-x', number: '0002', title: 'Row', found: true }, state: 'Active', status: 'Active', problems: 0, step: STEP, ...(tips ? { tips: TIPS } : {}), ...(sendView === undefined ? {} : { send: sendView }) };
}

function overview(sendView: SendView | undefined, tips = true): OverviewView {
    const result = sampleView();
    result.now = { rows: [row(sendView, tips)], more: 0, stems: ['0002-x'] };
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

async function showDetail(container: HTMLElement, next: NextStepView, plan = false): Promise<void> {
    const detail = detailView({ stem: '0002-x', number: '0002' }, next) as SpecDetailView;
    await send(detailEvent(plan ? { ...detail, plan: planSample() } : detail));
    expect(container).toBeDefined();
}

const lineOf = (root: ParentNode) => root.querySelector<HTMLElement>('.send-attach');

function noLine(root: HTMLElement): void {
    expect(lineOf(root)).toBeNull();
    expect(root.textContent).not.toContain(GONE);
}

function order(parent: Element): string[] {
    return [...parent.querySelectorAll(':scope > .send-split, :scope > .send-attach, :scope > .step-coach, :scope > .ov-coach')].map((element) => (element.classList.contains('send-split') ? 'split' : element.classList.contains('send-attach') ? 'line' : 'coach'));
}

describe('0027 AC-003: the line in the detail, the first Now row and the Plan map header', () => {
    it('detail: split button (with its status region), then the line, then the coach line', async () => {
        const container = await start('board', FIRST);
        await showDetail(container, nextStepOf(WITH));
        const li = container.querySelector('.next-step-lines li')!;
        expect(order(li)).toEqual(['split', 'coach']);
        const split = li.querySelector('.send-split')!;
        expect(split.lastElementChild!.getAttribute('role')).toBe('status');
        noLine(container);
        expect(split.nextElementSibling).toBe(li.querySelector('.step-coach'));
    });

    it('Plan map header: the same order and the same line', async () => {
        const container = await start('planMap', FIRST);
        await showDetail(container, nextStepOf(WITH), true);
        const header = container.querySelector('.plan-map-header')!;
        const li = header.querySelector('.next-step-lines li')!;
        expect(order(li)).toEqual(['split', 'coach']);
        noLine(header as HTMLElement);
        expect(container.querySelectorAll('.send-attach')).toHaveLength(0);
    });

    it('first Now row: the line follows the split button and precedes the coach line, a line of its own', async () => {
        const container = await start('overview', undefined, overview(WITH));
        const item = container.querySelector<HTMLElement>('[data-now] [data-spec-row="0002-x"]')!;
        expect(order(item)).toEqual(['split', 'coach']);
        noLine(item);
    });

    it('the first Now row keeps the line while its spec is selected and the coach line goes (the line belongs to the button, not to the advice)', async () => {
        const container = await start('overview', FIRST, overview(WITH));
        const item = container.querySelector<HTMLElement>('[data-now] [data-spec-row="0002-x"]')!;
        expect(item.querySelector('.ov-coach')).toBeNull();
        expect(order(item)).toEqual(['split']);
        noLine(item);
    });

    it('Claude Code renders the same line with its own name in the tooltip', async () => {
        const container = await start('board', FIRST);
        await showDetail(container, nextStepOf(CLAUDE));
        noLine(container);
        expect(container.querySelector('button.send-main')!.getAttribute('title')).toBe(`Send to Claude Code (new chat): ${LINE}. Attaches 0002-x.md.`);
    });

    it('with Show Step Tips off (no tips) the line renders the same, in every place', async () => {
        const container = await start('board', FIRST);
        await showDetail(container, nextStepOf(WITH, true));
        const withTips = container.querySelector('button.send-main')!.outerHTML;
        noLine(container);
        reset();
        const hidden = await start('board', FIRST);
        await showDetail(hidden, nextStepOf(WITH, false));
        noLine(hidden);
        expect(hidden.querySelector('button.send-main')!.outerHTML).toBe(withTips);
        reset();
        const now = await start('overview', undefined, overview(WITH, false));
        noLine(now);
    });

    it('the line is unchanged while a Send is pending and while its feedback shows; the main part and each Send item are described by it', async () => {
        const container = await start('board', FIRST);
        await showDetail(container, nextStepOf(WITH));
        const main = container.querySelector<HTMLButtonElement>('button.send-main')!;
        expect(main.hasAttribute('aria-describedby')).toBe(false);
        expect(main.getAttribute('aria-label')).toBe(NAME_WITH);
        await click(main);
        noLine(container);
        await click(container.querySelector('button.send-arrow')!);
        const items = [...container.querySelectorAll('[role="menuitemradio"]')];
        expect(items).toHaveLength(2);
        items.forEach((item) => expect(item.hasAttribute('aria-describedby')).toBe(false));
        expect(container.querySelector('[role="menuitem"]')!.hasAttribute('aria-describedby')).toBe(false);
    });
});

describe('0027 AC-002, AC-003: no attachment, no line and no description', () => {
    it('a view without an attachment renders no line and no aria-describedby in the detail, the first Now row and the map header', async () => {
        const board = await start('board', FIRST);
        await showDetail(board, nextStepOf(WITHOUT));
        expect(board.querySelector('.send-attach')).toBeNull();
        expect(board.querySelector('.send-split [aria-describedby]')).toBeNull();
        reset();
        const now = await start('overview', undefined, overview(WITHOUT));
        expect(now.querySelector('.send-attach')).toBeNull();
        expect(now.querySelector('.send-split [aria-describedby]')).toBeNull();
        reset();
        const map = await start('planMap', FIRST);
        await showDetail(map, nextStepOf(WITHOUT), true);
        expect(map.querySelector('.send-attach')).toBeNull();
    });

    it('a Copy prompt without an offer renders no line', async () => {
        const board = await start('board', FIRST);
        await showDetail(board, nextStepOf(undefined));
        expect(board.querySelector('.send-attach')).toBeNull();
        expect(board.querySelector('.send-split')).toBeNull();
    });

    it('negative control: a line rendered before the split button would break the order check', () => {
        const wrong = document.createElement('li');
        wrong.innerHTML = '<p class="send-attach"></p><span class="send-split"></span><p class="step-coach"></p>';
        expect(order(wrong)).toEqual(['line', 'split', 'coach']);
        expect(order(wrong)).not.toEqual(['split', 'line', 'coach']);
    });
});
