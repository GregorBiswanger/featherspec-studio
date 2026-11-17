import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../../shared/protocol/envelope';
import type { MissionControlView } from '../../../shared/protocol/missionControl';
import { bigView, sampleView } from '../../../shared/protocol/testing/missionControlSample';
import { BUDGET_MS, bestOfThree } from '../../../shared/testing/timing';
import { App } from '../../App';
import { createClient, type ShellClient } from '../../client';
import { baseView, missionControlEvent, mount, send, shellEvent, type Mounted } from '../../testing/dom';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(view: MissionControlView): Promise<HTMLElement> {
    const client = createClient({ post: (message) => void posted.push(message) });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'missionControl' }), 1));
    await send(missionControlEvent(view));
    return mounted.container;
}

function section(container: HTMLElement, name: 'runs' | 'attention' | 'activity'): HTMLElement {
    return container.querySelector<HTMLElement>(`[data-${name}]`)!;
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('AC-005, AC-007, AC-027: the run section', () => {
    it('shows the Running figure and each highlighted run with number, title and the status as text', async () => {
        const view = sampleView();
        const runs = section(await open(view), 'runs');
        expect(runs.querySelector('h2')?.textContent).toBe('Agent runs');
        expect(runs.querySelector('[data-running]')?.textContent).toBe('Running 1');
        const rows = [...runs.querySelectorAll('[data-highlighted]')].map((row) => row.textContent);
        expect(rows).toEqual(['0001 A — Failed']);
    });

    it('lists a run of a vanished stem with its recorded stem, "spec not found" and the status', async () => {
        const view = sampleView();
        view.runs = {
            available: true,
            running: 0,
            highlighted: [{ runId: 'r9', status: 'Interrupted', spec: { stem: '0099-gone', number: '0099', title: null, found: false } }],
            unreadable: 0,
        };
        const rows = [...section(await open(view), 'runs').querySelectorAll('[data-highlighted]')].map((row) => row.textContent);
        expect(rows).toEqual(['0099-gone — spec not found — Interrupted']);
    });

    it('a missing title reads "not available" (BR-09)', async () => {
        const view = sampleView();
        view.runs = {
            available: true,
            running: 0,
            highlighted: [{ runId: 'r1', status: 'Failed', spec: { stem: '0003-x', number: '0003', title: null, found: true } }],
            unreadable: 0,
        };
        expect(section(await open(view), 'runs').textContent).toContain('0003 not available — Failed');
    });

    it('an empty list keeps its heading and says so; Running 0 is shown as 0', async () => {
        const view = sampleView();
        view.runs = { available: true, running: 0, highlighted: [], unreadable: 0 };
        const runs = section(await open(view), 'runs');
        expect(runs.querySelector('h2')?.textContent).toBe('Agent runs');
        expect(runs.textContent).toContain('No failed or interrupted runs.');
        expect(runs.querySelector('[data-running]')?.textContent).toBe('Running 0');
        expect(runs.textContent).not.toContain('unreadable');
    });

    it('AC-027: unreadable runs are named with their count, singular and plural', async () => {
        const view = sampleView();
        view.runs = { available: true, running: 1, highlighted: [], unreadable: 1 };
        expect(section(await open(view), 'runs').textContent).toContain('1 run unreadable');
        const plural = sampleView();
        plural.runs = { available: true, running: 1, highlighted: [], unreadable: 3 };
        await send(missionControlEvent(plural));
        expect(section(mounted!.container, 'runs').textContent).toContain('3 runs unreadable');
    });
});

describe('AC-008, AC-018: the attention list', () => {
    it('shows the count in the heading and every reason of a row as text', async () => {
        const attention = section(await open(sampleView()), 'attention');
        expect(attention.querySelector('h2')?.textContent).toBe('Needs attention (1)');
        expect([...attention.querySelectorAll('[data-attention-row]')].map((row) => row.textContent)).toEqual(['0001 not available — Blocked, Run failed']);
        expect(attention.textContent).not.toContain('Run-based reasons not available');
    });

    it('an empty list keeps its heading and says that nothing needs attention', async () => {
        const view = sampleView();
        view.attention = { rows: [], runReasons: { available: true } };
        const attention = section(await open(view), 'attention');
        expect(attention.querySelector('h2')?.textContent).toBe('Needs attention (0)');
        expect(attention.textContent).toContain('Nothing needs attention.');
    });

    it('AC-018: with the runs unavailable the spec-based rows stay and one line gives the reason', async () => {
        const view = sampleView();
        view.attention = {
            rows: [{ spec: { stem: '0002-y', number: '0002', title: 'Beta', found: true }, reasons: ['Review pending'] }],
            runReasons: { available: false, reason: 'disk is full' },
        };
        const attention = section(await open(view), 'attention');
        expect(attention.textContent).toContain('0002 Beta — Review pending');
        expect(attention.textContent).toContain('Run-based reasons not available: disk is full');
    });
});

describe('AC-010, AC-011: recent activity', () => {
    it('shows time, number, title and the change of each entry in the order of the view, and no control that shows more', async () => {
        const view = sampleView();
        const activity = section(await open(view), 'activity');
        expect(activity.querySelector('h2')?.textContent).toBe('Recent activity');
        const rows = [...activity.querySelectorAll('[data-activity-entry]')].map((row) => row.textContent);
        expect(rows).toHaveLength(3);
        expect(rows[0]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} · 0001 A · Backlog → Ready$/);
        expect(rows[1]).toMatch(/· 0009-gone — spec not found · Done → no longer observed$/);
        expect(rows[2]).toMatch(/· 0001 A · Run: Waiting for input$/);
        expect([...activity.querySelectorAll('button')].filter((button) => !button.hasAttribute('data-drill'))).toHaveLength(0);
        expect(activity.querySelectorAll('button')).toHaveLength(rows.length);
        expect(activity.textContent).not.toMatch(/\bmore\b/i);
    });

    it('names a change that happened while Studio was not running', async () => {
        const view = sampleView();
        view.activity = {
            available: true,
            entries: [{ at: '2026-11-16T09:00:00.000Z', spec: { stem: '0001-a', number: '0001', title: 'A', found: true }, change: { kind: 'state', old: 'Ready', new: 'Active', whileClosed: true } }],
        };
        expect(section(await open(view), 'activity').textContent).toContain('Ready → Active (changed while Studio was not running)');
    });

    it('an empty list keeps its heading and says so; "not available" shows the reason and no list', async () => {
        const view = sampleView();
        view.activity = { available: true, entries: [] };
        const empty = section(await open(view), 'activity');
        expect(empty.querySelector('h2')?.textContent).toBe('Recent activity');
        expect(empty.textContent).toContain('No recent activity.');
        const unavailable = sampleView();
        unavailable.activity = { available: false, reason: 'no store' };
        await send(missionControlEvent(unavailable));
        const text = section(mounted!.container, 'activity').textContent!;
        expect(text).toContain('Recent activity not available: no store');
        expect(text).not.toContain('No recent activity');
    });
});

