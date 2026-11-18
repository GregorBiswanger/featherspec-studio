import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../shared/protocol/envelope';
import type { NextStepView, SpecDetailView } from '../../shared/protocol/detail';
import { fileNotFoundText, HISTORY_NOT_AVAILABLE_TEXT, NO_DETAIL_SELECTION_TEXT, NO_PLAN_TEXT } from '../../shared/protocol/texts';
import { App } from '../App';
import { createClient, type ShellClient } from '../client';
import { baseView, click, isKeyboardReachable, mount, pressKey, send, shellEvent, type Mounted } from '../testing/dom';
import { resetSectionMemory } from './sectionMemory';
import { copyResultEvent, detailEvent, detailView, historySection, openFileResultEvent, PLAN_KEY, SPEC_KEY } from './testing/views';
import { COPIED_TEXT, COPY_FAILED_TEXT, NEXT_STEP_DONE_TEXT } from '../../shared/protocol/nextStepTexts';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(view = detailView()): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'specExplorer' }), 1));
    await send(detailEvent(view));
    return mounted.container;
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
        await send(detailEvent({ ...detailView(), key: '.specs/active/0008-other.md', stem: '0008-other', title: 'Other 0008' } as ReturnType<typeof detailView>));
        expect(historyToggle(container).getAttribute('aria-expanded')).toBe('true');
        expect(container.querySelector('.format-notes-toggle')!.getAttribute('aria-expanded')).toBe('false');
        await click(container.querySelector('.format-notes-toggle')!);
        await send(detailEvent({ kind: 'none' }));
        expect(container.querySelector('.format-notes-toggle')).toBeNull();
        await send(detailEvent(detailView()));
        expect(historyToggle(container).getAttribute('aria-expanded')).toBe('true');
        expect(container.querySelector('.format-notes-toggle')!.getAttribute('aria-expanded')).toBe('false');
    });

    it('control: a collapsed history stays collapsed across another spec', async () => {
        const container = await open();
        await send(detailEvent({ ...detailView(), key: '.specs/active/0008-other.md', stem: '0008-other' } as ReturnType<typeof detailView>));
        expect(historyToggle(container).getAttribute('aria-expanded')).toBe('false');
    });
});

describe('AC-028: the selection', () => {
    it('shows the hint and no spec content while nothing is selected', async () => {
        const container = await open({ kind: 'none' });
        expect(container.textContent).toContain(NO_DETAIL_SELECTION_TEXT);
        expect(container.querySelectorAll('h3')).toHaveLength(0);
        expect(container.querySelector('[aria-label="Spec detail"] button')).toBeNull();
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
    const TWO = { rule: 'NS-9', lines: [{ text: '/sdd-clarify .specs/backlog/0007-x.md' }, { text: '/sdd-plan .specs/backlog/0007-x.md', label: 'Then:' }] };

    function nextStepSection(container: HTMLElement): HTMLElement {
        return section(container, 'Next step');
    }

    function copyButtons(root: Element): HTMLButtonElement[] {
        return [...root.querySelectorAll<HTMLButtonElement>('button')].filter((button) => button.textContent === 'Copy');
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

    it('AC-003: two lines carry the label of the second one; a rule with text only shows the text and no button', async () => {
        const root = nextStepSection(await open(detailView({}, TWO)));
        expect(root.textContent).toContain('/sdd-clarify .specs/backlog/0007-x.md');
        expect(root.textContent).toContain('Then:');
        expect(copyButtons(root)).toHaveLength(2);
        const after = nextStepSection(await open(detailView({}, { rule: 'NS-5', lines: [{ text: '/sdd-compile k' }, { text: '/sdd-lifecycle k', label: 'Then, after a READY verdict:' }] })));
        expect(after.textContent).toContain('Then, after a READY verdict:');
        const done = nextStepSection(await open(detailView({}, { rule: 'NS-3', text: NEXT_STEP_DONE_TEXT })));
        expect(done.textContent).toContain('Done — no FeatherSpec step left.');
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
        await send(detailEvent({ ...detailView(), key: 'other', stem: '0008-other' } as ReturnType<typeof detailView>));
        expect(nextStepSection(container).textContent).not.toContain('Copied to the clipboard.');
        expect(nextStepSection(container).querySelector('button')!.textContent).toBe('Copy');
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
        await send(detailEvent({ ...detailView(), key: 'other', stem: '0008-other' } as ReturnType<typeof detailView>));
        expect(notesToggle(container).getAttribute('aria-expanded')).toBe('false');
    });

    it('AC-022: NS-1 reads the new text and keeps its rule', async () => {
        const container = await open(detailView({}, { rule: 'NS-1', text: 'Studio cannot read this spec. See the problem below.' }, [PROBLEM]));
        expect(section(container, 'Next step').textContent).toContain('Studio cannot read this spec. See the problem below.');
        expect(container.querySelector('.detail-problems')?.textContent).toContain(PROBLEM.reason);
    });
});
