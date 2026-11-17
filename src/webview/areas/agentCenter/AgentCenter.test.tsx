import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentCenterView, DetailView, RunRowView } from '../../../shared/protocol/agentCenter';
import type { Envelope } from '../../../shared/protocol/envelope';
import { sampleCenterView, sampleDetail, sampleRow } from '../../../shared/protocol/testing/agentCenterSample';
import { App } from '../../App';
import { createClient, type ShellClient } from '../../client';
import { agentCenterEvent, baseView, click, isKeyboardReachable, mount, pressKey, send, shellEvent, type Mounted } from '../../testing/dom';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(view?: AgentCenterView, restricted = false): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'agentCenter', restricted }), 1));
    if (view !== undefined) {
        await send(agentCenterEvent(view));
    }
    return mounted.container;
}

function requests(type: string): Envelope[] {
    return posted.filter((message) => message.kind === 'req' && message.type === type);
}

function ready(overrides: Partial<Extract<AgentCenterView, { kind: 'ready' }>> = {}, detail?: Partial<DetailView>, row?: Partial<RunRowView>): AgentCenterView {
    return sampleCenterView({ rows: [sampleRow(row)], detail: sampleDetail(detail), ...overrides });
}

function button(container: HTMLElement, label: string): HTMLButtonElement {
    const found = [...container.querySelectorAll<HTMLButtonElement>('button')].find((candidate) => candidate.textContent?.trim() === label);
    if (found === undefined) {
        throw new Error(`no button "${label}"`);
    }
    return found;
}

