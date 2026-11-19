import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SpecDetailView } from '../../../shared/protocol/detail';
import type { Envelope } from '../../../shared/protocol/envelope';
import { NARROW_QUERY } from '../../../shared/protocol/layout';
import type { SelectedSpec } from '../../../shared/protocol/messages';
import type { PlanSpecView, PlanView } from '../../../shared/protocol/planMap';
import { planSample, stage, step } from '../../../shared/protocol/testing/planSample';
import { App } from '../../App';
import { boardEvent, boardView, card } from '../../board/testing/views';
import { createClient, type ShellClient } from '../../client';
import { copyResultEvent, detailEvent, detailView, PLAN_KEY } from '../../detail/testing/views';
import { COPIED_TEXT } from '../../../shared/protocol/nextStepTexts';
import { baseView, click, mount, send, shellEvent, type Mounted } from '../../testing/dom';

let posted: Envelope[];
let mounted: Mounted | undefined;
let seq: number;
const clients: ShellClient[] = [];

const original = window.matchMedia;
let narrow: boolean;

beforeEach(() => {
    posted = [];
    seq = 0;
    narrow = false;
    window.matchMedia = ((query: string) => ({
        get matches() {
            return query === NARROW_QUERY && narrow;
        },
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
    window.matchMedia = original;
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

function spec(number: string, overrides: Partial<PlanSpecView> = {}): PlanSpecView {
    return { stem: `${number}-thing`, number, title: `Thing ${number}`, problems: [], ...overrides };
}

const LIST: PlanSpecView[] = [spec('0003'), spec('0007'), spec('0009', { problems: [{ sentence: 'Its plan link points to a file that is missing.', reason: 'plan link x points to a missing file' }] })];

function selected(number: string): SelectedSpec {
    return { stem: `${number}-thing`, number };
}

async function start(): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    return mounted.container;
}

async function show(options: { selection?: SelectedSpec; detail?: SpecDetailView | { kind: 'none' }; planSpecs?: PlanSpecView[] } = {}): Promise<HTMLElement> {
    const container = mounted?.container ?? (await start());
    seq += 1;
    await send(shellEvent(baseView({ area: 'planMap', selection: options.selection }), seq));
    await send(boardEvent(boardView([card('0003'), card('0007')], { planSpecs: options.planSpecs ?? LIST })));
    if (options.detail !== undefined) {
        await send(detailEvent(options.detail));
    }
    return container;
}

function detailWith(plan: SpecDetailView['plan'] | undefined, overrides: Partial<SpecDetailView> = {}): SpecDetailView {
    const view = detailView(overrides) as SpecDetailView;
    const { plan: _plan, ...rest } = view;
    return plan === undefined ? rest : { ...rest, plan };
}

function requests(type: string): unknown[] {
    return posted.filter((message) => message.type === type).map((message) => message.payload);
}

function map(container: HTMLElement): HTMLElement {
    return container.querySelector<HTMLElement>('[data-plan-map]')!;
}

function buttons(container: HTMLElement): HTMLButtonElement[] {
    return [...map(container).querySelectorAll<HTMLButtonElement>('button[data-spec-stem]')];
}

describe('0023 AC-007: the Plan map shows a state when it has no plan to show, and the specs that have one', () => {
    it('no spec selected: the sentence and the list of specs with a plan, one button each, in the order of the board view', async () => {
        const container = await show();
        expect(container.querySelector('h1')?.textContent).toBe('Plan map');
        expect(map(container).textContent).toContain('Select a spec with a plan to see its stages.');
        expect(map(container).querySelector('h3')?.textContent).toBe('Specs with a plan');
        expect(buttons(container).map((button) => button.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['0003 Thing 0003', '0007 Thing 0007', '0009 Thing 0009']);
    });

    it('a Done spec, a spec without a plan and a spec with an unreadable plan each name their state, then the list', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(undefined, { state: 'Done' }) });
        expect(map(container).textContent).toContain('0007 is done.');
        expect(buttons(container)).toHaveLength(3);
        await show({ selection: selected('0007'), detail: detailWith(undefined, { state: 'Backlog' }) });
        expect(map(container).textContent).toContain('0007 has no plan yet.');
        expect(map(container).textContent).not.toContain('is done.');
        await show({ selection: selected('0007'), detail: detailWith({ kind: 'unreadable' }) });
        expect(map(container).textContent).toContain('0007: Studio cannot read its plan');
        expect(buttons(container)).toHaveLength(3);
    });

    it('without a spec that has a plan there is no "Specs with a plan" and no button', async () => {
        const container = await show({ planSpecs: [] });
        expect(map(container).textContent).toContain('Select a spec with a plan to see its stages.');
        expect(map(container).querySelector('h3')).toBeNull();
        expect(buttons(container)).toEqual([]);
        expect(map(container).textContent).not.toContain('Specs with a plan');
    });

    it('a spec with a Problem carries the warning with its sentence as tooltip and description on its button', async () => {
        const container = await show();
        const [first, , third] = buttons(container);
        expect(first!.querySelector('svg[data-icon="diagnostic"]')).toBeNull();
        expect(third!.querySelector('svg[data-icon="diagnostic"]')).not.toBeNull();
        expect(third!.title).toContain('Its plan link points to a file that is missing.');
        const described = third!.getAttribute('aria-describedby');
        expect(document.getElementById(described!)?.textContent).toContain('Its plan link points to a file that is missing.');
    });

    it('a button selects its spec, keeps the tab, and the map heading takes the focus once the spec shows', async () => {
        const container = await show();
        await click(buttons(container)[1]!);
        expect(requests('select')).toEqual([{ stem: '0007-thing' }]);
        expect(requests('navigate')).toEqual([]);
        await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        expect(container.querySelector('h1')?.textContent).toBe('Plan map');
        const heading = map(container).querySelector<HTMLElement>('[data-map-heading]')!;
        expect(heading.textContent).toContain('0007');
        expect(document.activeElement).toBe(heading);
    });

    it('a selection that changes in the tree, the Overview or the Board shows the new spec in the tab', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        expect(map(container).querySelector('[data-map-heading]')?.textContent).toContain('Thing 0007');
        await show({ selection: selected('0003'), detail: detailWith(planSample(), { stem: '0003-thing', number: '0003', title: 'Thing 0003', key: '.specs/active/0003-thing.md' }) });
        expect(map(container).querySelector('[data-map-heading]')?.textContent).toContain('Thing 0003');
    });

    it('a selected spec whose detail has not arrived shows its number alone, with the list', async () => {
        const container = await show({ selection: selected('0003') , detail: detailWith(planSample()) });
        await show({ selection: selected('0009') });
        expect(map(container).querySelector('[data-map-heading]')).toBeNull();
        expect(map(container).textContent).toContain('0009');
        expect(buttons(container)).toHaveLength(3);
    });
});

describe('0023 AC-008: the header of the Plan map', () => {
    it('shows number and title, the count, the link to the plan and the plan\'s closing line whole', async () => {
        const closing = 'Parallel: stage 2 (add vs. subtract: separate files) — and a very long reason that the side panel would cut at eighty characters but the map shows whole.';
        const plan: PlanView = planSample({ closing: { text: closing, short: 'cut', full: closing } });
        const container = await show({ selection: selected('0007'), detail: detailWith(plan) });
        const header = map(container).querySelector<HTMLElement>('.plan-map-header')!;
        expect(header.querySelector('h2')?.textContent).toBe('0007 Thing 0007');
        expect(header.querySelector('.progress-text')?.textContent).toBe('2 of 5 done · 40%');
        expect(header.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('2');
        expect(header.querySelector('.plan-map-closing')?.textContent).toBe(`The plan says: ${closing}`);
        const link = [...header.querySelectorAll<HTMLButtonElement>('button.file-link')].find((button) => button.textContent === 'Open plan')!;
        await click(link);
        expect(requests('openFile')).toEqual([{ key: PLAN_KEY, line: 1 }]);
    });

    it('formats inline Markdown of the closing line and shows no closing paragraph without one', async () => {
        const plan = planSample({ closing: { text: 'Parallel: stage 2 — **separate** `files`.', short: 'x', full: 'x' } });
        const container = await show({ selection: selected('0007'), detail: detailWith(plan) });
        const closing = map(container).querySelector('.plan-map-closing')!;
        expect(closing.querySelector('strong')?.textContent).toBe('separate');
        expect(closing.querySelector('code')?.textContent).toBe('files');
        const { closing: _closing, ...without } = planSample();
        await show({ selection: selected('0007'), detail: detailWith(without as PlanView) });
        expect(map(container).querySelector('.plan-map-closing')).toBeNull();
    });

    it('a plan without a countable step says so instead of a count', async () => {
        const { count: _count, ...without } = planSample();
        const container = await show({ selection: selected('0007'), detail: detailWith(without as PlanView) });
        expect(map(container).querySelector('.plan-map-header')?.textContent).toContain('No steps in the plan');
        expect(map(container).querySelector('[role="progressbar"]')).toBeNull();
    });

    it('a spec with a Problem shows the warning at its heading, its sentences as tooltip and description', async () => {
        const problems = [{ sentence: 'Its plan link points to a file that is missing.', reason: 'plan link x points to a missing file' }];
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample(), { problems }) });
        const mark = map(container).querySelector<HTMLElement>('.plan-map-header [data-marker="problems"]')!;
        expect(mark.textContent).toContain('1 problem');
        expect(mark.title).toBe('Its plan link points to a file that is missing.');
        expect(document.getElementById(mark.getAttribute('aria-describedby')!)?.textContent).toBe('Its plan link points to a file that is missing.');
        await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        expect(map(container).querySelector('[data-marker="problems"]')).toBeNull();
    });
});

