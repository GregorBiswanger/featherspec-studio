import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../shared/protocol/envelope';
import type { SpecDetailView } from '../../shared/protocol/detail';
import type { PlanView } from '../../shared/protocol/planMap';
import { planSample, stage, step } from '../../shared/protocol/testing/planSample';
import { App } from '../App';
import { boardEvent, boardView, card } from '../board/testing/views';
import { createClient, type ShellClient } from '../client';
import { baseView, click, mount, send, shellEvent, type Mounted } from '../testing/dom';
import { resetSectionMemory } from './sectionMemory';
import { fileNotFoundText } from '../../shared/protocol/texts';
import { detailEvent, detailView, openFileResultEvent, PLAN_KEY } from './testing/views';

let posted: Envelope[];
let mounted: Mounted | undefined;
let seq: number;
const clients: ShellClient[] = [];

beforeEach(() => {
    posted = [];
    seq = 0;
});

afterEach(() => {
    resetSectionMemory();
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

function detailWith(plan: SpecDetailView['plan'] | undefined, overrides: Partial<SpecDetailView> = {}): SpecDetailView {
    const view = detailView(overrides) as SpecDetailView;
    const { plan: _plan, ...rest } = view;
    return plan === undefined ? rest : { ...rest, plan };
}

async function open(plan: SpecDetailView['plan'] | undefined, overrides: Partial<SpecDetailView> = {}, area: 'board' | 'planMap' = 'board'): Promise<HTMLElement> {
    const container = mounted?.container ?? (await start());
    seq += 1;
    await send(shellEvent(baseView({ area, selection: { stem: '0007-thing', number: '0007' } }), seq));
    await send(boardEvent(boardView([card('0007')], { planSpecs: [{ stem: '0007-thing', number: '0007', title: 'Thing 0007', problems: [] }] })));
    await send(detailEvent(detailWith(plan, overrides)));
    return container;
}

async function start(): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    return mounted.container;
}

function sectionOf(container: HTMLElement, title: string): HTMLElement | undefined {
    const heading = [...container.querySelectorAll('aside h3')].find((candidate) => candidate.textContent === title);
    return heading?.closest('section') ?? undefined;
}

function requests(type: string): unknown[] {
    return posted.filter((message) => message.type === type).map((message) => message.payload);
}

function shown(element: Element): string {
    const clone = element.cloneNode(true) as Element;
    clone.querySelectorAll('.visually-hidden').forEach((hidden) => hidden.remove());
    return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function chips(root: Element): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>('[data-step-chip]')];
}

const PROBLEM = [{ sentence: 'Its plan link points to a file that is missing.', reason: 'plan link x points to a missing file' }];