describe('AC-018: runs not available', () => {
    it('shows "not available" with the reason in the run section, never Running 0 and never an empty list', async () => {
        const view = sampleView();
        view.runs = { available: false, reason: 'disk is full' };
        const runs = section(await open(view), 'runs');
        expect(runs.textContent).toContain('Run data not available: disk is full');
        expect(runs.textContent).not.toContain('Running');
        expect(runs.textContent).not.toContain('No failed or interrupted runs.');
        expect(runs.querySelector('[data-running]')).toBeNull();
    });
});

describe('AC-021: every state, reason and status is text', () => {
    it('no status element is empty and every marker carries its word', async () => {
        const container = await open(sampleView());
        const markers = [...container.querySelectorAll('[data-state-count], [data-reason], [data-run-status], [data-highlighted], [data-attention-row]')];
        expect(markers.length).toBeGreaterThan(8);
        for (const marker of markers) {
            expect(marker.textContent?.trim().length).toBeGreaterThan(0);
        }
        expect([...container.querySelectorAll('[data-reason]')].map((reason) => reason.textContent)).toEqual(['Blocked', 'Run failed']);
        expect([...container.querySelectorAll('[data-run-status]')].map((status) => status.textContent)).toEqual(['Failed']);
    });
});

describe('AC-026: nothing beyond the contract reaches the DOM', () => {
    it('a view with an error text on a run is refused as a whole; the old view stays and the text is nowhere', async () => {
        const container = await open(sampleView());
        const poisoned = sampleView();
        const runs = poisoned.runs as { highlighted: object[] };
        runs.highlighted = [{ ...(runs.highlighted[0] as object), errorMessage: 'SECRET-1', result: { prompt: 'SECRET-PROMPT' } }];
        await send(missionControlEvent(poisoned));
        expect(container.textContent).not.toContain('SECRET');
        expect(section(container, 'runs').querySelectorAll('[data-highlighted]')).toHaveLength(1);
    });
});

