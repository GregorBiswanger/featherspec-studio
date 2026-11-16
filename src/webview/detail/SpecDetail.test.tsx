import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../shared/protocol/envelope';
import { fileNotFoundText, HISTORY_NOT_AVAILABLE_TEXT, NO_DETAIL_SELECTION_TEXT, NO_PLAN_TEXT, NO_REQUIREMENTS_TEXT, PRIORITY_TEXT } from '../../shared/protocol/texts';
import { App } from '../App';
import { createClient, type ShellClient } from '../client';
import { baseView, click, isKeyboardReachable, mount, pressKey, send, shellEvent, type Mounted } from '../testing/dom';
import { detailEvent, detailView, openFileResultEvent, PLAN_KEY, sections, SPEC_KEY } from './testing/views';

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
            'Overview',
            'Requirements',
            'Acceptance criteria',
            'Plan & tasks',
            'Verification',
            'Related artifacts',
            'Agent history',
        ]);
    });

    it('Overview shows header lines, state, rule, persistence, priority and diagnostics', async () => {
        const text = section(await open(), 'Overview').textContent!;
        expect(text).toContain('Status');
        expect(text).toContain('In Progress');
        expect(text).toContain('Active');
        expect(text).toContain('S-ACTIVE');
        expect(text).toContain('persisted');
        expect(text).toContain(PRIORITY_TEXT);
        expect(text).toContain('Plan has no Verified line');
    });

    it('Overview shows readiness checks and the successor of a deprecated spec', async () => {
        const base = sections().overview;
        const container = await open(
            detailView({
                overview: { ...base, deprecated: true, successor: 'Successor: 0009-new', readiness: [{ id: 'R-1', result: 'fail', reason: 'No acceptance criteria' }, { id: 'R-2', result: 'pass', reason: undefined }] },
            }),
        );
        const text = section(container, 'Overview').textContent!;
        expect(text).toContain('Deprecated');
        expect(text).toContain('Successor: 0009-new');
        expect(text).toContain('R-1');
        expect(text).toContain('No acceptance criteria');
        expect(text).toContain('R-2');
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

    it('Verification shows the counts, the summary, the criteria progress and the compile verdict', async () => {
        const text = section(await open(), 'Verification').textContent!;
        expect(text).toContain('3 of 6 rows verified');
        expect(text).toContain('Criteria: 3 of 6 verified');
        expect(text).toContain('No compile verdict yet');
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
        expect(openButtons(section(container, 'Overview'))).toHaveLength(2);
        expect(openButtons(section(container, 'Requirements'))).toHaveLength(2);
        expect(openButtons(section(container, 'Acceptance criteria'))).toHaveLength(3);
        expect(openButtons(section(container, 'Plan & tasks'))).toHaveLength(1);
        expect(openButtons(section(container, 'Verification'))).toHaveLength(1);
        expect(openButtons(section(container, 'Related artifacts'))).toHaveLength(1);
    });

    it('is never offered for runs, status history or No plan yet', async () => {
        const noPlan = detailView({
            plan: { open: undefined, stages: [], steps: [] },
            verification: { ...sections().verification, open: undefined },
        });
        const container = await open(noPlan);
        expect(section(container, 'Plan & tasks').textContent).toContain(NO_PLAN_TEXT);
        expect(openButtons(section(container, 'Plan & tasks'))).toHaveLength(0);
        expect(openButtons(section(container, 'Verification'))).toHaveLength(0);
        expect(openButtons(section(container, 'Agent history'))).toHaveLength(0);
    });

    it('sends openFile with the key, and with the line where the item has one', async () => {
        const container = await open();
        await click(openButtons(section(container, 'Overview'))[0]!);
        await click(openButtons(section(container, 'Acceptance criteria'))[1]!);
        expect(requests('openFile')).toEqual([{ key: SPEC_KEY }, { key: SPEC_KEY, line: 40 }]);
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

describe('AC-027: Agent history', () => {
    it('lists runs as delivered with provider, status, timestamps and flags, and the labelled status history', async () => {
        const text = section(await open(), 'Agent history').textContent!;
        expect(text.indexOf('r2')).toBeLessThan(text.indexOf('r1'));
        expect(text).toContain('claude');
        expect(text).toContain('Running');
        expect(text).toContain('2026-11-16T10:00:00Z');
        expect(text).toContain('history incomplete');
        expect(text).toContain('history unreadable');
        expect(text).toContain('Observed by Studio while it was running — not a reconstruction');
        expect(text).toContain('Ready');
        expect(text).toContain('S-ACTIVE');
    });

    it('shows not available for both while the store is unavailable', async () => {
        const base = sections().history;
        const text = section(await open(detailView({ history: { ...base, runs: undefined, statusHistory: undefined } })), 'Agent history').textContent!;
        expect(text).toContain('Runs: not available');
        expect(text).toContain(HISTORY_NOT_AVAILABLE_TEXT);
    });

    it('shows a note for no runs', async () => {
        const base = sections().history;
        const text = section(await open(detailView({ history: { ...base, runs: [] } })), 'Agent history').textContent!;
        expect(text).toContain('No run');
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