function hasButton(container: HTMLElement, label: string): boolean {
    return [...container.querySelectorAll('button')].some((candidate) => candidate.textContent?.trim() === label);
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    vi.useRealTimers();
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('the area is no placeholder', () => {
    it('shows its heading and an empty frame before the first view, and no placeholder text', async () => {
        const container = await open();
        expect(container.querySelector('h1')?.textContent).toBe('Agent Center');
        expect(container.querySelector('[data-placeholder]')).toBeNull();
        expect(container.querySelector('[data-agent-center-empty]')).not.toBeNull();
        expect(container.textContent).not.toContain('Not available in this version');
    });

    it('ignores an invalid view and keeps the last valid one', async () => {
        const container = await open(ready());
        await send(agentCenterEvent({ kind: 'ready', rows: 'x' }));
        await send(agentCenterEvent({ ...(ready() as object), extra: 'SECRET-1' }));
        expect(container.querySelector('[data-agent-center]')?.textContent).toContain('Spec Board');
        expect(container.textContent).not.toContain('SECRET-1');
    });
});

describe('AC-001, AC-004: the run list', () => {
    it('shows spec number and title, provider, status as text, start time, duration and the flags; the selected row is marked', async () => {
        const rows = [
            sampleRow({ runId: 'r-open', status: 'Running', started: new Date(2026, 10, 17, 10, 0, 0).toISOString() }),
            sampleRow({ runId: 'r-done', status: 'Completed', selected: false, started: new Date(2026, 10, 17, 9, 0, 0).toISOString(), ended: new Date(2026, 10, 17, 9, 2, 5).toISOString(), historyIncomplete: true }),
            sampleRow({ runId: 'r-bad', status: 'Failed', selected: false, historyUnreadable: true }),
        ];
        const container = await open(ready({ rows }));
        const items = [...container.querySelectorAll<HTMLElement>('[data-run-row]')];
        expect(items).toHaveLength(3);
        expect(items[0]?.textContent).toContain('0007');
        expect(items[0]?.textContent).toContain('Spec Board');
        expect(items[0]?.textContent).toContain('Fake provider');
        expect(items[0]?.textContent).toContain('Running');
        expect(items[0]?.textContent).toContain('2026-11-17 10:00');
        expect(items[0]?.getAttribute('aria-current')).toBe('true');
        expect(items[1]?.getAttribute('aria-current')).toBeNull();
        expect(items[1]?.textContent).toContain('2:05');
        expect(items[1]?.textContent).toContain('history incomplete');
        expect(items[2]?.textContent).toContain('history unreadable');
        expect(items[2]?.textContent).toContain('not available');
    });

    it('"spec not found" in the row for a run whose spec does not exist', async () => {
        const container = await open(ready({}, {}, { spec: { stem: '0099-gone', number: '0099', title: null, found: false } }));
        expect(container.querySelector('[data-run-row]')?.textContent).toContain('spec not found');
        expect(container.querySelector('[data-run-row]')?.textContent).toContain('0099-gone');
    });

    it('activating a row sends acSelect once with the run ID; Enter and Space on the row do the same', async () => {
        const rows = [sampleRow({ runId: 'r-1' }), sampleRow({ runId: 'r-2', selected: false })];
        const container = await open(ready({ rows }));
        const second = container.querySelectorAll<HTMLButtonElement>('[data-run-row]')[1]!;
        expect(isKeyboardReachable(second)).toBe(true);
        await click(second);
        expect(requests('acSelect').map((message) => message.payload)).toEqual([{ runId: 'r-2' }]);
        await pressKey(second, 'Enter');
        await pressKey(second, ' ');
        expect(requests('acSelect')).toHaveLength(3);
    });
});

describe('AC-027: states in the area', () => {
    it('the store unavailable shows "Runs: not available — <reason>" and no list', async () => {
        const container = await open({ kind: 'unavailable', reason: 'disk is full' });
        expect(container.textContent).toContain('Runs: not available — disk is full');
        expect(container.querySelector('[data-run-row]')).toBeNull();
        expect(container.textContent).not.toContain('No runs yet');
    });

    it('zero runs shows the start hint; no shell panel-state text appears inside the area', async () => {
        const container = await open(ready({ rows: [], detail: undefined, empty: 'no-runs' }));
        expect(container.querySelector('[data-agent-center]')?.textContent).toContain('No runs yet. Start one by moving a Ready spec to Active on the Spec Board.');
        expect(container.querySelector('[data-agent-center] .empty-state svg')).not.toBeNull();
        for (const shellText of ['Loading project', 'Open a folder', 'Restricted Mode']) {
            expect(container.querySelector('[data-agent-center]')?.textContent).not.toContain(shellText);
        }
    });

    it('a filter without a match shows the text, the filter label and "Clear filter", which sends acClearFilter', async () => {
        const container = await open(ready({ rows: [], detail: undefined, empty: 'no-match', filter: { stem: '0099-x', label: '0099' } }));
        expect(container.textContent).toContain('No runs match this filter');
        expect(container.textContent).toContain('Filter: 0099');
        await click(button(container, 'Clear filter'));
        expect(requests('acClearFilter')).toHaveLength(1);
    });

    it('a filter with runs shows its label and Clear filter beside the list', async () => {
        const container = await open(ready({ filter: { stem: '0007-board', label: '0007' } }));
        expect(container.querySelector('[data-filter]')?.textContent).toContain('Filter: 0007');
        expect(hasButton(container, 'Clear filter')).toBe(true);
    });

    it('the notice "Run <ID> is not in the run history" shows with no detail', async () => {
        const container = await open(ready({ notice: 'Run gone-9 is not in the run history', detail: undefined }));
        expect(container.querySelector('[data-ac-notice]')?.textContent).toContain('Run gone-9 is not in the run history');
        expect(container.querySelector('[data-run-detail]')).toBeNull();
    });
});

describe('AC-005: the detail header', () => {
    it('shows run ID, provider, model, session, spec, status with its cause, start time and duration', async () => {
        const detail = sampleDetail();
        detail.header = { ...detail.header, status: 'Interrupted', cause: 'extension host restarted', ended: '2026-11-17T10:05:00.000Z' };
        const container = await open(ready({}, detail));
        const header = container.querySelector('[data-run-header]')!;
        for (const text of ['Run ID', 'run-1', 'Provider', 'Fake provider', 'Model', 'fake-model', 'Session', 'fake-session-run-1', 'Spec', '0007', 'Spec Board', 'Status', 'Interrupted (extension host restarted)', 'Started', 'Duration']) {
            expect(header.textContent, text).toContain(text);
        }
        expect(header.textContent).toContain('not available');
    });

    it('shows "not available" for the values the store does not hold', async () => {
        const detail = sampleDetail();
        detail.header = { ...detail.header, model: 'not available', session: 'not available', started: undefined };
        const container = await open(ready({}, detail));
        const header = container.querySelector('[data-run-header]')!;
        expect(header.textContent?.match(/not available/g)?.length).toBeGreaterThanOrEqual(3);
    });

    it('Open spec sends one navigate request to Spec Explorer with the stem; none for "spec not found"', async () => {
        const container = await open(ready());
        await click(button(container, 'Open spec'));
        expect(requests('navigate').map((message) => message.payload)).toEqual([{ area: 'specExplorer', target: { kind: 'spec', stem: '0007-board' } }]);
        await send(agentCenterEvent(ready({}, { actions: { cancel: 'none', cancelNote: undefined, resume: false, openSpec: false, refusal: undefined } })));
        expect(hasButton(container, 'Open spec')).toBe(false);
    });

    it('a duplicate stem navigates with the path too', async () => {
        const detail = sampleDetail();
        detail.header = { ...detail.header, spec: { ...detail.header.spec, path: '.specs/active/0007-board.md' } };
        const container = await open(ready({}, detail));
        await click(button(container, 'Open spec'));
        expect(requests('navigate')[0]?.payload).toEqual({ area: 'specExplorer', target: { kind: 'spec', stem: '0007-board', path: '.specs/active/0007-board.md' } });
    });
});

describe('AC-006: the duration ticks while an open run is shown', () => {
    it('counts up once a second for an open run and stays still for an ended one', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-11-17T10:00:09.000Z'));
        const container = await open(ready({}, { header: { ...sampleDetail().header, status: 'Running', started: '2026-11-17T10:00:00.000Z' } }));
        const duration = () => container.querySelector('[data-run-header] [data-duration]')?.textContent;
        expect(duration()).toBe('0:09');
        await act(async () => {
            vi.advanceTimersByTime(3000);
        });
        expect(duration()).toBe('0:12');
        await send(agentCenterEvent(ready({}, { header: { ...sampleDetail().header, status: 'Completed', started: '2026-11-17T10:00:00.000Z', ended: '2026-11-17T10:00:20.000Z' } })));
        expect(duration()).toBe('0:20');
        await act(async () => {
            vi.advanceTimersByTime(5000);
        });
        expect(duration()).toBe('0:20');
    });
});