describe('AC-028: zero specs keep the run section and the activity', () => {
    it('the message replaces counts, progress and the attention list; the header, runs and activity stay', async () => {
        const view = sampleView();
        view.specs = { kind: 'empty' };
        const container = await open(view);
        expect(container.querySelector('[data-zero-specs]')).not.toBeNull();
        expect(container.querySelector('[data-attention]')).toBeNull();
        expect(container.querySelector('[data-header]')).not.toBeNull();
        expect(container.querySelector('[data-runs]')).not.toBeNull();
        expect(container.querySelector('[data-activity]')).not.toBeNull();
    });
});

describe('AC-024: the whole content of a 200-spec project', () => {
    it('renders runs, attention and activity within 1000 ms of the message event', async () => {
        const container = await open(sampleView());
        const big = bigView(200, 5);
        const best = await bestOfThree(
            () => send(missionControlEvent(big)),
            () => send(missionControlEvent(sampleView())),
        );
        expect(section(container, 'attention').querySelectorAll('[data-attention-row]')).toHaveLength(200);
        expect(section(container, 'runs').querySelectorAll('[data-highlighted]')).toHaveLength(200);
        expect(section(container, 'activity').querySelectorAll('[data-activity-entry]')).toHaveLength(10);
        expect(best).toBeLessThan(BUDGET_MS.frame);
    });
});

describe('0013 AC-007: attention rows and empty panels', () => {
    it('AC-007: each attention row shows a number chip, the title and every reason as text with an icon', async () => {
        const view = sampleView();
        view.attention = {
            rows: [{ spec: { stem: '0002-y', number: '0002', title: 'Beta', found: true }, reasons: ['Review pending', 'Diagnostic'] }],
            runReasons: { available: true },
        };
        const row = section(await open(view), 'attention').querySelector('[data-attention-row]')!;
        expect(row.querySelector('.mc-number')?.textContent).toBe('0002');
        expect(row.querySelector('.mc-title')?.textContent).toBe('Beta');
        const reasons = [...row.querySelectorAll('[data-reason]')];
        expect(reasons.map((reason) => reason.textContent)).toEqual(['Review pending', 'Diagnostic']);
        for (const reason of reasons) {
            expect(reason.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
        }
    });

    it('AC-007: the empty Agent runs and Recent activity panels each show an icon and 0006\'s sentence', async () => {
        const view = sampleView();
        view.runs = { available: true, running: 0, highlighted: [], unreadable: 0 };
        view.activity = { available: true, entries: [] };
        const container = await open(view);
        for (const [name, sentence] of [['runs', 'No failed or interrupted runs.'], ['activity', 'No recent activity.']] as const) {
            const empty = section(container, name).querySelector('.mc-empty');
            expect(empty?.textContent).toBe(sentence);
            expect(empty?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
        }
    });

    it('§3.2: Agent runs and Recent activity sit side by side in one panel row below the attention list', async () => {
        const container = await open(sampleView());
        const panels = container.querySelector('.mc-panels');
        expect([...(panels?.children ?? [])].map((child) => child.hasAttribute('data-runs') ? 'runs' : child.hasAttribute('data-activity') ? 'activity' : 'other')).toEqual(['runs', 'activity']);
        const attention = section(container, 'attention');
        expect(attention.compareDocumentPosition(panels!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
});