describe('0023 AC-007: below 900 px the map shows alone, from 900 px the side panel stands beside it', () => {
    it('stubbed query: from 900 px the side panel and the divider are beside the map', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        expect(container.querySelector('aside.side-panel')).not.toBeNull();
        expect(container.querySelector('.area-frame')?.getAttribute('data-layout')).toBeNull();
        expect(container.querySelector('aside.side-panel button.detail-back')).toBeNull();
    });

    it('stubbed query: below 900 px no detail, no back button, no inert content; the map is shown whole', async () => {
        narrow = true;
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        expect(container.querySelector('aside.side-panel')).toBeNull();
        expect(container.querySelector('button.detail-back')).toBeNull();
        expect(container.querySelector('.area-frame')?.getAttribute('data-layout')).toBeNull();
        expect(container.querySelector('.area-content')?.hasAttribute('inert')).toBe(false);
        expect(map(container).querySelector('[data-map-heading]')?.textContent).toContain('Thing 0007');
    });

    it('closing the side panel beside the map shows the list and puts the focus on that spec\'s button', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        const close = container.querySelector<HTMLButtonElement>('aside.side-panel button[aria-label*="Close"]')!;
        await act(async () => close.focus());
        await click(close);
        expect(requests('clearSelection')).toHaveLength(1);
        await show({ selection: undefined });
        expect(map(container).textContent).toContain('Select a spec with a plan to see its stages.');
        expect(container.querySelector('aside.side-panel')).toBeNull();
        expect(document.activeElement).toBe(buttons(container).find((button) => button.getAttribute('data-spec-stem') === '0007-thing'));
    });
});