describe('AC-007, AC-019, AC-020: activity, error and result', () => {
    it('shows the current activity of an open run', async () => {
        const container = await open(ready());
        expect(container.querySelector('[data-activity]')?.textContent).toContain('Current activity');
        expect(container.querySelector('[data-activity]')?.textContent).toContain('Waiting for approval: Edit README.md');
    });

    it('shows the error block of a Failed run with all five items', async () => {
        const detail = sampleDetail({
            activity: undefined,
            error: { errorClass: 'Quota or rate limit reached', message: 'Rate limit reached', failedAt: '2026-11-17T10:02:00.000Z', lastStatus: 'Running', lastEvent: 'Tool completed' },
        });
        detail.header = { ...detail.header, status: 'Failed' };
        const container = await open(ready({}, detail));
        const error = container.querySelector('[data-error]')!;
        for (const text of ['Error', 'Error class', 'Quota or rate limit reached', 'Message', 'Rate limit reached', 'Failed at', 'Last status before failure', 'Running', 'Last event before failure', 'Tool completed']) {
            expect(error.textContent, text).toContain(text);
        }
        expect(container.querySelector('[data-activity]')).toBeNull();
    });

    it('shows the result and the not-done text of a Completed run', async () => {
        const detail = sampleDetail({ activity: undefined, result: { text: 'All done.', notDone: 'The spec is not done until FeatherSpec verifies it.' } });
        const container = await open(ready({}, detail));
        const result = container.querySelector('[data-result]')!;
        expect(result.textContent).toContain('Result');
        expect(result.textContent).toContain('All done.');
        expect(result.textContent).toContain('The spec is not done until FeatherSpec verifies it.');
    });

    it('the run detail of an unreadable history says so', async () => {
        const container = await open(ready({}, { unreadable: true }));
        expect(container.querySelector('[data-run-detail]')?.textContent).toContain('history unreadable');
    });
});

