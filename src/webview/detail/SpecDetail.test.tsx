import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../shared/protocol/envelope';
import { fileNotFoundText, HISTORY_NOT_AVAILABLE_TEXT, NO_DETAIL_SELECTION_TEXT, NO_PLAN_TEXT, NO_REQUIREMENTS_TEXT } from '../../shared/protocol/texts';
import { App } from '../App';
import { createClient, type ShellClient } from '../client';
import { baseView, click, isKeyboardReachable, mount, pressKey, send, shellEvent, type Mounted } from '../testing/dom';
import { resetSectionMemory } from './sectionMemory';
import { copyResultEvent, detailEvent, detailView, openFileResultEvent, PLAN_KEY, sections, SPEC_KEY } from './testing/views';
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

function openButtons(root: Element): HTMLButtonElement[] {
    return [...root.querySelectorAll<HTMLButtonElement>('button')].filter((button) => button.textContent === 'Open file');
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

describe('AC-010: the seven sections', () => {
    it('shows the heading of the spec and the sections in order, each under a heading', async () => {
        const container = await open();
        expect(container.querySelector('h2')?.textContent).toContain('0007');
        expect(container.querySelector('h2')?.textContent).toContain('Thing 0007');
        expect([...container.querySelectorAll('h3')].map((heading) => heading.textContent)).toEqual([
            'Next step',
            'Overview',
            'Requirements',
            'Acceptance criteria',
            'Plan & tasks',
            'Verification',
            'Related artifacts',
            'Status history',
        ]);
    });

    it('Overview shows header lines, state, rule, persistence, priority and the format notes behind a toggle', async () => {
        const text = section(await open(), 'Overview').textContent!;
        expect(text).toContain('Status');
        expect(text).toContain('In Progress');
        expect(text).toContain('Active');
        expect(text).not.toMatch(/S-ACTIVE|persisted/);
        expect(section(await open(), 'Overview').querySelector('.state-chip')?.getAttribute('title')).toBe('Read from the files · rule S-ACTIVE');
        expect(text).not.toMatch(/Priority|verdict/i);
        expect(text).toContain('Plan has no Verified line');
    });

    it('Overview shows the needs, no readiness checklist, and the successor of a deprecated spec', async () => {
        const base = sections().overview;
        const container = await open(
            detailView({
                overview: { ...base, deprecated: true, successor: 'Successor: 0009-new', needs: [{ text: 'needs acceptance criteria', rule: 'R-2' }, { text: 'needs a plan', rule: 'R-3' }] },
            }),
        );
        const text = section(container, 'Overview').textContent!;
        expect(text).toContain('Deprecated');
        expect(text).toContain('Successor: 0009-new');
        const needs = [...section(container, 'Overview').querySelectorAll('.detail-needs li')];
        expect(needs.map((item) => item.textContent)).toEqual(['needs acceptance criteria', 'needs a plan']);
        expect(needs.map((item) => item.getAttribute('title'))).toEqual(['Not Ready yet · rule R-2', 'Not Ready yet · rule R-3']);
        expect(needs.every((item) => item.querySelector('svg') === null)).toBe(true);
        expect(section(container, 'Overview').querySelector('.detail-checks')).toBeNull();
        expect(text).not.toMatch(/R-1|Inter-spec|failed/);
    });

    it('Plan shows stages, steps with tick state, struck and the Verified text', async () => {
        const text = section(await open(), 'Plan & tasks').textContent!;
        expect(text).toContain('1. T-001 → T-002');
        expect(text).toContain('T-001');
        expect(text).toContain('First step');
        expect(text).toContain('tests green');
        expect(text).toContain('done');
        expect(text).toContain('open');
        expect(text).toContain('undetermined');
        expect(text).toContain('struck');
    });

    it('Verification shows the counts, the summary, the criteria progress and no verdict line', async () => {
        const text = section(await open(), 'Verification').textContent!;
        expect(text).toContain('3 of 6 rows verified');
        expect(text).toContain('Criteria: 3 of 6 verified');
        expect(text).not.toMatch(/verdict/i);
        expect(text).toContain('open 1');
        expect(text).toContain('built 2');
        expect(text).toContain('verified 3');
    });

    it('Related shows the artifacts, and a hint when there are none', async () => {
        const container = await open();
        expect(section(container, 'Related artifacts').textContent).toContain('0007-thing.plan.md');
        const empty = await (async () => {
            mounted?.unmount();
            return open(detailView({ related: [] }));
        })();
        expect(section(empty, 'Related artifacts').textContent).toContain('No related artifacts');
    });
});

describe('AC-009: criteria and requirements as delivered', () => {
    it('shows each criterion with its text, its Given/When/Then and both flags', async () => {
        const container = await open();
        const items = [...section(container, 'Acceptance criteria').querySelectorAll('li')];
        expect(items).toHaveLength(2);
        expect(items[0]!.textContent).toContain('AC-001');
        expect(items[0]!.textContent).toContain('The board shall render.');
        expect(items[0]!.textContent).toContain('Given a project, when opened, then six columns');
        expect(items[0]!.textContent).not.toContain('uncertain');
        expect(items[0]!.textContent).not.toContain('struck');
        expect(items[1]!.textContent).toContain('uncertain');
        expect(items[1]!.textContent).toContain('struck');
    });

    it('shows each requirement with its id and text', async () => {
        const text = section(await open(), 'Requirements').textContent!;
        expect(text).toContain('FR-01');
        expect(text).toContain('Show the board');
    });

    it('says so and still offers Open file on the spec when there are no requirements', async () => {
        const container = await open(detailView({ requirements: { open: { key: SPEC_KEY }, items: [] } }));
        const requirements = section(container, 'Requirements');
        expect(requirements.textContent).toContain(NO_REQUIREMENTS_TEXT);
        expect(openButtons(requirements)).toHaveLength(1);
    });
});

describe('AC-010: Open file exactly where a file is named', () => {
    it('is offered for the spec, the plan, related artifacts, items and diagnostics', async () => {
        const container = await open();
        expect(openButtons(section(container, 'Overview'))).toHaveLength(1);
        expect(openButtons(section(container, 'Requirements'))).toHaveLength(1);
        expect(openButtons(section(container, 'Acceptance criteria'))).toHaveLength(1);
        expect(openButtons(section(container, 'Plan & tasks'))).toHaveLength(1);
        expect(openButtons(section(container, 'Verification'))).toHaveLength(1);
        expect(openButtons(section(container, 'Related artifacts'))).toHaveLength(0);
        expect([...section(container, 'Related artifacts').querySelectorAll('button.related-link')].map((button) => button.textContent)).toEqual(['0007-thing.plan.md']);
    });

    it('is never offered for the status history or No plan yet', async () => {
        const noPlan = detailView({
            plan: { open: undefined, stages: [], steps: [] },
            verification: { ...sections().verification, open: undefined },
        });
        const container = await open(noPlan);
        expect(section(container, 'Plan & tasks').textContent).toContain(NO_PLAN_TEXT);
        expect(openButtons(section(container, 'Plan & tasks'))).toHaveLength(0);
        expect(openButtons(section(container, 'Verification'))).toHaveLength(0);
        expect(openButtons(section(container, 'Status history'))).toHaveLength(0);
    });

    it('0013 AC-013: sends openFile with the key of the section\'s file and no line', async () => {
        const container = await open();
        await click(openButtons(section(container, 'Overview'))[0]!);
        await click(openButtons(section(container, 'Acceptance criteria'))[0]!);
        await click(section(container, 'Related artifacts').querySelector('button.related-link')!);
        expect(requests('openFile')).toEqual([{ key: SPEC_KEY }, { key: SPEC_KEY }, { key: PLAN_KEY }]);
    });

    it('the buttons are keyboard-operable', async () => {
        const container = await open();
        const button = openButtons(section(container, 'Plan & tasks'))[0]!;
        expect(isKeyboardReachable(button)).toBe(true);
        await pressKey(button, 'Enter');
        expect(requests('openFile')).toEqual([{ key: PLAN_KEY }]);
    });

    it('shows the not-found text in the status line of the section that holds the file', async () => {
        const container = await open();
        await send(openFileResultEvent(PLAN_KEY, fileNotFoundText(PLAN_KEY)));
        const status = section(container, 'Plan & tasks').querySelector('[role="status"]')!;
        expect(status.textContent).toBe(fileNotFoundText(PLAN_KEY));
        expect(section(container, 'Overview').querySelector('[role="status"]')?.textContent ?? '').toBe('');
    });

    it('a new detail view clears the message', async () => {
        const container = await open();
        await send(openFileResultEvent(PLAN_KEY, fileNotFoundText(PLAN_KEY)));
        await send(detailEvent(detailView()));
        expect(container.textContent).not.toContain(fileNotFoundText(PLAN_KEY));
    });
});

describe('0015 AC-012: Status history', () => {
    it('lists the labelled status history and no run', async () => {
        const text = section(await open(), 'Status history').textContent!;
        expect(text).toContain('Observed by Studio while it was running — not a reconstruction');
        expect(text).toContain('Ready');
        expect(text).toContain('S-ACTIVE');
        expect(text).not.toContain('claude');
        expect(text).not.toContain('Runs: not available');
        expect(text).not.toContain('No run');
    });

    it('shows not available with the reason while the history is not available', async () => {
        const base = sections().history;
        const reason = "Status history not available: Another VS Code window holds the write lock for this project's status history.";
        const text = section(await open(detailView({ history: { ...base, statusHistory: undefined, notAvailable: reason } })), 'Status history').textContent!;
        expect(text).toContain(reason);
        expect(text).not.toContain('Observed by Studio');
    });

    it('shows not available even when the reason is missing', async () => {
        const base = sections().history;
        const text = section(await open(detailView({ history: { ...base, statusHistory: undefined } })), 'Status history').textContent!;
        expect(text).toContain(HISTORY_NOT_AVAILABLE_TEXT);
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
            moved.sections.overview.state = 'Done';
        }
        await send(detailEvent(moved));
        expect(container.querySelector('h2')?.textContent).toContain('Thing 0007');
        expect(section(container, 'Overview').textContent).toContain('Done');
    });
});