function stageRow(container: HTMLElement, number: number | string): HTMLElement {
    return map(container).querySelector<HTMLElement>(`[data-stage-row="${number}"]`)!;
}

function cardOf(container: HTMLElement, id: string): HTMLElement {
    return map(container).querySelector<HTMLElement>(`[data-step-card="${id}"]`)!;
}

function squeezed(element: Element | null): string {
    return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('0023 AC-008: stage rows and step cards', () => {
    it('every stage is a row with "Stage <n> — <description>" and its kind line; a single-step stage has no kind line', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        expect([...map(container).querySelectorAll('.plan-stage-heading')].map((heading) => heading.textContent)).toEqual(['Stage 1 — stage 1', 'Stage 2 — stage 2', 'Stage 3 — stage 3']);
        expect(stageRow(container, 1).querySelector('.plan-stage-kind')?.textContent).toBe('→ in order: each step builds on the one before');
        expect(stageRow(container, 2).querySelector('.plan-stage-kind')?.textContent).toBe('⇉ can run in parallel: the steps share no file');
        expect(stageRow(container, 3).querySelector('.plan-stage-kind')).toBeNull();
        expect(stageRow(container, 2).hasAttribute('data-current')).toBe(true);
    });

    it('a mixed stage says it is partly parallel; groups stack in line order with an arrow between them', async () => {
        const plan = planSample({
            stages: [
                stage(1, [{ steps: [step('T-001', 'open'), step('T-002', 'open')] }, { sep: '→', steps: [step('T-003', 'open')] }], { current: true }),
            ],
        });
        const container = await show({ selection: selected('0007'), detail: detailWith(plan) });
        expect(stageRow(container, 1).querySelector('.plan-stage-kind')?.textContent).toBe('⇉ partly in parallel');
        const row = stageRow(container, 1);
        expect([...row.querySelectorAll('.plan-group')].map((group) => [...group.querySelectorAll('[data-step-card]')].map((card) => card.getAttribute('data-step-card')))).toEqual([['T-001', 'T-002'], ['T-003']]);
        expect(row.querySelectorAll('.plan-arrow')).toHaveLength(1);
        expect(row.querySelector('.plan-arrow')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('a finished stage shows chips and no cards; an unfinished stage shows a card per step', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        expect(stageRow(container, 1).querySelectorAll('[data-step-card]')).toHaveLength(0);
        expect(stageRow(container, 1).querySelectorAll('[data-step-chip]')).toHaveLength(2);
        expect([...stageRow(container, 2).querySelectorAll('[data-step-card]')].map((card) => card.getAttribute('data-step-card'))).toEqual(['T-003', 'T-004']);
        expect(stageRow(container, 3).querySelectorAll('[data-step-card]')).toHaveLength(1);
    });

    it('a card shows the symbol, the ID, the title, Files without code marks and Covers as links', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        const card = cardOf(container, 'T-003');
        const toggle = card.querySelector<HTMLButtonElement>('button[data-card-toggle]')!;
        expect(squeezed(toggle)).toContain('T-003 Step T-003');
        expect(squeezed(card.querySelector('.step-card-files'))).toBe('Files src/add.ts, src/add.test.ts');
        expect(card.querySelector('code')).toBeNull();
        expect(squeezed(card.querySelector('.step-card-covers'))).toContain('Covers AC-001');
        const link = [...card.querySelectorAll<HTMLButtonElement>('button.file-link')].find((button) => button.textContent === 'AC-001')!;
        await click(link);
        expect(requests('openFile')).toEqual([{ key: '.specs/active/0007-thing.md', line: 12 }]);
        expect(cardOf(container, 'T-004').querySelector('.step-card-covers')?.textContent).toContain('AC-002');
        expect(cardOf(container, 'T-004').querySelector('.step-card-covers button')).toBeNull();
    });

    it('the head is a disclosure: collapsed shows no Do and Verify, expanded shows them with an Open in plan link', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        const card = cardOf(container, 'T-003');
        const toggle = card.querySelector<HTMLButtonElement>('button[data-card-toggle]')!;
        const panel = document.getElementById(toggle.getAttribute('aria-controls')!)!;
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(panel.hidden).toBe(true);
        await click(toggle);
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(panel.hidden).toBe(false);
        expect(squeezed(panel)).toContain('Do Add.');
        expect(squeezed(panel)).toContain('Verify npm test -- add');
        const open = [...panel.querySelectorAll<HTMLButtonElement>('button.file-link')].find((button) => button.textContent === 'Open in plan')!;
        await click(open);
        expect(requests('openFile')).toContainEqual({ key: '.specs/active/0007-thing.plan.md', line: 43 });
        await click(toggle);
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
    });

    it('a returned step names its return, blocked with its reason; the stage counts how many returned', async () => {
        const plan = planSample({
            stages: [
                stage(
                    1,
                    [
                        {
                            steps: [
                                step('T-001', 'returned', { returned: { status: 'done' } }),
                                step('T-002', 'returned', { returned: { status: 'blocked', reason: 'no access', reasonFull: 'no access to the file' } }),
                                step('T-003', 'returned', { returned: { status: 'unknown' } }),
                                step('T-004', 'returned', { returned: { status: 'blocked' } }),
                            ],
                        },
                    ],
                    { current: true, returned: '4 returned, T-002, T-004 blocked: the next step finds out what blocks.' },
                ),
            ],
        });
        const container = await show({ selection: selected('0007'), detail: detailWith(plan) });
        expect(['T-001', 'T-002', 'T-003', 'T-004'].map((id) => cardOf(container, id).querySelector('.step-card-returned')?.textContent)).toEqual([
            'Returned · done',
            'Returned · blocked: no access',
            'Returned · status unknown',
            'Returned · blocked',
        ]);
        expect(stageRow(container, 1).querySelector('.plan-stage-returned')?.textContent).toBe('4 returned, T-002, T-004 blocked: the next step finds out what blocks.');
        const all = planSample({ stages: [stage(1, [{ steps: [step('T-001', 'returned', { returned: { status: 'done' } })] }], { current: true, returned: '1 returned, waiting to be integrated: the next step integrates them.' })] });
        await show({ selection: selected('0007'), detail: detailWith(all) });
        expect(stageRow(container, 1).querySelector('.plan-stage-returned')?.textContent).toBe('1 returned, waiting to be integrated: the next step integrates them.');
    });

    it('0025 AC-015: each stage row holding a returned step shows the identical sentence and no M-16 or M-17', async () => {
        const sentence = '2 returned, T-004 blocked: the next step finds out what blocks.';
        const plan = planSample({
            returned: sentence,
            stages: [
                stage(1, [{ steps: [step('T-001', 'returned', { returned: { status: 'done' } }), step('T-002', 'returned', { returned: { status: 'blocked' } })] }], { current: true, returned: sentence }),
                stage(2, [{ steps: [step('T-003', 'open')] }]),
            ],
        });
        const container = await show({ selection: selected('0007'), detail: detailWith(plan) });
        expect(stageRow(container, 1).querySelector('.plan-stage-returned')?.textContent).toBe(sentence);
        expect(stageRow(container, 2).querySelector('.plan-stage-returned')).toBeNull();
        expect(map(container).textContent).not.toMatch(/steps returned|All steps returned/);
    });

    it('a card says its state in words for assistive technology, and the symbol is left out of the reading', async () => {
        const plan = planSample({
            stages: [
                stage(1, [{ steps: [step('T-001', 'done'), step('T-002', 'next'), step('T-003', 'open'), step('T-004', 'returned', { returned: { status: 'blocked' } }), step('T-005', 'returned', { returned: { status: 'done' } }), step('T-006', 'dropped')] }, { sep: '→', steps: [step('T-007', 'open')] }], {
                    current: true,
                }),
            ],
        });
        const container = await show({ selection: selected('0007'), detail: detailWith(plan) });
        const heads = ['T-001', 'T-002', 'T-003', 'T-004', 'T-005', 'T-006'].map((id) => cardOf(container, id).querySelector<HTMLElement>('button[data-card-toggle]')!);
        expect(heads.map((head) => head.querySelector('.visually-hidden')?.textContent)).toEqual([', done', ', next', ', open', ', returned, blocked', ', returned', ', dropped']);
        expect(heads.map((head) => squeezed(head))).toEqual([
            'T-001 Step T-001, done',
            'T-002 Step T-002, next',
            'T-003 Step T-003, open',
            'T-004 Step T-004, returned, blocked',
            'T-005 Step T-005, returned',
            'T-006 Step T-006, dropped',
        ]);
        expect(heads.slice(0, 5).every((head) => head.querySelector('svg')?.getAttribute('aria-hidden') === 'true')).toBe(true);
    });

    it('0025 AC-014: a card draws the motif of its state as an aria-hidden SVG, none of the old symbols, and keeps the state word', async () => {
        const plan = planSample({
            stages: [stage(1, [{ steps: [step('T-001', 'done'), step('T-002', 'next'), step('T-003', 'open'), step('T-004', 'returned', { returned: { status: 'blocked' } }), step('T-005', 'returned', { returned: { status: 'done' } }), step('T-006', 'dropped')] }], { current: true })],
        });
        const container = await show({ selection: selected('0007'), detail: detailWith(plan) });
        const heads = ['T-001', 'T-002', 'T-003', 'T-004', 'T-005', 'T-006'].map((id) => cardOf(container, id).querySelector<HTMLElement>('button[data-card-toggle]')!);
        expect(heads.map((head) => head.querySelector('svg')?.getAttribute('data-motif') ?? null)).toEqual(['check', 'debug-stackframe', 'circle-large-outline', 'circle-slash', 'reply', null]);
        expect(heads.slice(0, 5).every((head) => head.querySelector('svg')?.getAttribute('aria-hidden') === 'true')).toBe(true);
        expect(map(container).textContent).not.toMatch(/[✓◐○↩⊘]/);
        expect(heads.map((head) => head.querySelector('.visually-hidden')?.textContent)).toEqual([', done', ', next', ', open', ', returned, blocked', ', returned', ', dropped']);
    });

    it('a dropped step keeps its card with the ID struck through; no other state strikes it', async () => {
        const plan = planSample({ stages: [stage(1, [{ steps: [step('T-001', 'dropped'), step('T-002', 'open')] }], { current: true })] });
        const container = await show({ selection: selected('0007'), detail: detailWith(plan) });
        expect(cardOf(container, 'T-001').querySelector('.step-card-id s')?.textContent).toBe('T-001');
        expect(cardOf(container, 'T-002').querySelector('.step-card-id s')).toBeNull();
        expect(cardOf(container, 'T-002').querySelector('.step-card-id')?.textContent).toBe('T-002');
    });

    it('a blocked card shows the short reason and carries the full reason as its tooltip; a reason without a full text has no tooltip', async () => {
        const plan = planSample({
            stages: [
                stage(
                    1,
                    [
                        {
                            steps: [
                                step('T-001', 'returned', { returned: { status: 'blocked', reason: 'no access to the …', reasonFull: 'no access to the shared drive for the build agent' } }),
                                step('T-002', 'returned', { returned: { status: 'blocked' } }),
                                step('T-003', 'returned', { returned: { status: 'done' } }),
                            ],
                        },
                    ],
                    { current: true },
                ),
            ],
        });
        const container = await show({ selection: selected('0007'), detail: detailWith(plan) });
        const returned = (id: string): HTMLElement => cardOf(container, id).querySelector<HTMLElement>('.step-card-returned')!;
        expect(returned('T-001').textContent).toBe('Returned · blocked: no access to the …');
        expect(returned('T-001').getAttribute('title')).toBe('no access to the shared drive for the build agent');
        expect(returned('T-002').hasAttribute('title')).toBe(false);
        expect(returned('T-003').hasAttribute('title')).toBe(false);
    });

    it('steps outside a stage line sit in a "Not in a stage" row; a plan without stages stacks its cards without heading or kind', async () => {
        const staged = planSample({ stages: [stage(1, [{ steps: [step('T-001', 'open')] }], { current: true })], loose: [step('T-009', 'open')] });
        const container = await show({ selection: selected('0007'), detail: detailWith(staged) });
        expect(stageRow(container, 'loose').querySelector('h3')?.textContent).toBe('Not in a stage');
        expect(cardOf(container, 'T-009')).not.toBeNull();
        const flat = planSample({ staged: false, stages: [], loose: [step('T-001', 'next'), step('T-002', 'open')] });
        await show({ selection: selected('0007'), detail: detailWith(flat) });
        expect(map(container).querySelector('.plan-stage-heading')).toBeNull();
        expect(map(container).querySelector('.plan-stage-kind')).toBeNull();
        expect([...map(container).querySelectorAll('[data-step-card]')].map((card) => card.getAttribute('data-step-card'))).toEqual(['T-001', 'T-002']);
    });

    it('a step the plan does not know is a plain chip, not a card: no disclosure, no empty panel, no stop in the arrow grid', async () => {
        const plan = planSample({
            stages: [stage(1, [{ steps: [step('T-003', 'next'), step('T-099', 'notFound', { open: undefined, title: '' })] }, { sep: '→', steps: [step('T-004', 'open')] }], { current: true })],
        });
        const container = await show({ selection: selected('0007'), detail: detailWith(plan) });
        expect([...map(container).querySelectorAll('[data-step-card]')].map((entry) => entry.getAttribute('data-step-card'))).toEqual(['T-003', 'T-004']);
        expect(map(container).querySelector('[data-card-toggle="T-099"]')).toBeNull();
        expect(map(container).querySelectorAll('.step-card-more')).toHaveLength(2);
        const chip = stageRow(container, 1).querySelector<HTMLElement>('[data-step-chip][data-state="notFound"]')!;
        expect(chip.tagName).toBe('SPAN');
        expect(chip.textContent).toBe('T-099, not in the steps');
        expect(chip.closest('[data-step-card]')).toBeNull();
        await act(async () => cardOf(container, 'T-003').querySelector<HTMLButtonElement>('button[data-card-toggle]')!.focus());
        await act(async () => {
            document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
        });
        expect(document.activeElement).toBe(cardOf(container, 'T-003').querySelector('button[data-card-toggle]'));
    });

    it('the expansion and the ways state reset with another spec, also when its selection and detail arrive in one render', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        await click(cardOf(container, 'T-003').querySelector<HTMLButtonElement>('button[data-card-toggle]')!);
        await click(waysOf(container)!.querySelector<HTMLButtonElement>('.plan-ways-toggle')!);
        const other = detailWith(planSample(), { stem: '0003-thing', number: '0003', title: 'Thing 0003', key: '.specs/active/0003-thing.md' });
        seq += 1;
        const view = shellEvent(baseView({ area: 'planMap', selection: selected('0003') }), seq);
        const together = detailEvent(other);
        await act(async () => {
            window.dispatchEvent(new MessageEvent('message', { data: view }));
            window.dispatchEvent(new MessageEvent('message', { data: together }));
        });
        expect(map(container).querySelector('[data-map-heading]')?.getAttribute('data-map-stem')).toBe('0003-thing');
        expect(cardOf(container, 'T-003').querySelector('button[data-card-toggle]')?.getAttribute('aria-expanded')).toBe('false');
        expect(waysOf(container)!.querySelector('.plan-ways-toggle')?.getAttribute('aria-expanded')).toBe('false');
    });

    it('an ID that stands in two stages is two cards: opening one opens only it, and it stays open through an update', async () => {
        const twice = planSample({
            stages: [
                stage(2, [{ steps: [step('T-003', 'next'), step('T-004', 'open')] }], { current: true }),
                stage(3, [{ steps: [step('T-004', 'open'), step('T-005', 'open')] }]),
            ],
        });
        const container = await show({ selection: selected('0007'), detail: detailWith(twice) });
        const heads = (): HTMLButtonElement[] => [...map(container).querySelectorAll<HTMLButtonElement>('[data-card-toggle="T-004"]')];
        expect(heads()).toHaveLength(2);
        await click(heads()[1]!);
        expect(heads().map((entry) => entry.getAttribute('aria-expanded'))).toEqual(['false', 'true']);
        expect(heads().map((entry) => document.getElementById(entry.getAttribute('aria-controls')!)!.hidden)).toEqual([true, false]);
        await show({ selection: selected('0007'), detail: detailWith({ ...twice, count: { done: 3, total: 5 } }) });
        expect(heads().map((entry) => entry.getAttribute('aria-expanded'))).toEqual(['false', 'true']);
        await click(heads()[0]!);
        expect(heads().map((entry) => entry.getAttribute('aria-expanded'))).toEqual(['true', 'true']);
    });

    it('the expansion belongs to the step ID: it survives an update of the plan and resets with another spec', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        await click(cardOf(container, 'T-003').querySelector<HTMLButtonElement>('button[data-card-toggle]')!);
        await show({ selection: selected('0007'), detail: detailWith(planSample({ count: { done: 3, total: 5 } })) });
        expect(cardOf(container, 'T-003').querySelector('button[data-card-toggle]')?.getAttribute('aria-expanded')).toBe('true');
        await show({ selection: selected('0003'), detail: detailWith(planSample(), { stem: '0003-thing', number: '0003', title: 'Thing 0003', key: '.specs/active/0003-thing.md' }) });
        expect(cardOf(container, 'T-003').querySelector('button[data-card-toggle]')?.getAttribute('aria-expanded')).toBe('false');
    });
});