describe('AC-014, AC-015, AC-024: notes and file changes', () => {
    it('shows the capability notes', async () => {
        const container = await open(ready({}, { notes: ['Tool calls: not delivered by Copilot', 'File changes: not delivered by Copilot'] }));
        expect(container.querySelector('[data-run-detail]')?.textContent).toContain('Tool calls: not delivered by Copilot');
        expect(container.querySelector('[data-run-detail]')?.textContent).toContain('File changes: not delivered by Copilot');
    });

    it('lists file changes with path, operation and basis; "Open file" only where the file can be opened, and it sends acOpenFile', async () => {
        const files = [
            { path: 'README.md', operation: 'changed', basis: 'reported by provider', outsideProject: false, canOpen: true },
            { path: 'gone.md', operation: 'deleted', basis: 'derived from tool input', outsideProject: false, canOpen: false },
        ];
        const container = await open(ready({}, { files }));
        const entries = [...container.querySelectorAll<HTMLElement>('[data-file-change]')];
        expect(entries[0]?.textContent).toContain('README.md');
        expect(entries[0]?.textContent).toContain('changed');
        expect(entries[0]?.textContent).toContain('reported by provider');
        expect(entries[1]?.textContent).toContain('derived from tool input');
        expect(entries[0]?.querySelector('button')?.textContent).toBe('Open file');
        expect(entries[1]?.querySelector('button')).toBeNull();
        await click(entries[0]!.querySelector('button')!);
        expect(requests('acOpenFile').map((message) => message.payload)).toEqual([{ runId: 'run-1', path: 'README.md' }]);
    });
});