describe('AC-010: the Overview header lines', () => {
    it('each header line is one wrapper holding its label and its value, so a row can lay them side by side', async () => {
        const container = await open();
        const rows = [...container.querySelector('dl.detail-header')!.children];
        expect(rows.map((row) => [...row.children].map((child) => child.tagName))).toEqual([['DT', 'DD'], ['DT', 'DD']]);
        expect(rows.map((row) => row.textContent)).toEqual(['Status In Progress', 'Plan 0007-thing.plan.md']);
    });
});

describe('0013 AC-012, AC-013, AC-010: collapsible sections, detail header, Overview rules', () => {
    function toggle(container: HTMLElement, title: string): HTMLButtonElement {
        return section(container, title).querySelector<HTMLButtonElement>('h3 > button')!;
    }

    it('AC-012: the heading holds one toggle button; activating it hides the body and sets aria-expanded; again shows it', async () => {
        const container = await open();
        const button = toggle(container, 'Acceptance criteria');
        expect(button.parentElement?.children).toHaveLength(1);
        expect(button.getAttribute('aria-expanded')).toBe('true');
        const body = container.querySelector<HTMLElement>(`#${button.getAttribute('aria-controls')!}`)!;
        expect(body.hidden).toBe(false);
        expect(body.textContent).toContain('The board shall render.');
        await click(button);
        expect(button.getAttribute('aria-expanded')).toBe('false');
        expect(body.hidden).toBe(true);
        await pressKey(button, 'Enter');
        expect(button.getAttribute('aria-expanded')).toBe('true');
        expect(body.hidden).toBe(false);
    });

    it('AC-012: all sections start expanded; a collapsed section stays collapsed after another spec is selected', async () => {
        const container = await open();
        for (const title of ['Overview', 'Requirements', 'Acceptance criteria', 'Plan & tasks', 'Verification', 'Related artifacts', 'Status history']) {
            expect(toggle(container, title).getAttribute('aria-expanded'), title).toBe('true');
        }
        await click(toggle(container, 'Acceptance criteria'));
        const other = detailView();
        if (other.kind === 'spec') {
            other.key = '.specs/active/0008-other.md';
            other.stem = '0008-other';
            other.number = '0008';
            other.title = 'Other 0008';
        }
        await send(detailEvent(other));
        expect(container.querySelector('h2')?.textContent).toContain('Other 0008');
        expect(toggle(container, 'Acceptance criteria').getAttribute('aria-expanded')).toBe('false');
        expect(toggle(container, 'Requirements').getAttribute('aria-expanded')).toBe('true');
    });

    it('AC-013: no Open file per requirement, criterion or diagnostic; the Open file of a section sits in its heading row', async () => {
        const container = await open();
        for (const title of ['Overview', 'Requirements', 'Acceptance criteria']) {
            const root = section(container, title);
            expect(root.querySelectorAll('li button')).toHaveLength(0);
            expect(openButtons(root)[0]?.closest('.section-head')).not.toBeNull();
        }
    });

    it('AC-003: toggles, section Open file buttons and related links are native buttons in the Tab order', async () => {
        const container = await open();
        const controls = [...container.querySelectorAll<HTMLButtonElement>('h3 > button, .section-head .open-file, button.related-link')];
        expect(controls.length).toBe(7 + 5 + 1);
        controls.forEach((control) => {
            expect(control.tagName).toBe('BUTTON');
            expect(isKeyboardReachable(control)).toBe(true);
        });
    });

    it('detail header: number chip, title, state chip and one Open file for the spec', async () => {
        const container = await open();
        const header = container.querySelector('.detail-title')!;
        expect(header.querySelector('.detail-number')?.textContent).toBe('0007');
        expect(header.querySelector('h2')?.textContent).toContain('Thing 0007');
        expect(header.querySelector('.state-chip')?.textContent?.trim()).toBe('Active');
        expect(openButtons(header)).toHaveLength(1);
        await click(openButtons(header)[0]!);
        expect(requests('openFile')).toEqual([{ key: SPEC_KEY }]);
    });

    it('AC-010: the Overview shows a derived state with its sentence and rule ID', async () => {
        const base = sections().overview;
        const container = await open(detailView({ overview: { ...base, state: 'Review', rule: 'S-REVIEW', persistence: 'derived' } }));
        const overview = section(container, 'Overview');
        const sentences = [...overview.querySelectorAll('.rule-text')].map((rule) => [rule.querySelector('.rule-sentence')?.textContent, rule.querySelector('.rule-id')?.textContent]);
        expect(sentences).toEqual([['Plan done, waiting for review', undefined]]);
        expect(overview.querySelector('.rule-text')?.getAttribute('title')).toBe('Derived from the files · rule S-REVIEW');
        expect(overview.querySelector('.state-chip')?.hasAttribute('title')).toBe(false);
        expect(overview.textContent).not.toMatch(/S-REVIEW|persisted|derived/);
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

describe('0016 AC-006, AC-007, AC-016, AC-022: Problems, format notes and the title emphasis', () => {
    const PROBLEM = { reason: 'Folder done/ does not match status "In Progress".', open: { key: SPEC_KEY } };

    function notesToggle(container: HTMLElement): HTMLButtonElement {
        return container.querySelector<HTMLButtonElement>('.format-notes-toggle')!;
    }

    it('AC-006: each Problem shows with the warning icon directly below Next step and above Overview', async () => {
        const container = await open(detailView({}, undefined, [PROBLEM, { reason: 'plan link 0007-gone.plan.md points to a missing file' }]));
        const list = container.querySelector('.detail-problems')!;
        expect([...list.querySelectorAll('li')].map((item) => item.textContent)).toEqual([PROBLEM.reason, 'plan link 0007-gone.plan.md points to a missing file']);
        expect([...list.querySelectorAll('li svg')]).toHaveLength(2);
        const nextStep = section(container, 'Next step');
        expect(nextStep.nextElementSibling).toBe(list);
        expect(list.nextElementSibling).toBe(section(container, 'Overview'));
        expect(list.querySelector('button')).toBeNull();
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
        expect(list.textContent).toBe('Plan has no Verified line');
        expect(list.querySelector('button')).toBeNull();
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
        const base = sections().overview;
        const many = await open(detailView({ overview: { ...base, notes: [{ reason: 'a' }, { reason: 'b' }, { reason: 'c' }] } }));
        expect(notesToggle(many).textContent).toBe('3 format notes — no action needed');
        const none = await open(detailView({ overview: { ...base, notes: [] } }));
        expect(none.querySelector('.format-notes-toggle')).toBeNull();
    });

    it('AC-007: the toggle is collapsed again when another spec is shown', async () => {
        const container = await open();
        await click(notesToggle(container));
        await send(detailEvent({ ...detailView(), key: 'other', stem: '0008-other' } as ReturnType<typeof detailView>));
        expect(notesToggle(container).getAttribute('aria-expanded')).toBe('false');
    });

    it('AC-016: a criterion whose title is bold shows it in <strong> with no asterisk left', async () => {
        const base = sections().criteria;
        const container = await open(
            detailView({
                criteria: { ...base, items: [{ id: 'AC-001', text: '**Events reach the broker without an intermediate table**\nWhen an order event occurs.', illustration: undefined, uncertain: false, struck: false, open: { key: SPEC_KEY } }] },
            }),
        );
        const item = section(container, 'Acceptance criteria').querySelector('li')!;
        expect(item.querySelector('strong:not(.item-id)')?.textContent).toBe('Events reach the broker without an intermediate table');
        expect(item.textContent).not.toContain('*');
        expect(item.querySelectorAll('.item-id')).toHaveLength(1);
    });

    it('AC-022: NS-1 reads the new text and keeps its rule', async () => {
        const container = await open(detailView({}, { rule: 'NS-1', text: 'Studio cannot read this spec. See the problem below.' }, [PROBLEM]));
        expect(section(container, 'Next step').textContent).toContain('Studio cannot read this spec. See the problem below.');
        expect(container.querySelector('.detail-problems')?.textContent).toContain(PROBLEM.reason);
    });
});