function waysOf(container: HTMLElement, number: number | string = 2): HTMLElement | null {
    return stageRow(container, number).querySelector<HTMLElement>('[data-ways]');
}

const radioOf = (container: HTMLElement, index: number): HTMLInputElement => waysOf(container)!.querySelectorAll<HTMLInputElement>('input[type="radio"]')[index]!;

const SEQUENCE = 'Implement the whole stage 2 of .specs/active/0007-thing.plan.md in sequence';
const SUBAGENTS = 'Implement the whole stage 2 of .specs/active/0007-thing.plan.md with subagents';
const OTHERS = 'Implement the whole stage 2 of .specs/active/0007-thing.plan.md with other agents';

describe('0023 AC-009: the ways of the current stage', () => {
    it('the ways block stands after the cards of the current stage only, collapsed on every showing', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        expect(map(container).querySelectorAll('[data-ways]')).toHaveLength(1);
        expect(waysOf(container, 1)).toBeNull();
        expect(waysOf(container, 3)).toBeNull();
        const block = waysOf(container)!;
        const toggle = block.querySelector<HTMLButtonElement>('.plan-ways-toggle')!;
        expect(toggle.textContent).toBe('Ways to run stage 2');
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(block.querySelector<HTMLElement>('.plan-ways-body')!.hidden).toBe(true);
        expect(stageRow(container, 2).lastElementChild).toBe(block);
        await click(toggle);
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        await show({ selection: selected('0003'), detail: detailWith(planSample(), { stem: '0003-thing', number: '0003', title: 'Thing 0003', key: '.specs/active/0003-thing.md' }) });
        expect(waysOf(container)!.querySelector('.plan-ways-toggle')?.getAttribute('aria-expanded')).toBe('false');
    });

    it('0026 AC-009 (0023 AC-009 retargeted): expanded, the three ways are radios with their lines and the checked way\'s prompt; the start lines come with Other agents', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        const block = waysOf(container)!;
        await click(block.querySelector<HTMLButtonElement>('.plan-ways-toggle')!);
        expect(block.querySelector('.plan-ways-lead')).toBeNull();
        expect([...block.querySelectorAll('label.plan-way')].map((way) => way.textContent)).toEqual([
            'In sequence · default — One chat builds the steps one after another.',
            'Subagents — The chat hands each step to a subagent; subagents cannot ask you.',
            'Other agents — Each step runs in another chat or worktree from its start line.',
        ]);
        expect([...block.querySelectorAll('.plan-way-prompt code')].map((code) => code.textContent)).toEqual([SEQUENCE]);
        expect(block.querySelector('.plan-start-lines')).toBeNull();
        await click(radioOf(container, 2));
        expect(block.querySelector('.plan-start-lead')?.textContent).toBe('Start lines — commit first: a worktree holds committed files only.');
        expect([...block.querySelectorAll('.plan-start-lines code')].map((code) => code.textContent)).toEqual([
            'Implement T-003 of .specs/active/0007-thing.plan.md as a parallel worker.',
            'Implement T-004 of .specs/active/0007-thing.plan.md as a parallel worker.',
        ]);
    });

    it('a stage view without start lines (Ready) shows the three ways and, with Other agents checked, its stage prompt and no start line', async () => {
        const base = planSample();
        const plan = planSample({ stages: base.stages.map((entry) => (entry.ways === undefined ? entry : { ...entry, ways: { ...entry.ways, startLines: [] } })) });
        const container = await show({ selection: selected('0007'), detail: detailWith(plan) });
        await click(waysOf(container)!.querySelector<HTMLButtonElement>('.plan-ways-toggle')!);
        expect(waysOf(container)!.querySelectorAll('.plan-way')).toHaveLength(3);
        await click(radioOf(container, 2));
        expect(waysOf(container)!.querySelector('.plan-start-lines')).toBeNull();
        expect(waysOf(container)!.querySelector('.plan-way-prompt code')?.textContent).toBe(OTHERS);
        expect(map(container).textContent).not.toContain('parallel worker');
    });

    it('no stage carries ways in a plan without the view for them', async () => {
        const base = planSample();
        const plan = planSample({ stages: base.stages.map(({ ways: _ways, ...entry }) => entry as typeof entry) });
        const container = await show({ selection: selected('0007'), detail: detailWith(plan) });
        expect(map(container).querySelector('[data-ways]')).toBeNull();
        expect(map(container).textContent).not.toContain('Ways to run');
    });
});