describe('AC-016, AC-017: requests and answers', () => {
    it('an approval request shows its kind of action, summary and the controls; "outside the project folder" where flagged', async () => {
        const detail = sampleDetail();
        detail.requests = [{ ...detail.requests[0]!, outsideProject: true }];
        const container = await open(ready({}, detail));
        const request = container.querySelector('[data-request]')!;
        expect(request.textContent).toContain('Waiting for you');
        expect(request.textContent).toContain('edit');
        expect(request.textContent).toContain('Edit README.md');
        expect(request.textContent).toContain('outside the project folder');
        expect(hasButton(container, 'Approve once')).toBe(true);
        expect(hasButton(container, 'Reject')).toBe(true);
        expect(container.querySelectorAll('[data-request] button')).toHaveLength(2);
        expect(container.querySelector('[data-request]')?.textContent).not.toContain('outside the project folder'.toUpperCase());
    });

    it('"Approve once" sends acAnswer once and disables the controls while pending; a second click sends nothing', async () => {
        const container = await open(ready());
        await click(button(container, 'Approve once'));
        expect(requests('acAnswer').map((message) => message.payload)).toEqual([{ runId: 'run-1', requestId: 'a1', answer: { kind: 'approval', decision: 'approve-once' } }]);
        const pending = sampleDetail();
        pending.requests = [{ ...pending.requests[0]!, pending: true }];
        await send(agentCenterEvent(ready({}, pending)));
        expect(button(container, 'Approve once').disabled).toBe(true);
        expect(button(container, 'Reject').disabled).toBe(true);
        await click(button(container, 'Approve once'));
        expect(requests('acAnswer')).toHaveLength(1);
    });

    it('"Reject" sends the optional reason typed in its field', async () => {
        const container = await open(ready());
        const field = container.querySelector<HTMLInputElement>('[data-request] input')!;
        expect(field.getAttribute('aria-label') ?? field.placeholder).toBe('Reason (optional)');
        await act(async () => {
            const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
            setter.call(field, 'wrong file');
            field.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await click(button(container, 'Reject'));
        expect(requests('acAnswer')[0]?.payload).toEqual({ runId: 'run-1', requestId: 'a1', answer: { kind: 'approval', decision: 'reject', reason: 'wrong file' } });
    });

    it('shows the refusal at the control and enables the controls again', async () => {
        const detail = sampleDetail();
        detail.requests = [{ ...detail.requests[0]!, refusal: 'The request is no longer open.' }];
        const container = await open(ready({}, detail));
        expect(container.querySelector('[data-request]')?.textContent).toContain('The request is no longer open.');
        expect(button(container, 'Approve once').disabled).toBe(false);
    });

    it('an input request shows its question, a text field and "Send", disabled while the field is empty', async () => {
        const detail = sampleDetail();
        detail.requests = [{ kind: 'input', requestId: 'i1', actionKind: '', summary: '', question: 'Which file?', outsideProject: false, pending: false, refusal: undefined }];
        const container = await open(ready({}, detail));
        const request = container.querySelector('[data-request]')!;
        expect(request.textContent).toContain('Which file?');
        expect(button(container, 'Send').disabled).toBe(true);
        const field = request.querySelector<HTMLInputElement>('input')!;
        expect(field.getAttribute('aria-label') ?? field.placeholder).toBe('Your answer');
        await act(async () => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field, 'README.md');
            field.dispatchEvent(new Event('input', { bubbles: true }));
        });
        expect(button(container, 'Send').disabled).toBe(false);
        await click(button(container, 'Send'));
        expect(requests('acAnswer').map((message) => message.payload)).toEqual([{ runId: 'run-1', requestId: 'i1', answer: { kind: 'input', text: 'README.md' } }]);
    });

    it('text of a request is shown as text: markup in a summary is never interpreted', async () => {
        const detail = sampleDetail();
        detail.requests = [{ ...detail.requests[0]!, summary: '<b>bold</b><img src=x onerror=alert(1)>' }];
        const container = await open(ready({}, detail));
        expect(container.querySelector('[data-request]')?.textContent).toContain('<b>bold</b>');
        expect(container.querySelector('[data-request] b')).toBeNull();
        expect(container.querySelector('[data-request] img')).toBeNull();
    });
});