describe('0023 AC-003: the Plan section of the side panel', () => {
    it('stands after Next step and Problems and before Progress, with the count and no Steps row in Progress', async () => {
        const container = await open(planSample(), { problems: PROBLEM });
        const plan = sectionOf(container, 'Plan')!;
        const next = sectionOf(container, 'Next step')!;
        const progress = sectionOf(container, 'Progress')!;
        const problems = container.querySelector('aside ul.detail-problems')!;
        const follows = (first: Node, second: Node) => (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
        expect(follows(next, problems)).toBe(true);
        expect(follows(problems, plan)).toBe(true);
        expect(follows(plan, progress)).toBe(true);
        expect(plan.querySelector('.progress-text')?.textContent).toBe('2 of 5 done · 40%');
        expect(progress.textContent).not.toContain('Steps');
        expect(progress.textContent).not.toContain('Next open step');
        expect(progress.textContent).toContain('Criteria');
    });

    it('0025 AC-015: while a return note lies, the sentence of U-05 stands under the count, once', async () => {
        const sentence = '1 of 2 returned · T-004 not back yet';
        const container = await open({ ...planSample(), returned: sentence });
        const plan = sectionOf(container, 'Plan')!;
        expect(plan.querySelectorAll('.plan-returned')).toHaveLength(1);
        expect(plan.querySelector('.plan-returned')?.textContent).toBe(sentence);
        expect(plan.querySelector('.progress')!.nextElementSibling).toBe(plan.querySelector('.plan-returned'));
    });

    it('is absent without a plan and for an unreadable plan, where Progress keeps its Steps row', async () => {
        const without = await open(undefined);
        expect(sectionOf(without, 'Plan')).toBeUndefined();
        expect(sectionOf(without, 'Progress')!.textContent).toContain('Next open step');
        const unreadable = await open({ kind: 'unreadable' });
        expect(sectionOf(unreadable, 'Plan')).toBeUndefined();
        expect(sectionOf(unreadable, 'Progress')!.textContent).toContain('Steps');
    });

    it('shows the closing line cut as short text with the whole line as tooltip, and none without a closing line', async () => {
        const full = 'Parallel: stage 2 — T-003 and T-004 touch separate files and share no type, so they may run side by side.';
        const container = await open(planSample({ closing: { text: full, short: 'Parallel: stage 2 — T-003 and T-004 touch separate files and share no type, so…', full } }));
        const line = sectionOf(container, 'Plan')!.querySelector<HTMLElement>('.plan-closing')!;
        expect(line.textContent).toBe('The plan says: Parallel: stage 2 — T-003 and T-004 touch separate files and share no type, so…');
        expect(line.title).toBe(`The plan says: ${full}`);
        const { closing: _closing, ...without } = planSample();
        const bare = await open(without as PlanView);
        expect(sectionOf(bare, 'Plan')!.querySelector('.plan-closing')).toBeNull();
    });

    it('says "No steps in the plan" for a plan with no countable step', async () => {
        const { count: _count, ...without } = planSample({ stages: [stage(1, [{ steps: [step('T-099', 'notFound', { open: undefined, title: '' })] }])] });
        const container = await open(without as PlanView);
        expect(sectionOf(container, 'Plan')!.textContent).toContain('No steps in the plan');
    });
});

describe('0023 AC-004: the chips', () => {
    const states = planSample({
        stages: [
            stage(1, [
                { steps: [step('T-001', 'done'), step('T-002', 'next')] },
                { sep: '→', steps: [step('T-003', 'open'), step('T-004', 'dropped'), step('T-005', 'returned', { returned: { status: 'done' } })] },
            ]),
            stage(2, [{ steps: [step('T-006', 'returned', { returned: { status: 'blocked', reason: 'a question' } }), step('T-007', 'notFound', { open: undefined, title: '' })] }]),
        ],
    });

    it('each state shows its symbol and word, the name <ID> <title>, and that name then the file line as tooltip and description', async () => {
        const container = await open(states);
        const names = chips(sectionOf(container, 'Plan')!).map((chip) => [shown(chip), chip.querySelector('button')?.getAttribute('aria-label') ?? chip.querySelector('.visually-hidden')?.textContent]);
        expect(names).toEqual([
            ['T-001', 'T-001 Step T-001, done'],
            ['T-002', 'T-002 Step T-002, next'],
            ['T-003', 'T-003 Step T-003, open'],
            ['T-004', 'T-004 Step T-004, dropped'],
            ['T-005', 'T-005 Step T-005, returned'],
            ['T-006', 'T-006 Step T-006, returned, blocked'],
            ['T-007', ', not in the steps'],
        ]);
        const next = chips(sectionOf(container, 'Plan')!)[1]!.querySelector<HTMLButtonElement>('button')!;
        expect(next.title).toBe('T-002 Step T-002, next\nOpen 0007-thing.plan.md at line 42');
        expect(document.getElementById(next.getAttribute('aria-describedby')!)?.textContent).toBe('T-002 Step T-002, next\nOpen 0007-thing.plan.md at line 42');
    });

    it('0025 AC-014: each chip draws the codicon motif of its state as an aria-hidden SVG and no old symbol', async () => {
        const container = await open(states);
        const plan = sectionOf(container, 'Plan')!;
        expect(chips(plan).map((chip) => chip.querySelector('svg')?.getAttribute('data-motif') ?? null)).toEqual(['check', 'debug-stackframe', 'circle-large-outline', null, 'reply', 'circle-slash', 'question']);
        expect(chips(plan).map((chip) => chip.querySelector('svg')?.getAttribute('aria-hidden') ?? null)).toEqual(['true', 'true', 'true', null, 'true', 'true', 'true']);
        expect(chips(plan).map((chip) => chip.querySelector('svg')?.getAttribute('data-tint') ?? null)).toEqual(['descriptionForeground', 'focusBorder', 'descriptionForeground', null, 'descriptionForeground', 'charts.red', 'descriptionForeground']);
        expect(plan.textContent).not.toMatch(/[✓◐○↩⊘]/);
    });

    it('a dropped ID is struck through', async () => {
        const container = await open(states);
        const dropped = chips(sectionOf(container, 'Plan')!)[3]!;
        expect(dropped.querySelector('s')?.textContent).toBe('T-004');
    });

    it('activating a chip sends the open request for the plan at the heading line of its step; a not-found chip is no button', async () => {
        const container = await open(states);
        const all = chips(sectionOf(container, 'Plan')!);
        await click(all[1]!.querySelector('button')!);
        expect(requests('openFile')).toEqual([{ key: PLAN_KEY, line: 42 }]);
        expect(all[6]!.querySelector('button')).toBeNull();
        expect(all[6]!.tagName).toBe('SPAN');
    });

    it('PR #1 review: a chip whose file is gone reads the failure text and is named by it, not by the step; the other chips keep their names', async () => {
        const container = await open(states);
        const all = chips(sectionOf(container, 'Plan')!);
        const button = all[1]!.querySelector<HTMLButtonElement>('button')!;
        const before = button.getAttribute('aria-label');
        expect(before).toContain('T-002');
        await click(button);
        await send(openFileResultEvent(PLAN_KEY, fileNotFoundText(PLAN_KEY)));
        expect(button.textContent).toBe(fileNotFoundText(PLAN_KEY));
        const name = button.getAttribute('aria-label') ?? button.textContent;
        expect(name).toBe(fileNotFoundText(PLAN_KEY));
        expect(all[0]!.querySelector('button')?.getAttribute('aria-label')).toContain('T-001');
        expect(all[2]!.querySelector('button')?.getAttribute('aria-label')).toContain('T-003');
    });

    it('M-04 follows exactly the stages that hold ‖; the separators between chips are shown', async () => {
        const container = await open(planSample());
        const lines = [...sectionOf(container, 'Plan')!.querySelectorAll<HTMLElement>('li[data-stage]')];
        expect(lines.map((line) => [line.getAttribute('data-stage'), line.textContent?.includes('⇉ can run in parallel')])).toEqual([
            ['1', false],
            ['2', true],
            ['3', false],
        ]);
        expect(lines[0]!.textContent).toContain('→');
        expect(lines[1]!.textContent).toContain('‖');
        expect(lines[1]!.querySelectorAll('.plan-parallel')).toHaveLength(1);
    });

    it('M-04 also follows a mixed stage: part of it runs in parallel, so the line says so', async () => {
        const mixed = planSample({
            stages: [stage(1, [{ steps: [step('T-001', 'open'), step('T-002', 'open')] }, { sep: '→', steps: [step('T-003', 'open')] }], { current: true }), stage(2, [{ steps: [step('T-004', 'open')] }, { sep: '→', steps: [step('T-005', 'open')] }])],
        });
        expect(mixed.stages[0]!.kind).toBe('mixed');
        const container = await open(mixed);
        const lines = [...sectionOf(container, 'Plan')!.querySelectorAll<HTMLElement>('li[data-stage]')];
        expect(lines.map((line) => line.querySelectorAll('.plan-parallel').length)).toEqual([1, 0]);
    });

    it('steps in no stage form the last line headed "Not in a stage"', async () => {
        const container = await open(planSample({ loose: [step('T-009', 'open')] }));
        const last = [...sectionOf(container, 'Plan')!.querySelectorAll('li')].pop()!;
        expect(last.textContent).toContain('Not in a stage');
        expect(chips(last).map(shown)).toEqual(['T-009']);
        expect(sectionOf(container, 'Plan')!.querySelectorAll('li[data-stage]')).toHaveLength(3);
    });

    it('a plan without stages is one line of chips in plan order, no numbers', async () => {
        const container = await open(planSample({ staged: false, stages: [], loose: [step('T-001', 'done'), step('T-002', 'next'), step('T-003', 'open')] }));
        const plan = sectionOf(container, 'Plan')!;
        expect(plan.querySelectorAll('li[data-stage]')).toHaveLength(0);
        expect(plan.querySelector('ol')).toBeNull();
        expect(chips(plan).map(shown)).toEqual(['T-001', 'T-002', 'T-003']);
        expect(plan.textContent).not.toContain('Not in a stage');
    });

    it('the section has no button that copies', async () => {
        const container = await open(planSample());
        expect(sectionOf(container, 'Plan')!.querySelectorAll('.next-step-copy, .copy-button, .copy-icon')).toHaveLength(0);
    });
});

describe('0023 AC-005: the link to the Plan map', () => {
    it('sends one navigate request for the planMap area with the spec, keeps the selection, and the map heading takes the focus', async () => {
        const container = await open(planSample());
        const link = [...sectionOf(container, 'Plan')!.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Open plan map')!;
        await click(link);
        expect(requests('navigate')).toEqual([{ area: 'planMap', target: { kind: 'spec', stem: '0007-thing' } }]);
        expect(requests('select')).toEqual([]);
        expect(requests('clearSelection')).toEqual([]);
        await open(planSample(), {}, 'planMap');
        const heading = container.querySelector<HTMLElement>('[data-map-heading]')!;
        expect(heading.textContent).toContain('0007');
        expect(document.activeElement).toBe(heading);
        expect(container.querySelector('aside.side-panel')).not.toBeNull();
    });

    it('in the tab the side panel has no Plan section and shows its Steps row again', async () => {
        const container = await open(planSample(), {}, 'planMap');
        expect(sectionOf(container, 'Plan')).toBeUndefined();
        expect(sectionOf(container, 'Progress')!.textContent).toContain('Next open step');
        expect(container.querySelector('[data-plan-map]')).not.toBeNull();
    });
});