describe('0022 AC-015 as 0023 §4 amends it: the map breaks long paths', () => {
    it('a way\'s prompt and a start line may break after a path separator, and their text stays whole', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        await click(waysOf(container)!.querySelector<HTMLButtonElement>('.plan-ways-toggle')!);
        const prompts: Array<{ text: string | null; breaks: boolean }> = [];
        for (const index of [0, 1]) {
            await click(radioOf(container, index));
            const code = waysOf(container)!.querySelector<HTMLElement>('.plan-way-prompt code')!;
            prompts.push({ text: code.textContent, breaks: code.querySelectorAll('wbr').length > 0 });
        }
        await click(radioOf(container, 2));
        const lines = [...waysOf(container)!.querySelectorAll<HTMLElement>('.plan-start-lines code')];
        expect(prompts.map((entry) => entry.text)).toEqual([SEQUENCE, SUBAGENTS]);
        expect(lines.map((code) => code.textContent)).toEqual(['Implement T-003 of .specs/active/0007-thing.plan.md as a parallel worker.', 'Implement T-004 of .specs/active/0007-thing.plan.md as a parallel worker.']);
        expect([...prompts.map((entry) => entry.breaks), ...lines.map((code) => code.querySelectorAll('wbr').length > 0)]).toEqual([true, true, true, true]);
    });

    it('the Files of a card may break after a path separator, and the paths stay whole', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        const files = cardOf(container, 'T-003').querySelector<HTMLElement>('.step-card-files')!;
        expect([...files.querySelectorAll('.step-card-file')].map((file) => file.textContent)).toEqual(['src/add.ts', ', src/add.test.ts']);
        expect([...files.querySelectorAll('.step-card-file')].map((file) => file.querySelectorAll('wbr').length > 0)).toEqual([true, true]);
    });
});

