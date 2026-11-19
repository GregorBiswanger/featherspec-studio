import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../shared/protocol/envelope';
import type { SendView } from '../../shared/protocol/assistant';
import type { NextStepView, SpecDetailView } from '../../shared/protocol/detail';
import { fileNotFoundText, HISTORY_NOT_AVAILABLE_TEXT, NO_PLAN_TEXT } from '../../shared/protocol/texts';
import { planSample } from '../../shared/protocol/testing/planSample';
import { App } from '../App';
import { createClient, type ShellClient } from '../client';
import { baseView, click, ctrlClick, isKeyboardReachable, mount, pressKey, send, shellEvent, type Mounted } from '../testing/dom';
import { resetSectionMemory } from './sectionMemory';
import { copyResultEvent, detailEvent, detailView, historySection, openFileResultEvent, PLAN_KEY, sendResultEvent, SPEC_KEY } from './testing/views';
import { ABOUT_STEP_LABEL, COPIED_TEXT, COPY_FAILED_TEXT, NEXT_STEP_DONE_TEXT } from '../../shared/protocol/nextStepTexts';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(view = detailView()): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    seq = 1;
    await send(shellEvent(baseView({ area: 'board', selection: { stem: '0007-thing', number: '0007' } }), seq));
    await send(detailEvent(view));
    return mounted.container;
}

let seq = 1;

async function select(stem: string): Promise<void> {
    seq += 1;
    await send(shellEvent(baseView({ area: 'board', selection: { stem, number: stem.slice(0, 4) } }), seq));
}

function section(container: HTMLElement, title: string): HTMLElement {
    const heading = [...container.querySelectorAll('h3')].find((candidate) => candidate.textContent === title)!;
    return heading.closest('section')!;
}

function historyRoot(container: HTMLElement): HTMLElement {
    const heading = [...container.querySelectorAll('h3')].find((candidate) => candidate.textContent?.startsWith('Status history'))!;
    return heading.closest('section')!;
}

function historyToggle(container: HTMLElement): HTMLButtonElement {
    return historyRoot(container).querySelector<HTMLButtonElement>('h3 > button')!;
}