describe('AC-021, AC-022, AC-028: actions and disabled controls', () => {
    it('"Cancel run" sends acCancel once per activation; with cancel unsupported the note stands in its place', async () => {
        const container = await open(ready());
        await click(button(container, 'Cancel run'));
        expect(requests('acCancel').map((message) => message.payload)).toEqual([{ runId: 'run-1' }]);
        await send(agentCenterEvent(ready({}, { actions: { cancel: 'unsupported', cancelNote: 'Cancel: not supported by Copilot', resume: false, openSpec: true, refusal: undefined } })));
        expect(hasButton(container, 'Cancel run')).toBe(false);
        expect(container.textContent).toContain('Cancel: not supported by Copilot');
    });

    it('"Resume" appears only where offered and sends acResume; a refusal shows at the control', async () => {
        const container = await open(ready({}, { actions: { cancel: 'none', cancelNote: undefined, resume: true, openSpec: true, refusal: 'A newer run exists.' } }));
        await click(button(container, 'Resume'));
        expect(requests('acResume').map((message) => message.payload)).toEqual([{ runId: 'run-1' }]);
        expect(container.querySelector('[data-actions]')?.textContent).toContain('A newer run exists.');
        await send(agentCenterEvent(ready()));
        expect(hasButton(container, 'Resume')).toBe(false);
    });

    it('in a reader window cancel, resume and the answers are disabled and the store\'s reason is shown; Open spec and list stay usable', async () => {
        const view = ready({ controls: { kind: 'disabled', reason: 'Another VS Code window holds the write lock' } }, { actions: { cancel: 'offer', cancelNote: undefined, resume: true, openSpec: true, refusal: undefined } });
        const container = await open(view);
        expect(container.querySelector('[data-controls-reason]')?.textContent).toContain('Another VS Code window holds the write lock');
        for (const label of ['Approve once', 'Reject', 'Cancel run', 'Resume']) {
            expect(button(container, label).disabled, label).toBe(true);
        }
        expect(button(container, 'Open spec').disabled).toBe(false);
        await click(button(container, 'Cancel run'));
        expect(requests('acCancel')).toEqual([]);
        expect(container.querySelector<HTMLButtonElement>('[data-run-row]')?.disabled).toBe(false);
    });

    it('in Restricted Mode no control is offered and the area adds no text about it', async () => {
        const view = ready({ controls: { kind: 'none' } }, { actions: { cancel: 'none', cancelNote: undefined, resume: false, openSpec: true, refusal: undefined } });
        const container = await open(view, true);
        for (const label of ['Approve once', 'Reject', 'Cancel run', 'Resume']) {
            expect(hasButton(container, label), label).toBe(false);
        }
        expect(container.querySelector('[data-agent-center]')?.textContent).not.toMatch(/restricted|trust/i);
        expect(container.querySelector('[data-request]')?.textContent).toContain('Edit README.md');
        expect(hasButton(container, 'Open spec')).toBe(true);
    });
});

describe('AC-029: status as text, keyboard reachability', () => {
    it('every status shows as a word inside its chip; the chip carries the status for the colour mapping', async () => {
        const statuses = ['Starting', 'Running', 'WaitingForApproval', 'WaitingForInput', 'Completed', 'Failed', 'Cancelled', 'Interrupted'] as const;
        const words = ['Starting', 'Running', 'Waiting for approval', 'Waiting for input', 'Completed', 'Failed', 'Cancelled', 'Interrupted'];
        const rows = statuses.map((status, index) => sampleRow({ runId: `r-${index}`, status, selected: index === 0 }));
        const container = await open(ready({ rows }));
        const chips = [...container.querySelectorAll('[data-run-row] [data-run-status]')];
        expect(chips.map((chip) => chip.getAttribute('data-run-status'))).toEqual([...statuses]);
        expect(chips.map((chip) => chip.textContent?.trim())).toEqual(words);
        expect(chips.every((chip) => chip.querySelector('svg[aria-hidden="true"]') !== null)).toBe(true);
    });

    it('every control is a native enabled button that Tab reaches and Enter or Space activates', async () => {
        const detail = sampleDetail({ actions: { cancel: 'offer', cancelNote: undefined, resume: false, openSpec: true, refusal: undefined } });
        const container = await open(ready({ filter: { stem: '0007-board', label: '0007' } }, detail));
        const buttons = [...container.querySelectorAll<HTMLButtonElement>('[data-agent-center] button')];
        expect(buttons.length).toBeGreaterThanOrEqual(5);
        for (const control of buttons) {
            expect(isKeyboardReachable(control), control.textContent ?? '').toBe(true);
            expect(control.type).toBe('button');
        }
        await pressKey(button(container, 'Cancel run'), 'Enter');
        await pressKey(button(container, 'Cancel run'), ' ');
        expect(requests('acCancel')).toHaveLength(2);
    });
});