describe('0023 AC-010: the Copy buttons of the map', () => {
    async function openWays(): Promise<HTMLElement> {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        await click(waysOf(container)!.querySelector<HTMLButtonElement>('.plan-ways-toggle')!);
        return container;
    }

    it('each way, once checked, has a secondary Copy prompt that copies the prompt alone and shows the feedback of 0021', async () => {
        const container = await openWays();
        await click(radioOf(container, 1));
        const buttons = [...waysOf(container)!.querySelectorAll<HTMLButtonElement>('.plan-way-prompt > button.copy-button')];
        expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([`Copy prompt: ${SUBAGENTS}`]);
        expect(buttons.every((button) => button.classList.contains('copy-secondary'))).toBe(true);
        expect(buttons[0]!.textContent).toBe('Copy prompt');
        await click(buttons[0]!);
        expect(requests('copyText')).toEqual([{ text: SUBAGENTS }]);
        await send(copyResultEvent(true, COPIED_TEXT));
        expect(buttons[0]!.textContent).toBe('Copied');
        expect(buttons[0]!.parentElement!.querySelector('[role="status"]')?.textContent).toBe('Copied to the clipboard.');
    });

    it('each start line has an icon Copy named "Copy prompt: <line>" that copies the line, with Other agents checked', async () => {
        const container = await openWays();
        await click(radioOf(container, 2));
        const icons = [...waysOf(container)!.querySelectorAll<HTMLButtonElement>('.plan-start-lines button.copy-icon')];
        expect(icons.map((button) => button.getAttribute('aria-label'))).toEqual([
            'Copy prompt: Implement T-003 of .specs/active/0007-thing.plan.md as a parallel worker.',
            'Copy prompt: Implement T-004 of .specs/active/0007-thing.plan.md as a parallel worker.',
        ]);
        await click(icons[0]!);
        expect(requests('copyText')).toEqual([{ text: 'Implement T-003 of .specs/active/0007-thing.plan.md as a parallel worker.' }]);
    });

    it('the map renders no primary button below its header, with the ways open', async () => {
        const container = await openWays();
        const primary = [...map(container).querySelectorAll('button.copy-button')].filter((button) => !button.classList.contains('copy-secondary') && button.closest('.plan-map-header') === null);
        expect(primary).toEqual([]);
    });
});