function requests(type: string): unknown[] {
    return posted.filter((message) => message.type === type).map((message) => message.payload);
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    resetSectionMemory();
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

function textOf(root: Element): string {
    const clone = root.cloneNode(true) as Element;
    clone.querySelectorAll('.visually-hidden').forEach((hidden) => hidden.remove());
    return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function spec(overrides: Partial<SpecDetailView>, nextStep?: NextStepView, problems: SpecDetailView['problems'] = []) {
    return detailView(overrides, nextStep, problems);
}

function links(root: Element): HTMLButtonElement[] {
    return [...root.querySelectorAll<HTMLButtonElement>('button.file-link')];
}

function progressOf(container: HTMLElement): HTMLElement {
    return section(container, 'Progress');
}

describe('0019 AC-009: the situation picture in its order', () => {
    it('shows Next step, Problems, Progress, Files, Format notes and Status history in this order', async () => {
        const container = await open(spec({}, undefined, [{ reason: 'A problem', open: { key: SPEC_KEY, line: 3 } }]));
        const parts = [
            section(container, 'Next step'),
            container.querySelector('.detail-problems')!,
            section(container, 'Progress'),
            section(container, 'Files'),
            container.querySelector('.format-notes')!,
            historyRoot(container),
        ];
        parts.forEach((part, index) => {
            expect(part, `part ${index}`).not.toBeNull();
            if (index > 0) {
                expect(parts[index - 1]!.compareDocumentPosition(part) & Node.DOCUMENT_POSITION_FOLLOWING, `part ${index} follows part ${index - 1}`).toBeTruthy();
            }
        });
        expect([...container.querySelectorAll('h3')].map((heading) => heading.textContent)).toEqual(['Next step', 'Progress', 'Files', 'Status history (1)']);
    });

    it('0023 AC-003: with a plan the Plan section comes after Problems and before Progress; the samples without a plan keep their sections', async () => {
        const planned = await open(spec({ plan: planSample() }, undefined, [{ reason: 'A problem', open: { key: SPEC_KEY, line: 3 } }]));
        expect([...planned.querySelectorAll('h3')].map((heading) => heading.textContent)).toEqual(['Next step', 'Plan', 'Progress', 'Files', 'Status history (1)']);
        expect(planned.querySelector('.detail-problems')!.compareDocumentPosition(section(planned, 'Plan')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        const sample = await open(spec({}));
        expect([...sample.querySelectorAll('h3')].map((heading) => heading.textContent)).toEqual(['Next step', 'Progress', 'Files', 'Status history (1)']);
    });

    it('the header holds the number, the title, one state chip and no Open file button', async () => {
        const container = await open();
        const header = container.querySelector('.detail-title')!;
        expect(header.querySelector('.detail-number')?.textContent).toBe('0007');
        expect(header.querySelector('h2')?.textContent).toContain('Thing 0007');
        expect(header.querySelectorAll('.state-chip')).toHaveLength(1);
        expect(header.querySelector('.state-chip')?.textContent?.trim()).toBe('Active');
        expect([...header.querySelectorAll('button')].map((button) => button.getAttribute('aria-label'))).toEqual(['Close spec detail']);
    });

    it('a derived state shows its chip tooltip, the sentence as hidden text after the chip and no rule ID as text', async () => {
        const container = await open(spec({ state: 'Ready', rule: 'S-READY', persistence: 'derived' }));
        const chip = container.querySelector('.detail-title .state-chip')!;
        expect(chip.textContent?.trim()).toBe('Ready');
        expect(chip.getAttribute('title')).toBe('Plan written, not started yet · Derived from the files · rule S-READY');
        const hidden = chip.nextElementSibling!;
        expect(hidden.classList.contains('visually-hidden')).toBe(true);
        expect(hidden.textContent).toBe('Plan written, not started yet');
        expect(container.querySelector('.detail-title')!.textContent).not.toMatch(/S-READY|persisted|derived/);
    });

    it('a persisted state shows the tooltip of the files and no hidden sentence', async () => {
        const container = await open();
        const chip = container.querySelector('.detail-title .state-chip')!;
        expect(chip.getAttribute('title')).toBe('Read from the files · rule S-ACTIVE');
        expect(container.querySelector('.detail-title .visually-hidden')).toBeNull();
    });

    it('a duplicated stem shows its path below the title; control: none otherwise', async () => {
        const container = await open(spec({ path: '.specs/backlog/0007-thing.md' }));
        expect(container.querySelector('.detail-path')?.textContent).toBe('.specs/backlog/0007-thing.md');
        expect((await open()).querySelector('.detail-path')).toBeNull();
    });

    it('a Deprecated spec shows the marker and its successor text', async () => {
        const container = await open(spec({ successor: 'Successor: 0009-new' }));
        expect(container.querySelector('.detail-title')!.textContent).toContain('Deprecated');
        expect(container.querySelector('.detail-successor')?.textContent).toBe('Successor: 0009-new');
        expect((await open()).querySelector('.detail-successor')).toBeNull();
    });
});

describe('0019 AC-010: no second renderer of the files', () => {
    const REMOVED = ['Overview', 'Requirements', 'Acceptance criteria', 'No FR- requirements found', 'Priority', 'verdict', 'Related artifacts', 'Plan & tasks', 'Verification', 'Open file'];

    it('shows none of the removed texts as a heading or a line, no Verified text, no header line, no requirement or criterion text', async () => {
        const container = await open();
        const text = textOf(container.querySelector('.spec-detail')!);
        for (const removed of REMOVED) {
            expect(text, removed).not.toContain(removed);
        }
        expect(text).not.toContain('tests green');
        expect(text).not.toContain('Show the board');
        expect(text).not.toContain('The board shall render.');
        expect(text).not.toContain('Given a project');
        expect(text).not.toContain('In Progress');
        expect(container.querySelector('.spec-detail dl')).toBeNull();
        expect(container.querySelectorAll('button.open-file')).toHaveLength(0);
    });

    it('control: the same view still shows what the picture is for', async () => {
        const text = textOf(await open());
        expect(text).toContain('The board shall sort.');
        expect(text).toContain('Second step');
    });
});

describe('0019 AC-011, AC-012: Progress', () => {
    it('shows the Steps row with its bar, "<done> of <total> done" and the next open step with its ID as link', async () => {
        const container = await open();
        const root = progressOf(container);
        const bar = root.querySelector('[aria-label="Steps"][role="progressbar"]')!;
        expect(bar.getAttribute('aria-valuenow')).toBe('1');
        expect(bar.getAttribute('aria-valuemax')).toBe('3');
        expect(textOf(root)).toContain('1 of 3 done');
        expect(textOf(root.querySelector('.progress-next')!)).toBe('Next open step: T-002 Second step');
        expect(links(root.querySelector('.progress-next')!).map((link) => link.textContent)).toEqual(['T-002']);
    });

    it('0025 AC-015: while a return note lies, the Steps row shows the one sentence of U-05 and no next open step', async () => {
        const sentence = '2 returned, T-004 blocked: the next step finds out what blocks.';
        const container = await open(spec({ progress: { needs: [], noPlan: false, steps: { kind: 'steps', done: 2, total: 5, returned: sentence }, criteria: { kind: 'unavailable', reason: 'no-table' } } }));
        const root = progressOf(container);
        expect(root.querySelector('.progress-returned')?.textContent).toBe(sentence);
        expect(root.querySelector('.progress-next')).toBeNull();
        expect(textOf(root)).not.toContain('Next open step');
    });

    it('0025 AC-003: the ID of the next open step of a map-able spec is a step link; for a spec that is not map-able it keeps 0019 AC-017', async () => {
        const progress = { needs: [], noPlan: false, steps: { kind: 'steps' as const, done: 1, total: 3, next: { id: 'T-002', title: 'Second step', open: { key: PLAN_KEY, line: 20 } } }, criteria: { kind: 'unavailable' as const, reason: 'no-table' as const } };
        const client = createClient({ post: (message) => void posted.push(message) });
        clients.push(client);
        client.start();
        mounted = await mount(<App client={client} />);
        await send(shellEvent(baseView({ area: 'planMap', selection: { stem: '0007-thing', number: '0007' } }), 1));
        await send(detailEvent(spec({ progress, plan: planSample() })));
        const link = links(mounted.container.querySelector('.progress-next')!)[0]!;
        expect(link.title).toBe('T-002 Second step\nShow T-002 in the plan map · Ctrl+click opens the plan file');
        await click(link);
        expect(posted.filter((message) => message.type === 'navigate').map((message) => message.payload)).toEqual([{ area: 'planMap', target: { kind: 'spec', stem: '0007-thing', step: 'T-002' } }]);
        expect(posted.filter((message) => message.type === 'openFile')).toEqual([]);
        await send(detailEvent(spec({ progress, state: 'Done' })));
        const plain = links(mounted.container.querySelector('.progress-next')!)[0]!;
        expect(plain.title).toBe('Open 0007-thing.plan.md at line 20');
    });

    it('0025 AC-027: the ID in an intent line of the Next step is a step link; Ctrl opens the plan; without a link the intent stays text', async () => {
        const step = { id: 'T-002', open: { key: PLAN_KEY, line: 20 } };
        const lines = [{ text: 'Implement T-002 of p', intent: 'Continue with T-002 Second step', step }, { text: '/sdd-plan s', intent: 'Not sure where it stands? Let the agent report first' }];
        const root = await open(spec({}, { rule: 'NS-6', lines }));
        const next = root.querySelector('.next-step')!;
        const link = links(next)[0]!;
        expect(link.textContent).toBe('T-002');
        expect(link.title).toBe('T-002\nShow T-002 in the plan map · Ctrl+click opens the plan file');
        expect(textOf(next.querySelector('.next-step-intent')!)).toBe('Continue with T-002 Second step');
        await click(link);
        expect(posted.filter((message) => message.type === 'navigate').map((message) => message.payload)).toEqual([{ area: 'planMap', target: { kind: 'spec', stem: '0007-thing', step: 'T-002' } }]);
        await ctrlClick(link);
        expect(posted.filter((message) => message.type === 'openFile')).toHaveLength(1);
        expect(links(next).filter((candidate) => candidate.classList.contains('file-link')).map((candidate) => candidate.textContent)).toEqual(['T-002']);
        const plain = await open(spec({}, { rule: 'NS-6', lines: [{ text: 'Implement T-002 of p', intent: 'Continue with T-002 Second step' }] }));
        expect(links(plain.querySelector('.next-step')!)).toEqual([]);
    });

    it('0025 AC-016: the parallel hint follows line 1 (after the coach line when tips show), precedes line 2, and Ways to run it navigates to the ways target', async () => {
        const lines = [{ text: 'Implement T-003 of p', intent: 'Continue with T-003 Step' }, { text: '/sdd-plan s', intent: 'Not sure where it stands? Let the agent report first' }];
        const withTips: NextStepView = { rule: 'NS-6', lines, parallel: { stage: 2 }, tips: { coach: 'Run this in your agent chat.', about: ['One step.'] } } as NextStepView;
        const root = await open(spec({}, withTips));
        const items = [...root.querySelectorAll('.next-step-lines > li')];
        const hint = items[0]!.querySelector('.parallel-hint')!;
        expect(textOf(hint)).toBe('Stage 2 can run in parallel · Ways to run it');
        expect(items[1]!.querySelector('.parallel-hint')).toBeNull();
        expect(items[0]!.querySelector('.step-coach')!.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        const button = hint.querySelector<HTMLButtonElement>('button')!;
        expect(button.textContent).toBe('Ways to run it');
        await click(button);
        expect(posted.filter((message) => message.type === 'navigate').map((message) => message.payload)).toEqual([{ area: 'planMap', target: { kind: 'spec', stem: '0007-thing', ways: true } }]);
    });

    it('0025 AC-016: tips off the hint sits after the Copy prompt; without a parallel stage there is none', async () => {
        const lines = [{ text: 'Implement T-003 of p', intent: 'Continue with T-003 Step' }];
        const root = await open(spec({}, { rule: 'NS-6', lines, parallel: { stage: 3 } } as NextStepView));
        const first = root.querySelector('.next-step-lines > li')!;
        expect(textOf(first.querySelector('.parallel-hint')!)).toBe('Stage 3 can run in parallel · Ways to run it');
        expect(first.querySelector('.copy-button')!.compareDocumentPosition(first.querySelector('.parallel-hint')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        const none = await open(spec({}, { rule: 'NS-6', lines } as NextStepView));
        expect(none.querySelector('.parallel-hint')).toBeNull();
    });

    it('a complete plan shows no next open step; no countable step says so; an unreadable plan says so', async () => {
        const done = await open(spec({ progress: { needs: [], noPlan: false, steps: { kind: 'steps', done: 4, total: 4 }, criteria: { kind: 'criteria', verified: 3, total: 3, open: [] } } }));
        expect(textOf(progressOf(done))).toContain('4 of 4 done');
        expect(done.querySelector('.progress-next')).toBeNull();
        const none = await open(spec({ progress: { needs: [], noPlan: false, steps: { kind: 'none' } } }));
        expect(textOf(progressOf(none))).toContain('No steps in the plan');
        const unreadable = await open(spec({ progress: { needs: [], noPlan: false, steps: { kind: 'unavailable' }, criteria: { kind: 'unavailable', reason: 'unreadable' } } }));
        expect(textOf(progressOf(unreadable))).toContain('not available — Studio cannot read the plan');
        expect(progressOf(unreadable).querySelectorAll('[role="progressbar"]')).toHaveLength(0);
    });

    it('shows the Criteria row with "<verified> of <total> verified", "Not verified yet:" and one entry per open row', async () => {
        const root = progressOf(await open());
        expect(textOf(root)).toContain('1 of 2 verified');
        expect(textOf(root)).toContain('Not verified yet:');
        const entries = [...root.querySelectorAll('.criteria-open li')];
        expect(entries.map(textOf)).toEqual(['AC-002 The board shall sort.']);
        expect(links(entries[0]!).map((link) => link.textContent)).toEqual(['AC-002']);
    });

    it('0019 F4: the two row labels read "Steps" and "Criteria" literally, and the criteria bar is named "Criteria"', async () => {
        const root = progressOf(await open());
        expect([...root.querySelectorAll('.progress-label')].map(textOf)).toEqual(['Steps', 'Criteria']);
        expect(root.querySelector('[role="progressbar"][aria-label="Criteria"]')).not.toBeNull();
    });

    it('a built row ends with " · built", a row with no ID shows its text as the link, all verified shows no list', async () => {
        const criteria = {
            kind: 'criteria' as const,
            verified: 1,
            total: 3,
            open: [
                { id: 'AC-001', text: 'First.', built: true, open: { key: SPEC_KEY, line: 9 } },
                { text: 'M-01, M-02', built: false, open: { key: PLAN_KEY, line: 40 } },
            ],
        };
        const container = await open(spec({ progress: { needs: [], noPlan: false, criteria } }));
        const entries = [...progressOf(container).querySelectorAll('.criteria-open li')];
        expect(entries.map(textOf)).toEqual(['AC-001 First. · built', 'M-01, M-02']);
        expect(links(entries[1]!).map((link) => link.textContent)).toEqual(['M-01, M-02']);
        const verified = await open(spec({ progress: { needs: [], noPlan: false, criteria: { kind: 'criteria', verified: 3, total: 3, open: [] } } }));
        expect(textOf(progressOf(verified))).not.toContain('Not verified yet:');
    });

    it('the plan without a traceability table says so', async () => {
        const container = await open(spec({ progress: { needs: [], noPlan: false, steps: { kind: 'steps', done: 0, total: 1 }, criteria: { kind: 'unavailable', reason: 'no-table' } } }));
        expect(textOf(progressOf(container))).toContain('not available — the plan has no traceability table');
    });

    it('needs come first, each with its tooltip, no link; no Steps or Criteria row without a plan', async () => {
        const container = await open(spec({ progress: { needs: [{ text: 'needs acceptance criteria', rule: 'R-2' }, { text: 'needs a plan', rule: 'R-3' }], noPlan: false } }));
        const root = progressOf(container);
        const needs = [...root.querySelectorAll('.detail-needs li')];
        expect(needs.map((item) => item.textContent)).toEqual(['needs acceptance criteria', 'needs a plan']);
        expect(needs.map((item) => item.getAttribute('title'))).toEqual(['Not Ready yet · rule R-2', 'Not Ready yet · rule R-3']);
        expect(root.querySelectorAll('button')).toHaveLength(0);
        expect(root.querySelectorAll('[role="progressbar"]')).toHaveLength(0);
        expect(root.querySelector('.detail-needs')!.compareDocumentPosition(root.querySelector('.progress-rows') ?? root)).toBeDefined();
    });

    it('a spec without a plan says "No plan yet"; a Done spec without a plan has no Progress at all', async () => {
        const noPlan = await open(spec({ progress: { needs: [], noPlan: true } }));
        expect(textOf(progressOf(noPlan))).toContain(NO_PLAN_TEXT);
        const baseline = detailView({}, undefined, []);
        if (baseline.kind === 'spec') {
            delete baseline.progress;
        }
        const container = await open(baseline);
        expect(container.querySelector('h3')?.textContent).toBe('Next step');
        expect([...container.querySelectorAll('h3')].map((heading) => heading.textContent)).not.toContain('Progress');
    });
});

describe('0019 AC-014: Files', () => {
    it('shows one row per file with its label and the file name as link', async () => {
        const root = section(await open(), 'Files');
        const rows = [...root.querySelectorAll('li')];
        expect(rows.map(textOf)).toEqual(['Spec 0007-thing.md', 'Plan 0007-thing.plan.md']);
        expect(links(root).map((link) => link.textContent)).toEqual(['0007-thing.md', '0007-thing.plan.md']);
    });

    it('lists an archived plan and a return note by their file names, nothing for an absent file', async () => {
        const files = [
            { label: 'Spec', name: '0001-a.md', open: { key: '.specs/done/0001-a.md', line: 1 } },
            { label: 'Archived plan', name: '0001-a.2026-11-01.plan.md', open: { key: '.specs/plan-archive/0001-a.2026-11-01.plan.md', line: 1 } },
            { label: 'Return note', name: 'activeContext.0001-T-001.md', open: { key: '.memory-bank/activeContext.0001-T-001.md', line: 1 } },
        ];
        const root = section(await open(spec({ files })), 'Files');
        expect([...root.querySelectorAll('li')].map(textOf)).toEqual(['Spec 0001-a.md', 'Archived plan 0001-a.2026-11-01.plan.md', 'Return note activeContext.0001-T-001.md']);
    });
});

describe('0019 AC-017: every link opens its file at its line', () => {
    it('the next open step, an open criterion and a file send their key and line', async () => {
        const container = await open();
        await click(links(container.querySelector('.progress-next')!)[0]!);
        await click(links(container.querySelector('.criteria-open')!)[0]!);
        await click(links(section(container, 'Files'))[1]!);
        expect(requests('openFile')).toEqual([
            { key: PLAN_KEY, line: 30 },
            { key: SPEC_KEY, line: 44 },
            { key: PLAN_KEY, line: 1 },
        ]);
    });

    it('a Problem with a file and a format note with a file send their key and line; one without a file is text', async () => {
        const problems = [
            { reason: 'Folder does not match.', open: { key: SPEC_KEY, line: 5 } },
            { reason: 'Plan link is broken.' },
        ];
        const container = await open(spec({}, undefined, problems));
        const list = container.querySelector('.detail-problems')!;
        expect(links(list).map((link) => link.textContent)).toEqual(['Folder does not match.']);
        expect(list.querySelectorAll('li')).toHaveLength(2);
        await click(links(list)[0]!);
        await click(container.querySelector('.format-notes-toggle')!);
        await click(links(container.querySelector('.format-notes-list')!)[0]!);
        expect(requests('openFile')).toEqual([
            { key: SPEC_KEY, line: 5 },
            { key: SPEC_KEY, line: 12 },
        ]);
    });

    it('needs, history entries and texts send nothing', async () => {
        const container = await open(spec({ progress: { needs: [{ text: 'needs a plan', rule: 'R-3' }], noPlan: false } }));
        await click(container.querySelector('.detail-needs li')!);
        await click(historyRoot(container).querySelector('li')!);
        await click(container.querySelector('.detail-title h2')!);
        expect(requests('openFile')).toEqual([]);
        expect(historyRoot(container).querySelectorAll('button.file-link')).toHaveLength(0);
    });

    it('each link has its visible text as name, a tooltip and a description "Open <file name> at line <n>"', async () => {
        const container = await open();
        const link = links(container.querySelector('.criteria-open')!)[0]!;
        expect(link.textContent).toBe('AC-002');
        expect(link.getAttribute('title')).toBe('Open 0007-thing.md at line 44');
        const description = container.querySelector(`#${link.getAttribute('aria-describedby')!}`)!;
        expect(description.textContent).toBe('Open 0007-thing.md at line 44');
        expect(description.classList.contains('visually-hidden')).toBe(true);
        expect(link.hasAttribute('aria-label')).toBe(false);
        const fileLink = links(section(container, 'Files'))[1]!;
        expect(fileLink.getAttribute('title')).toBe('Open 0007-thing.plan.md at line 1');
    });

    it('every link is a native button in the Tab order and works with Enter and with Space', async () => {
        const container = await open();
        const all = links(container);
        expect(all.length).toBeGreaterThanOrEqual(4);
        all.forEach((link) => {
            expect(link.tagName).toBe('BUTTON');
            expect(link.type).toBe('button');
            expect(isKeyboardReachable(link)).toBe(true);
        });
        const link = links(container.querySelector('.progress-next')!)[0]!;
        await pressKey(link, 'Enter');
        await pressKey(link, ' ');
        expect(requests('openFile')).toEqual([
            { key: PLAN_KEY, line: 30 },
            { key: PLAN_KEY, line: 30 },
        ]);
    });
});

describe('0019 AC-019: a file that is gone', () => {
    it('the activated link reads "File not found: <path>", keeps the focus and the live region announces it', async () => {
        const container = await open();
        const link = links(container.querySelector('.criteria-open')!)[0]!;
        link.focus();
        await click(link);
        await send(openFileResultEvent(SPEC_KEY, fileNotFoundText(SPEC_KEY)));
        expect(link.textContent).toBe(fileNotFoundText(SPEC_KEY));
        expect(document.activeElement).toBe(link);
        const region = container.querySelector('.detail-open-status')!;
        expect(region.getAttribute('role')).toBe('status');
        expect(region.getAttribute('aria-live')).toBe('polite');
        expect(region.classList.contains('visually-hidden')).toBe(true);
        expect(region.textContent).toBe(fileNotFoundText(SPEC_KEY));
    });

    it('control: a link that was not activated keeps its text, and so does a link to another file', async () => {
        const container = await open();
        const criterion = links(container.querySelector('.criteria-open')!)[0]!;
        const step = links(container.querySelector('.progress-next')!)[0]!;
        await click(criterion);
        await send(openFileResultEvent(SPEC_KEY, fileNotFoundText(SPEC_KEY)));
        expect(step.textContent).toBe('T-002');
        expect(links(section(container, 'Files'))[0]!.textContent).toBe('0007-thing.md');
    });

    it('0019 G5: a link that was activated earlier keeps its text when another link gets the not-found result for another key', async () => {
        const container = await open();
        const step = links(container.querySelector('.progress-next')!)[0]!;
        const criterion = links(container.querySelector('.criteria-open')!)[0]!;
        await click(step);
        await click(criterion);
        await send(openFileResultEvent(SPEC_KEY, fileNotFoundText(SPEC_KEY)));
        expect(criterion.textContent).toBe(fileNotFoundText(SPEC_KEY));
        expect(step.textContent).toBe('T-002');
    });

    it('0019 F2: of two links to the same file only the one activated last reads "File not found", also when the earlier one opened the file', async () => {
        const container = await open();
        const file = links(section(container, 'Files'))[0]!;
        const criterion = links(container.querySelector('.criteria-open')!)[0]!;
        await click(file);
        await click(criterion);
        await send(openFileResultEvent(SPEC_KEY, fileNotFoundText(SPEC_KEY)));
        expect(criterion.textContent).toBe(fileNotFoundText(SPEC_KEY));
        expect(file.textContent).toBe('0007-thing.md');
        expect(posted.filter((message) => message.type === 'openFile')).toHaveLength(2);
    });

    it('0019 F2: the link activated last for a file reads the result even when another link to another file was activated after it', async () => {
        const container = await open();
        const criterion = links(container.querySelector('.criteria-open')!)[0]!;
        const step = links(container.querySelector('.progress-next')!)[0]!;
        await click(criterion);
        await click(step);
        await send(openFileResultEvent(SPEC_KEY, fileNotFoundText(SPEC_KEY)));
        expect(criterion.textContent).toBe(fileNotFoundText(SPEC_KEY));
        expect(step.textContent).toBe('T-002');
    });

    it('the next model update restores the text and empties the live region', async () => {
        const container = await open();
        const link = links(container.querySelector('.criteria-open')!)[0]!;
        await click(link);
        await send(openFileResultEvent(SPEC_KEY, fileNotFoundText(SPEC_KEY)));
        await send(detailEvent(detailView()));
        expect(links(container.querySelector('.criteria-open')!)[0]!.textContent).toBe('AC-002');
        expect(container.querySelector('.detail-open-status')!.textContent).toBe('');
        expect(container.textContent).not.toContain(fileNotFoundText(SPEC_KEY));
    });

    it('showing another spec restores the text', async () => {
        const container = await open();
        await click(links(container.querySelector('.criteria-open')!)[0]!);
        await send(openFileResultEvent(SPEC_KEY, fileNotFoundText(SPEC_KEY)));
        await select('0008-other');
        await send(detailEvent({ ...detailView(), key: '.specs/active/0008-other.md', stem: '0008-other' } as ReturnType<typeof detailView>));
        expect(container.textContent).not.toContain(fileNotFoundText(SPEC_KEY));
    });
});

describe('0015 AC-012, 0019 AC-015: Status history', () => {
    it('lists the labelled status history and no run once expanded', async () => {
        const container = await open();
        await click(historyToggle(container));
        const text = textOf(historyRoot(container));
        expect(text).toContain('Only changes Studio saw while it was running.');
        expect(text).toMatch(/— Ready → Active$/);
        expect(text).not.toMatch(/S-ACTIVE|2026-11-16T|observed|not checked/);
        const entry = historyRoot(container).querySelector('li');
        expect(entry?.getAttribute('title')).toBe('2026-11-16T09:00:00Z · rule S-ACTIVE · .specs/active/0001-a.plan.md');
        expect(text).not.toContain('claude');
        expect(text).not.toContain('Runs: not available');
        expect(text).not.toContain('No run');
    });

    it('shows not available with the reason while the history is not available', async () => {
        const reason = "Status history not available: Another VS Code window holds the write lock for this project's status history.";
        const container = await open(detailView({ history: { ...historySection(), statusHistory: undefined, notAvailable: reason } }));
        const text = textOf(historyRoot(container));
        expect(text).toContain(reason);
        expect(text).not.toContain('Only changes Studio saw');
        expect([...container.querySelectorAll('h3')].map((heading) => heading.textContent)).toContain('Status history');
    });

    it('shows not available even when the reason is missing', async () => {
        const container = await open(detailView({ history: { ...historySection(), statusHistory: undefined } }));
        expect(textOf(historyRoot(container))).toContain(HISTORY_NOT_AVAILABLE_TEXT);
    });

    it('starts collapsed under the heading "Status history (n)" and shows its entries when expanded', async () => {
        const container = await open();
        const toggle = historyToggle(container);
        expect(toggle.textContent).toBe('Status history (1)');
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        const body = container.querySelector<HTMLElement>(`#${toggle.getAttribute('aria-controls')!}`)!;
        expect(body.hidden).toBe(true);
        await click(toggle);
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(body.hidden).toBe(false);
        expect(body.querySelectorAll('li')).toHaveLength(1);
        await pressKey(toggle, 'Enter');
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        await pressKey(toggle, ' ');
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
    });

    it('the heading counts the entries of the spec', async () => {
        const entry = historySection().statusHistory![0]!;
        const container = await open(detailView({ history: { ...historySection(), statusHistory: [entry, entry, entry] } }));
        expect(historyToggle(container).textContent).toBe('Status history (3)');
    });

    it('no section at zero entries, neither for the history nor for the format notes', async () => {
        const container = await open(detailView({ history: { ...historySection(), statusHistory: [] }, notes: [] }));
        expect([...container.querySelectorAll('h3')].map((heading) => heading.textContent)).toEqual(['Next step', 'Progress', 'Files']);
        expect(container.querySelector('.format-notes')).toBeNull();
    });

    it('keeps its state across another spec and across closing and showing the detail again; the format notes start collapsed again', async () => {
        const container = await open();
        await click(historyToggle(container));
        await click(container.querySelector('.format-notes-toggle')!);
        expect(container.querySelector('.format-notes-toggle')!.getAttribute('aria-expanded')).toBe('true');
        await select('0008-other');
        await send(detailEvent({ ...detailView(), key: '.specs/active/0008-other.md', stem: '0008-other', title: 'Other 0008' } as ReturnType<typeof detailView>));
        expect(historyToggle(container).getAttribute('aria-expanded')).toBe('true');
        expect(container.querySelector('.format-notes-toggle')!.getAttribute('aria-expanded')).toBe('false');
        await click(container.querySelector('.format-notes-toggle')!);
        await send(detailEvent({ kind: 'none' }));
        expect(container.querySelector('.format-notes-toggle')).toBeNull();
        await select('0007-thing');
        await send(detailEvent(detailView()));
        expect(historyToggle(container).getAttribute('aria-expanded')).toBe('true');
        expect(container.querySelector('.format-notes-toggle')!.getAttribute('aria-expanded')).toBe('false');
    });

    it('control: a collapsed history stays collapsed across another spec', async () => {
        const container = await open();
        await select('0008-other');
        await send(detailEvent({ ...detailView(), key: '.specs/active/0008-other.md', stem: '0008-other' } as ReturnType<typeof detailView>));
        expect(historyToggle(container).getAttribute('aria-expanded')).toBe('false');
    });
});

describe('AC-028: the selection', () => {
    it('0020: shows no spec content while the detail of the selected spec is not there', async () => {
        const container = await open({ kind: 'none' });
        expect(container.textContent).not.toContain('Select a spec');
        expect(container.querySelectorAll('h3')).toHaveLength(0);
    });

    it('keeps showing the spec when the same spec arrives again from another folder', async () => {
        const container = await open();
        const moved = detailView();
        if (moved.kind === 'spec') {
            moved.key = '.specs/done/0007-thing.md';
            moved.state = 'Done';
        }
        await send(detailEvent(moved));
        expect(container.querySelector('h2')?.textContent).toContain('Thing 0007');
        expect(container.querySelector('.detail-title .state-chip')?.textContent).toContain('Done');
    });
});

describe('0015 AC-003, AC-005, AC-008, AC-009: the next step in the detail', () => {
    const TWO = { rule: 'NS-9', lines: [{ text: '/sdd-clarify .specs/backlog/0007-x.md', intent: 'Have the spec challenged, then plan it' }, { text: '/sdd-plan .specs/backlog/0007-x.md', intent: 'Then: write the plan' }] };

    function nextStepSection(container: HTMLElement): HTMLElement {
        return section(container, 'Next step');
    }

    function copyButtons(root: Element): HTMLButtonElement[] {
        return [...root.querySelectorAll<HTMLButtonElement>('button')].filter((button) => button.textContent === 'Copy prompt');
    }

    it('AC-003: "Next step" stands above the other sections with its line and a Copy button', async () => {
        const container = await open();
        const headings = [...container.querySelectorAll('h3')].map((heading) => heading.textContent);
        expect(headings[0]).toBe('Next step');
        const root = nextStepSection(container);
        expect(root.textContent).toContain(`/sdd-plan ${SPEC_KEY}`);
        expect(copyButtons(root)).toHaveLength(1);
    });

    it('AC-017 (0016): the detail\'s Copy is the primary button and carries no other button class', async () => {
        const container = await open();
        const [button] = copyButtons(nextStepSection(container));
        expect(button!.classList.contains('copy-button')).toBe(true);
        expect(button!.classList.contains('open-file')).toBe(false);
        expect(button!.classList.contains('secondary-button')).toBe(false);
    });

    it('0021 AC-001: each line shows its intent as its own element directly before its prompt and Copy, in DOM order; a rule with text only shows the text and no button', async () => {
        const NS5 = { rule: 'NS-5', lines: [{ text: '/sdd-compile k', intent: 'Have the result verified' }, { text: '/sdd-lifecycle k', intent: 'Then, after a READY verdict: close the spec' }] };
        const NS6 = {
            rule: 'NS-6',
            lines: [
                { text: 'Implement T-003 of .specs/active/0001-a.plan.md', intent: 'Continue with T-003 Reject money values' },
                { text: '/sdd-plan .specs/active/0001-a.md', intent: 'Not sure where it stands? Let the agent report first' },
            ],
        };
        for (const next of [TWO, NS5, NS6]) {
            const root = nextStepSection(await open(detailView({}, next)));
            const items = [...root.querySelectorAll('ul.next-step-lines > li')];
            expect(items).toHaveLength(2);
            items.forEach((item, index) => {
                const intent = item.firstElementChild!;
                expect(intent.className).toBe('next-step-intent');
                expect(intent.textContent).toBe(next.lines[index]!.intent);
                expect(intent.nextElementSibling?.tagName).toBe('CODE');
                expect(intent.nextElementSibling?.textContent).toBe(next.lines[index]!.text);
                expect(item.querySelectorAll('button')).toHaveLength(1);
            });
            expect(copyButtons(root)).toHaveLength(2);
        }
        const done = nextStepSection(await open(detailView({}, { rule: 'NS-3', text: NEXT_STEP_DONE_TEXT })));
        expect(done.textContent).toContain('Done — no FeatherSpec step left.');
        expect(done.querySelector('.next-step-intent')).toBeNull();
        expect(copyButtons(done)).toHaveLength(0);
    });

    it('AC-005: a pointer click on Copy requests exactly that line, and the result is announced', async () => {
        const container = await open(detailView({}, TWO));
        const buttons = copyButtons(nextStepSection(container));
        await click(buttons[1]!);
        expect(requests('copyText')).toEqual([{ text: '/sdd-plan .specs/backlog/0007-x.md' }]);
        await send(copyResultEvent(true, COPIED_TEXT));
        expect(buttons[1]!.textContent).toBe('Copied');
        const status = buttons[1]!.parentElement!.querySelector('[role="status"]')!;
        expect(status.textContent).toBe('Copied to the clipboard.');
        expect(status.getAttribute('aria-live')).toBe('polite');
    });

    it('AC-005: Copy is reachable by Tab and works with Enter and with Space', async () => {
        const container = await open(detailView({}, TWO));
        const [first, second] = copyButtons(nextStepSection(container));
        expect(isKeyboardReachable(first!)).toBe(true);
        expect(isKeyboardReachable(second!)).toBe(true);
        await pressKey(first!, 'Enter');
        await pressKey(second!, ' ');
        expect(requests('copyText')).toEqual([{ text: '/sdd-clarify .specs/backlog/0007-x.md' }, { text: '/sdd-plan .specs/backlog/0007-x.md' }]);
    });

    it('AC-009: a failed copy shows the failure text', async () => {
        const container = await open();
        await click(copyButtons(nextStepSection(container))[0]!);
        await send(copyResultEvent(false, COPY_FAILED_TEXT));
        const failed = nextStepSection(container).querySelector('button')!;
        expect(failed.textContent).toBe('Could not copy');
        expect(failed.getAttribute('title')).toBe('Could not copy to the clipboard.');
        expect(nextStepSection(container).querySelector('[role="status"]')!.textContent).toBe('Could not copy to the clipboard.');
    });

    it('AC-008: Copy is offered with no trust or writer information in the view', async () => {
        const container = await open();
        expect(copyButtons(nextStepSection(container))[0]!.disabled).toBe(false);
    });

    it('the status of a copy goes away when another spec is shown', async () => {
        const container = await open();
        await click(copyButtons(nextStepSection(container))[0]!);
        await send(copyResultEvent(true, COPIED_TEXT));
        expect(nextStepSection(container).textContent).toContain('Copied to the clipboard.');
        await select('0008-other');
        await send(detailEvent({ ...detailView(), key: 'other', stem: '0008-other' } as ReturnType<typeof detailView>));
        expect(nextStepSection(container).textContent).not.toContain('Copied to the clipboard.');
        expect(nextStepSection(container).querySelector('button')!.textContent).toBe('Copy prompt');
    });
});

describe('0016 AC-006, AC-007, AC-022: Problems, format notes', () => {
    const PROBLEM = { reason: 'Folder done/ does not match status "In Progress".', open: { key: SPEC_KEY, line: 1 } };

    function notesToggle(container: HTMLElement): HTMLButtonElement {
        return container.querySelector<HTMLButtonElement>('.format-notes-toggle')!;
    }

    it('AC-006: each Problem shows with the warning icon directly below Next step and above Progress', async () => {
        const container = await open(detailView({}, undefined, [PROBLEM, { reason: 'plan link 0007-gone.plan.md points to a missing file' }]));
        const list = container.querySelector('.detail-problems')!;
        expect([...list.querySelectorAll('li')].map(textOf)).toEqual([PROBLEM.reason, 'plan link 0007-gone.plan.md points to a missing file']);
        expect([...list.querySelectorAll('li svg')]).toHaveLength(2);
        const nextStep = section(container, 'Next step');
        expect(nextStep.nextElementSibling).toBe(list);
        expect(list.nextElementSibling).toBe(section(container, 'Progress'));
        expect(list.querySelectorAll('button')).toHaveLength(1);
    });

    it('AC-006 control: with no Problem no list is shown', async () => {
        expect((await open()).querySelector('.detail-problems')).toBeNull();
    });

    it('AC-007: the format-note toggle is collapsed when shown, reads the count text and shows the reasons after a pointer activation', async () => {
        const container = await open();
        const toggle = notesToggle(container);
        expect(toggle.textContent).toBe('1 format note — no action needed');
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        const list = container.querySelector<HTMLElement>('.format-notes-list')!;
        expect(toggle.getAttribute('aria-controls')).toBe(list.id);
        expect(list.hidden).toBe(true);
        await click(toggle);
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(list.hidden).toBe(false);
        expect(textOf(list)).toBe('Plan has no Verified line');
    });

    it('AC-007: the toggle is reachable by Tab and works with Enter and with Space', async () => {
        const container = await open();
        const toggle = notesToggle(container);
        expect(isKeyboardReachable(toggle)).toBe(true);
        await pressKey(toggle, 'Enter');
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        await pressKey(toggle, ' ');
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
    });

    it('AC-007: the plural reads "<n> format notes — no action needed" and no toggle exists at 0 notes', async () => {
        const many = await open(detailView({ notes: [{ reason: 'a' }, { reason: 'b' }, { reason: 'c' }] }));
        expect(notesToggle(many).textContent).toBe('3 format notes — no action needed');
        const none = await open(detailView({ notes: [] }));
        expect(none.querySelector('.format-notes-toggle')).toBeNull();
    });

    it('AC-007: the toggle is collapsed again when another spec is shown', async () => {
        const container = await open();
        await click(notesToggle(container));
        await select('0008-other');
        await send(detailEvent({ ...detailView(), key: 'other', stem: '0008-other' } as ReturnType<typeof detailView>));
        expect(notesToggle(container).getAttribute('aria-expanded')).toBe('false');
    });

    it('AC-022: NS-1 reads the new text and keeps its rule', async () => {
        const container = await open(detailView({}, { rule: 'NS-1', text: 'Studio cannot read this spec. See the problem below.' }, [PROBLEM]));
        expect(section(container, 'Next step').textContent).toContain('Studio cannot read this spec. See the problem below.');
        expect(container.querySelector('.detail-problems')?.textContent).toContain(PROBLEM.reason);
    });
});

describe('0022 AC-013, AC-015, AC-002, AC-003: sentences and breaking paths in the detail', () => {
    const REASON = 'Folder done/ does not match status "In Progress".';
    const SENTENCE = 'The spec sits in the done folder, but its status says it is still in progress.';

    it('AC-013: a Problem with a file shows its sentence as the link; the tooltip and description hold the reason, then the open text on its own line', async () => {
        const container = await open(spec({}, undefined, [{ reason: REASON, sentence: SENTENCE, open: { key: SPEC_KEY, line: 1 } }]));
        const item = container.querySelector('.detail-problems li')!;
        const link = item.querySelector<HTMLButtonElement>('button.file-link')!;
        expect(link.textContent).toBe(SENTENCE);
        expect(link.getAttribute('title')).toBe(`${REASON}\nOpen 0007-thing.md at line 1`);
        expect(item.querySelector('.visually-hidden')?.textContent).toBe(`${REASON}\nOpen 0007-thing.md at line 1`);
        expect(textOf(item)).toBe(SENTENCE);
    });

    it('AC-013: a Problem without a file shows its sentence with the reason as tooltip', async () => {
        const container = await open(spec({}, undefined, [{ reason: REASON, sentence: SENTENCE }]));
        const item = container.querySelector('.detail-problems li')!;
        expect(item.querySelector('button')).toBeNull();
        expect(item.querySelector('[title]')?.getAttribute('title')).toBe(REASON);
        expect(textOf(item)).toBe(SENTENCE);
    });

    it('AC-013: a Problem with no sentence shows its reason', async () => {
        const container = await open(spec({}, undefined, [{ reason: REASON }]));
        expect(textOf(container.querySelector('.detail-problems li')!)).toBe(REASON);
    });

    it('AC-003: a Problem keeps its full text in the DOM, however long', async () => {
        const long = `${SENTENCE} `.repeat(6).trim();
        const container = await open(spec({}, undefined, [{ reason: REASON, sentence: long }]));
        expect(textOf(container.querySelector('.detail-problems li')!)).toBe(long);
    });

    it('AC-002: the detail path, a Files link and the path in a next-step line break after a separator and keep their text', async () => {
        const container = await open(spec({ path: '.specs/backlog/0007-thing.md' }, { rule: 'NS-5', lines: [{ text: '/sdd-plan .specs/backlog/0007-thing.md', intent: 'Write the plan' }] }));
        const path = container.querySelector('.detail-path')!;
        expect(path.textContent).toBe('.specs/backlog/0007-thing.md');
        expect(path.querySelectorAll('wbr').length).toBeGreaterThan(0);
        const file = section(container, 'Files').querySelector('button.file-link')!;
        expect(file.querySelectorAll('wbr').length).toBeGreaterThan(0);
        const line = container.querySelector('.next-step-lines code')!;
        expect(line.textContent).toBe('/sdd-plan .specs/backlog/0007-thing.md');
        expect(line.innerHTML.startsWith('/sdd-plan .')).toBe(true);
        expect(line.querySelectorAll('wbr').length).toBeGreaterThan(0);
        expect(container.querySelector('.next-step-copy')?.getAttribute('aria-label')).toBe('Copy prompt: /sdd-plan .specs/backlog/0007-thing.md');
    });
});


describe('0021 AC-009, AC-010: the coach line in the detail', () => {
    const TIPS = { coach: 'new chat · strong model, other family', about: ['one', 'two', 'three', 'four'] };
    const LINES = [
        { text: '/sdd-compile k', intent: 'Have the result verified' },
        { text: '/sdd-lifecycle k', intent: 'Then, after a READY verdict: close the spec' },
    ];

    function items(container: HTMLElement): HTMLElement[] {
        return [...container.querySelectorAll<HTMLElement>('.next-step ul.next-step-lines > li')];
    }

    it('shows one coach line, in the first line, directly after its Copy prompt and the status region of the Copy', async () => {
        const container = await open(detailView({}, { rule: 'NS-5', lines: LINES, tips: TIPS }));
        const [first, second] = items(container);
        const coach = first!.querySelector('p.step-coach')!;
        expect(coach.textContent).toBe('new chat · strong model, other family');
        const copy = first!.querySelector('button.next-step-copy')!;
        expect(copy.nextElementSibling?.getAttribute('role')).toBe('status');
        expect(copy.nextElementSibling?.nextElementSibling).toBe(coach);
        expect(second!.querySelector('.step-coach')).toBeNull();
        expect(container.querySelectorAll('.step-coach')).toHaveLength(1);
    });

    it('shows no coach line without tips, and the intents, prompts and Copy buttons equal those of the true case', async () => {
        const withTips = await open(detailView({}, { rule: 'NS-5', lines: LINES, tips: TIPS }));
        const withHtml = items(withTips).map((item) => item.innerHTML.replace(/<p class="step-coach">.*?<\/p>/, ''));
        const without = await open(detailView({}, { rule: 'NS-5', lines: LINES }));
        expect(without.querySelector('.step-coach')).toBeNull();
        expect(items(without).map((item) => item.innerHTML)).toEqual(withHtml);
    });

    it('a rule with text only shows no coach line', async () => {
        const container = await open(detailView({}, { rule: 'NS-3', text: NEXT_STEP_DONE_TEXT }));
        expect(container.querySelector('.step-coach')).toBeNull();
    });
});

describe('0021 AC-014, AC-015, AC-009, AC-010: the About this step toggletip in the detail', () => {
    const ABOUT = ['It checks the work.', 'New chat: the reviewer should not know the build.', 'A strong model reads it best.', 'Nothing changes on disk.'];
    const TIPS = { coach: 'new chat · strong model, other family', about: ABOUT };
    const LINES = [
        { text: '/sdd-compile k', intent: 'Have the result verified' },
        { text: '/sdd-lifecycle k', intent: 'Then, after a READY verdict: close the spec' },
    ];

    it('shows one question-mark button in the section head directly after the heading, named About this step', async () => {
        const container = await open(detailView({}, { rule: 'NS-5', lines: LINES, tips: TIPS }));
        const head = container.querySelector('.next-step .section-head')!;
        const toggle = head.querySelector<HTMLButtonElement>('button.toggletip')!;
        expect(head.querySelector('h3')!.nextElementSibling).toBe(toggle);
        expect(toggle.textContent).toBe('?');
        expect(toggle.getAttribute('aria-label')).toBe(ABOUT_STEP_LABEL);
        expect(toggle.title).toBe(ABOUT_STEP_LABEL);
        expect(container.querySelectorAll('button.toggletip')).toHaveLength(1);
    });

    it('opens the four paragraphs literally, in order, in the region directly after the button; Copy prompt buttons stay', async () => {
        const container = await open(detailView({}, { rule: 'NS-5', lines: LINES, tips: TIPS }));
        const toggle = container.querySelector<HTMLButtonElement>('button.toggletip')!;
        await click(toggle);
        const region = toggle.nextElementSibling!;
        expect(region.getAttribute('role')).toBe('status');
        expect([...region.querySelectorAll('p')].map((paragraph) => paragraph.textContent)).toEqual(ABOUT);
        expect(container.querySelectorAll('button.next-step-copy')).toHaveLength(2);
        expect(region.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0);
    });

    it('shows no question-mark button without tips or for a rule with text only', async () => {
        const without = await open(detailView({}, { rule: 'NS-5', lines: LINES }));
        expect(without.querySelector('.toggletip')).toBeNull();
        mounted!.unmount();
        const text = await open(detailView({}, { rule: 'NS-3', text: NEXT_STEP_DONE_TEXT }));
        expect(text.querySelector('.toggletip')).toBeNull();
    });
});

describe('0024 AC-003, AC-002: the split button at the first next-step line only', () => {
    const SEND_A = { assistant: 'copilot', target: 'new', targets: ['new', 'current'] } satisfies SendView;
    const TWO_LINES: NextStepView = {
        rule: 'NS-6',
        lines: [
            { text: 'Implement T-003 of .specs/active/0007-thing.plan.md', intent: 'Continue with T-003' },
            { text: '/sdd-plan .specs/active/0007-thing.md', intent: 'Not sure where it stands? Let the agent report first' },
        ],
        send: SEND_A,
    };

    it('the first line shows Send to Copilot and its arrow part; the second line keeps its secondary Copy prompt; one split button in the detail', async () => {
        const container = await open(spec({}, TWO_LINES));
        const next = section(container, 'Next step');
        expect(next.querySelectorAll('.send-split')).toHaveLength(1);
        const lines = [...next.querySelectorAll('.next-step-lines li')];
        expect(lines[0]!.querySelector('.send-split button.send-main')?.textContent).toBe('Send to Copilot');
        expect(lines[0]!.querySelector('button.copy-button:not(.send-main)')).toBeNull();
        expect(lines[0]!.querySelector('.send-arrow')?.getAttribute('aria-label')).toBe('More actions: Implement T-003 of .specs/active/0007-thing.plan.md');
        expect(lines[1]!.querySelector('.send-split')).toBeNull();
        expect(lines[1]!.querySelector('button.copy-secondary')?.textContent).toBe('Copy prompt');
        expect(container.querySelectorAll('.send-split')).toHaveLength(1);
    });

    it('without a send view the DOM is the 0021 render: a primary Copy prompt on the first line and no Send control anywhere', async () => {
        const container = await open(spec({}, { ...TWO_LINES, send: undefined } as NextStepView));
        const next = section(container, 'Next step');
        expect(next.querySelector('.send-split, .send-arrow, [role="menu"]')).toBeNull();
        expect(next.querySelector('li button.copy-button')?.textContent).toBe('Copy prompt');
        expect([...container.querySelectorAll('button')].filter((button) => /^(Send|More actions)/.test(button.textContent ?? '') || /^(Send|More actions)/.test(button.getAttribute('aria-label') ?? ''))).toEqual([]);
        const text = spec({}, { rule: 'NS-3', text: 'Nothing to do.' });
        const textOnly = await open(text);
        expect(textOnly.querySelector('.send-split')).toBeNull();
    });

    it('the main part posts one sendPrompt with assistant, default target and the first line; the arrow item posts the other target', async () => {
        const container = await open(spec({}, TWO_LINES));
        await click(container.querySelector('button.send-main')!);
        expect(requests('sendPrompt')).toEqual([{ assistant: 'copilot', target: 'new', line: 'Implement T-003 of .specs/active/0007-thing.plan.md', token: expect.stringMatching(/^[A-Za-z0-9-]{1,64}$/) }]);
        await click(container.querySelector('button.send-arrow')!);
        await click([...container.querySelectorAll<HTMLElement>('[role^="menuitem"]')][1]!);
        expect(requests('sendPrompt')[1]).toEqual({ assistant: 'copilot', target: 'current', line: 'Implement T-003 of .specs/active/0007-thing.plan.md', token: expect.stringMatching(/^[A-Za-z0-9-]{1,64}$/) });
        expect((requests('sendPrompt')[1] as { token: string }).token).not.toBe((requests('sendPrompt')[0] as { token: string }).token);
        expect(requests('copyText')).toEqual([]);
    });

    it('a sendResult event shows Opened in Copilot at the main part; the Copy prompt item posts copyText and shows Copied there', async () => {
        const container = await open(spec({}, TWO_LINES));
        await click(container.querySelector('button.send-main')!);
        await send(sendResultEvent('opened', "The prompt is in Copilot's chat. Check it, then send it there.", (requests('sendPrompt')[0] as { token: string }).token));
        expect(container.querySelector('button.send-main')?.textContent).toBe('Opened in Copilot');
        expect(container.querySelector('.send-split [role="status"]')?.textContent).toBe("The prompt is in Copilot's chat. Check it, then send it there.");
        await click(container.querySelector('button.send-arrow')!);
        await click([...container.querySelectorAll<HTMLElement>('[role^="menuitem"]')][2]!);
        expect(requests('copyText')).toEqual([{ text: 'Implement T-003 of .specs/active/0007-thing.plan.md' }]);
        await send(copyResultEvent(true, COPIED_TEXT));
        expect(container.querySelector('button.send-main')?.textContent).toBe('Copied');
    });
});

describe('0024 AC-010: focus when the offer changes', () => {
    const WITH: NextStepView = {
        rule: 'NS-6',
        lines: [
            { text: 'Implement T-003 of .specs/active/0007-thing.plan.md', intent: 'Continue with T-003' },
            { text: '/sdd-plan .specs/active/0007-thing.md', intent: 'Not sure where it stands? Let the agent report first' },
        ],
        send: { assistant: 'copilot', target: 'new', targets: ['new', 'current'] },
    };
    const WITHOUT = { ...WITH, send: undefined } as NextStepView;
    const OTHER = { ...WITH, send: { assistant: 'claudeCode', target: 'new', targets: ['new'] } } satisfies NextStepView;
    const focusOn = async (element: HTMLElement): Promise<void> => {
        await act(async () => element.focus());
    };

    it('an offer that goes away moves focus from the main part, the arrow part or a menu item to the Copy prompt that replaces it', async () => {
        for (const place of ['main', 'arrow', 'item'] as const) {
            const container = await open(spec({}, WITH));
            const arrow = container.querySelector<HTMLButtonElement>('button.send-arrow')!;
            if (place === 'main') {
                await focusOn(container.querySelector<HTMLElement>('button.send-main')!);
            } else if (place === 'arrow') {
                await focusOn(arrow);
            } else {
                await click(arrow);
                expect(document.activeElement?.getAttribute('role')).toMatch(/^menuitem/);
            }
            await send(detailEvent(spec({}, WITHOUT)));
            const copy = container.querySelector<HTMLElement>('.next-step-lines li button.copy-button')!;
            expect(container.querySelector('.send-split, [role="menu"]'), place).toBeNull();
            expect(document.activeElement, place).toBe(copy);
            expect(copy.textContent, place).toBe('Copy prompt');
            mounted?.unmount();
            mounted = undefined;
            clients.splice(0).forEach((client) => client.stop());
        }
    });

    it('an assistant change keeps the split button, closes the menu and moves focus to the arrow part', async () => {
        const container = await open(spec({}, WITH));
        await click(container.querySelector('button.send-arrow')!);
        expect(container.querySelector('[role="menu"]')).not.toBeNull();
        await send(detailEvent(spec({}, OTHER)));
        expect(container.querySelector('[role="menu"]')).toBeNull();
        expect(container.querySelector('button.send-main')?.textContent).toBe('Send to Claude Code');
        expect(document.activeElement).toBe(container.querySelector('button.send-arrow'));
    });

    it('focus elsewhere stays when the offer goes away or changes', async () => {
        const container = await open(spec({}, WITH));
        const secondary = container.querySelector<HTMLElement>('button.copy-secondary')!;
        await focusOn(secondary);
        await send(detailEvent(spec({}, OTHER)));
        expect(document.activeElement).toBe(secondary);
        await send(detailEvent(spec({}, WITHOUT)));
        expect(document.activeElement).toBe(secondary);
    });

    it('a new offer appearing does not take focus', async () => {
        const container = await open(spec({}, WITHOUT));
        const secondary = container.querySelector<HTMLElement>('button.copy-secondary')!;
        await focusOn(secondary);
        await send(detailEvent(spec({}, WITH)));
        expect(container.querySelector('.send-split')).not.toBeNull();
        expect(document.activeElement).toBe(secondary);
    });
});

describe('0024 AC-010: focus is decided at the moment of the change, also after the webview lost the window focus', () => {
    const WITH: NextStepView = {
        rule: 'NS-6',
        lines: [
            { text: 'Implement T-003 of .specs/active/0007-thing.plan.md', intent: 'Continue with T-003' },
            { text: '/sdd-plan .specs/active/0007-thing.md', intent: 'Not sure where it stands? Let the agent report first' },
        ],
        send: { assistant: 'copilot', target: 'new', targets: ['new', 'current'] },
    };
    const WITHOUT = { ...WITH, send: undefined } as NextStepView;
    const OTHER = { ...WITH, send: { assistant: 'claudeCode', target: 'new', targets: ['new'] } } satisfies NextStepView;
    const focusOn = async (element: HTMLElement): Promise<void> => {
        await act(async () => element.focus());
    };
    const windowBlur = async (element: HTMLElement): Promise<void> => {
        await act(async () => {
            element.dispatchEvent(new FocusEvent('blur', { relatedTarget: null }));
            element.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
            await Promise.resolve();
        });
    };
    const reset = (): void => {
        mounted?.unmount();
        mounted = undefined;
        clients.splice(0).forEach((client) => client.stop());
    };

    it.each(['main', 'arrow', 'item'] as const)('the offer goes away after a window blur with focus on the %s part: focus goes to the Copy prompt that replaces it', async (place) => {
        const container = await open(spec({}, WITH));
        const arrow = container.querySelector<HTMLButtonElement>('button.send-arrow')!;
        if (place === 'main') {
            await focusOn(container.querySelector<HTMLElement>('button.send-main')!);
        } else if (place === 'arrow') {
            await focusOn(arrow);
        } else {
            await click(arrow);
        }
        const held = document.activeElement as HTMLElement;
        await windowBlur(held);
        expect(document.activeElement).toBe(held);
        await send(detailEvent(spec({}, WITHOUT)));
        expect(document.activeElement).toBe(container.querySelector('.next-step-lines li button.copy-button'));
        reset();
    });

    it.each(['main', 'arrow', 'first item', 'item that leaves'] as const)('the assistant changes after a window blur with focus on the %s: focus goes to the arrow part and the menu closes', async (place) => {
        const container = await open(spec({}, WITH));
        if (place === 'main') {
            await focusOn(container.querySelector<HTMLElement>('button.send-main')!);
        } else if (place === 'arrow') {
            await focusOn(container.querySelector<HTMLElement>('button.send-arrow')!);
        } else {
            await click(container.querySelector('button.send-arrow')!);
            if (place === 'item that leaves') {
                await focusOn([...container.querySelectorAll<HTMLElement>('[role^="menuitem"]')][1]!);
            }
        }
        await windowBlur(document.activeElement as HTMLElement);
        await send(detailEvent(spec({}, OTHER)));
        expect(container.querySelector('[role="menu"]')).toBeNull();
        expect(document.activeElement).toBe(container.querySelector('button.send-arrow'));
        reset();
    });

    it('focus elsewhere stays: a pointer press on the second line while the menu is open, then the offer goes away or changes', async () => {
        for (const next of [WITHOUT, OTHER]) {
            const container = await open(spec({}, WITH));
            await click(container.querySelector('button.send-arrow')!);
            const secondary = container.querySelector<HTMLElement>('button.copy-secondary')!;
            await act(async () => {
                secondary.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
            });
            await focusOn(secondary);
            await send(detailEvent(spec({}, next)));
            expect(document.activeElement).toBe(secondary);
            reset();
        }
    });

    it('focus on the second line stays after a window blur when the offer goes away', async () => {
        const container = await open(spec({}, WITH));
        const secondary = container.querySelector<HTMLElement>('button.copy-secondary')!;
        await focusOn(secondary);
        await windowBlur(secondary);
        await send(detailEvent(spec({}, WITHOUT)));
        expect(document.activeElement).toBe(secondary);
    });
});

describe('0024 AC-010, 0019 AC-020: the focus handoff belongs to the place of the split button', () => {
    const SEND_VIEW_A: SendView = { assistant: 'copilot', target: 'new', targets: ['new', 'current'] };
    const FIRST = { text: 'Implement T-003 of .specs/active/0007-thing.plan.md', intent: 'Continue with T-003' };
    const SECOND = { text: '/sdd-plan .specs/active/0007-thing.md', intent: 'Not sure where it stands? Let the agent report first' };
    const PLAN: NextStepView = { rule: 'NS-6', lines: [{ text: '/sdd-plan .specs/active/0007-thing.md', intent: 'Write the plan' }], send: SEND_VIEW_A };
    const OPEN: NextStepView = { rule: 'NS-6', lines: [FIRST, SECOND], send: SEND_VIEW_A };
    const PLAN_WITH_SECOND: NextStepView = OPEN;
    const WITHOUT = (view: NextStepView): NextStepView => ({ ...view, send: undefined }) as NextStepView;
    const TEXT: NextStepView = { rule: 'NS-1', text: 'Nothing to do.' } as NextStepView;
    const focusOn = async (element: HTMLElement): Promise<void> => {
        await act(async () => element.focus());
    };

    it('the first line changes key and a second line appears while focus is on Send: focus goes to the heading, not to the new second Copy prompt', async () => {
        const container = await open(spec({}, PLAN));
        await focusOn(container.querySelector<HTMLElement>('button.send-main')!);
        await send(detailEvent(spec({}, OPEN)));
        expect(document.activeElement?.hasAttribute('data-detail-heading')).toBe(true);
        expect(document.activeElement?.classList.contains('copy-secondary')).toBe(false);
    });

    it('negative control: without any offer the same update lands on the heading too', async () => {
        const container = await open(spec({}, WITHOUT(PLAN)));
        await focusOn(container.querySelector<HTMLElement>('.next-step-lines button.copy-button')!);
        await send(detailEvent(spec({}, WITHOUT(OPEN))));
        expect(document.activeElement?.hasAttribute('data-detail-heading')).toBe(true);
    });

    it('the offer goes away and a second line appears in the same update: the Copy prompt of the same line takes the focus, not the new one', async () => {
        const container = await open(spec({}, PLAN_WITH_SECOND));
        const first: NextStepView = { rule: 'NS-6', lines: [FIRST], send: SEND_VIEW_A };
        await send(detailEvent(spec({}, first)));
        await focusOn(container.querySelector<HTMLElement>('button.send-main')!);
        await send(detailEvent(spec({}, WITHOUT(PLAN_WITH_SECOND))));
        const copies = [...container.querySelectorAll<HTMLElement>('.next-step-lines button.copy-button')];
        expect(copies).toHaveLength(2);
        expect(document.activeElement).toBe(copies[0]);
    });

    it('a Send that leaves with focus inside while no Copy prompt takes its place hands nothing over to a Copy prompt that mounts later', async () => {
        const container = await open(spec({}, PLAN));
        await focusOn(container.querySelector<HTMLElement>('button.send-main')!);
        await send(detailEvent(spec({}, TEXT)));
        expect(container.querySelector('.send-split, button.copy-button')).toBeNull();
        await send(detailEvent(spec({}, WITHOUT(OPEN))));
        expect(container.querySelectorAll('.next-step-lines button.copy-button')).toHaveLength(2);
        expect(document.activeElement?.classList.contains('copy-button')).toBe(false);
    });

    it('the offer goes away at the same line: the Copy prompt of that line takes the focus (kept)', async () => {
        const container = await open(spec({}, PLAN));
        await focusOn(container.querySelector<HTMLElement>('button.send-main')!);
        await send(detailEvent(spec({}, WITHOUT(PLAN))));
        expect(document.activeElement).toBe(container.querySelector('.next-step-lines button.copy-button'));
    });
});