describe('0023 AC-012: the map follows the files', () => {
    async function update(plan: PlanView): Promise<void> {
        await send(detailEvent(detailWith(plan)));
    }

    it('a new return note shows its state on the card and the count of the stage, and keeps expanded cards and the ways block', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        await click(cardOf(container, 'T-004').querySelector<HTMLButtonElement>('button[data-card-toggle]')!);
        await click(waysOf(container)!.querySelector<HTMLButtonElement>('.plan-ways-toggle')!);
        const base = planSample();
        const changed = planSample({
            stages: base.stages.map((entry) =>
                entry.number !== 2
                    ? entry
                    : {
                          ...entry,
                          returned: '1 of 2 returned · T-003 not back yet',
                          groups: [{ steps: [entry.groups[0]!.steps[0]!, { ...entry.groups[0]!.steps[1]!, state: 'returned' as const, returned: { status: 'blocked' as const, reason: 'no access' } }] }],
                      },
            ),
        });
        await update(changed);
        expect(cardOf(container, 'T-004').getAttribute('data-state')).toBe('returned');
        expect(cardOf(container, 'T-004').querySelector('.step-card-returned')?.textContent).toBe('Returned · blocked: no access');
        expect(stageRow(container, 2).querySelector('.plan-stage-returned')?.textContent).toBe('1 of 2 returned · T-003 not back yet');
        expect(cardOf(container, 'T-004').querySelector('button[data-card-toggle]')?.getAttribute('aria-expanded')).toBe('true');
        expect(waysOf(container)!.querySelector('.plan-ways-toggle')?.getAttribute('aria-expanded')).toBe('true');
        await update(planSample());
        expect(cardOf(container, 'T-004').querySelector('.step-card-returned')).toBeNull();
        expect(stageRow(container, 2).querySelector('.plan-stage-returned')).toBeNull();
    });

    it('a focused card keeps the focus through an update', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        const head = cardOf(container, 'T-004').querySelector<HTMLButtonElement>('button[data-card-toggle]')!;
        await act(async () => head.focus());
        await update(planSample({ count: { done: 3, total: 5 } }));
        expect(document.activeElement).toBe(cardOf(container, 'T-004').querySelector('button[data-card-toggle]'));
    });

    it('a focused card that leaves hands the focus to the card at its place, else to the heading of the map', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        await act(async () => cardOf(container, 'T-004').querySelector<HTMLButtonElement>('button[data-card-toggle]')!.focus());
        const base = planSample();
        const without = planSample({
            stages: base.stages.map((entry) => (entry.number === 2 ? { ...entry, groups: [{ steps: [entry.groups[0]!.steps[0]!] }] } : entry)),
        });
        await update(without);
        expect(cardOf(container, 'T-004')).toBeNull();
        expect(document.activeElement).toBe(cardOf(container, 'T-003').querySelector('button[data-card-toggle]'));
        const finished = planSample({ stages: [stage(1, [{ steps: [step('T-001', 'done')] }])] });
        await update(finished);
        expect(map(container).querySelector('[data-step-card]')).toBeNull();
        expect(document.activeElement).toBe(map(container).querySelector('[data-map-heading]'));
    });

    function withoutWays(): PlanView {
        const base = planSample();
        return planSample({
            stages: base.stages.map((entry) => {
                if (entry.number !== 2) {
                    return entry;
                }
                const { ways: _ways, ...rest } = entry;
                return {
                    ...rest,
                    returned: '1 of 2 returned · T-003 not back yet',
                    groups: [{ steps: [entry.groups[0]!.steps[0]!, { ...entry.groups[0]!.steps[1]!, state: 'returned' as const, returned: { status: 'done' as const } }] }],
                };
            }),
        });
    }

    async function openWays(): Promise<HTMLElement> {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        await click(waysOf(container)!.querySelector<HTMLButtonElement>('.plan-ways-toggle')!);
        return container;
    }

    it('PD-077: a focused start-line Copy whose ways block goes with a return note hands the focus to the heading of the map', async () => {
        const container = await openWays();
        await click(radioOf(container, 2));
        const copy = waysOf(container)!.querySelector<HTMLButtonElement>('.plan-start-lines button.copy-icon')!;
        await act(async () => copy.focus());
        expect(document.activeElement).toBe(copy);
        await update(withoutWays());
        expect(waysOf(container)).toBeNull();
        expect(document.activeElement).toBe(map(container).querySelector('[data-map-heading]'));
    });

    it('PD-077: the same for a way\'s Copy and for the toggle of the ways block', async () => {
        const container = await openWays();
        await act(async () => waysOf(container)!.querySelector<HTMLButtonElement>('.plan-way-prompt > button.copy-button')!.focus());
        await update(withoutWays());
        expect(document.activeElement).toBe(map(container).querySelector('[data-map-heading]'));
        await update(planSample());
        await click(waysOf(container)!.querySelector<HTMLButtonElement>('.plan-ways-toggle')!);
        await act(async () => waysOf(container)!.querySelector<HTMLButtonElement>('.plan-ways-toggle')!.focus());
        await update(withoutWays());
        expect(document.activeElement).toBe(map(container).querySelector('[data-map-heading]'));
    });

    it('0026 AC-013: a focused radio or the (?) of the ways block goes with a return note: the focus goes to the heading of the map', async () => {
        for (const pick of ['input[type="radio"]', 'button.toggletip']) {
            const container = await openWays();
            await act(async () => waysOf(container)!.querySelector<HTMLElement>(pick)!.focus());
            await update(withoutWays());
            expect(waysOf(container), pick).toBeNull();
            expect(document.activeElement, pick).toBe(map(container).querySelector('[data-map-heading]'));
            await update(planSample());
        }
    });

    it('PD-077: a start line whose step returns takes the focus to the heading even while the ways block stays', async () => {
        const container = await openWays();
        await click(radioOf(container, 2));
        const lines = [...waysOf(container)!.querySelectorAll<HTMLButtonElement>('.plan-start-lines button.copy-icon')];
        await act(async () => lines[1]!.focus());
        const base = planSample();
        const shorter = planSample({
            stages: base.stages.map((entry) =>
                entry.number === 2 && entry.ways !== undefined ? { ...entry, ways: { ...entry.ways, startLines: entry.ways.startLines.slice(0, 1) } } : entry,
            ),
        });
        await update(shorter);
        expect(waysOf(container)).not.toBeNull();
        expect(waysOf(container)!.querySelectorAll('.plan-start-lines button.copy-icon')).toHaveLength(1);
        expect(document.activeElement).toBe(map(container).querySelector('[data-map-heading]'));
    });

    it('a focused Copy that still exists keeps the focus through an update, and the ways stay open', async () => {
        const container = await openWays();
        await click(radioOf(container, 2));
        await act(async () => waysOf(container)!.querySelector<HTMLButtonElement>('.plan-start-lines button.copy-icon')!.focus());
        await update(planSample({ count: { done: 3, total: 5 } }));
        expect(document.activeElement).toBe(waysOf(container)!.querySelector('.plan-start-lines button.copy-icon'));
        expect(waysOf(container)!.querySelector('.plan-ways-toggle')?.getAttribute('aria-expanded')).toBe('true');
    });

    it('a focus outside the cards is left where it is', async () => {
        const container = await show({ selection: selected('0007'), detail: detailWith(planSample()) });
        const heading = map(container).querySelector<HTMLElement>('[data-map-heading]')!;
        await act(async () => heading.focus());
        await update(planSample({ stages: [stage(1, [{ steps: [step('T-001', 'done')] }])] }));
        expect(document.activeElement).toBe(heading);
    });
});
