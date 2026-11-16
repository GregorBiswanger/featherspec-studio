import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Envelope } from '../../../shared/protocol/envelope';
import type { MissionControlView } from '../../../shared/protocol/missionControl';
import { bigView, sampleView } from '../../../shared/protocol/testing/missionControlSample';
import { App } from '../../App';
import { createClient, type ShellClient } from '../../client';
import { baseView, missionControlEvent, mount, send, shellEvent, type Mounted } from '../../testing/dom';
import { formatTime } from './format';

let posted: Envelope[];
let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function open(view?: MissionControlView, client?: ShellClient): Promise<HTMLElement> {
    const made = client ?? createClient({ post: (message) => void posted.push(message) });
    clients.push(made);
    made.start();
    mounted = await mount(<App client={made} />);
    await send(shellEvent(baseView({ area: 'missionControl' }), 1));
    if (view !== undefined) {
        await send(missionControlEvent(view));
    }
    return mounted.container;
}

function area(container: HTMLElement): HTMLElement {
    return container.querySelector<HTMLElement>('[data-mission-control]')!;
}

beforeEach(() => {
    posted = [];
});

afterEach(() => {
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('transport and the empty start', () => {
    it('the area is no placeholder; before the first view it shows an empty frame and no text of its own (the loading state is the shell\'s, 0005 AC-014)', async () => {
        const container = await open();
        expect(container.querySelector('[data-placeholder]')).toBeNull();
        expect(container.querySelector('h1')?.textContent).toBe('Mission Control');
        expect(container.querySelector('[data-mission-control-empty]')).not.toBeNull();
        expect(container.textContent).not.toContain('Loading project…');
        expect(container.querySelector('[data-mission-control]')).toBeNull();
    });

    it('a valid missionControl event fills the area; an invalid one is ignored and the view stays as it was', async () => {
        const container = await open(sampleView());
        expect(area(container).textContent).toContain('demo');
        await send(missionControlEvent({ header: 'broken' }));
        await send(missionControlEvent({ ...sampleView(), extra: 'SECRET-1' }));
        expect(area(container).textContent).toContain('demo');
        expect(container.textContent).not.toContain('SECRET-1');
    });
});

describe('AC-017, AC-019: header', () => {
    it('shows folder name, FeatherSpec version, the model update time in local time and the diagnostic count', async () => {
        const view = sampleView();
        view.header.updatedAt = new Date(2026, 10, 16, 9, 5).toISOString();
        const header = area(await open(view)).querySelector('[data-header]')!;
        expect(header.textContent).toContain('demo');
        expect(header.textContent).toContain('FeatherSpec 1.10.0');
        expect(header.textContent).toContain('Model updated 2026-11-16 09:05');
        expect(header.textContent).toContain('1 project diagnostic');
        expect(header.textContent).not.toContain('1 project diagnostics');
    });

    it('shows "unknown" as the version and "n project diagnostics" in the plural', async () => {
        const view = sampleView();
        view.header.version = 'unknown';
        view.header.projectDiagnostics = 2;
        const header = area(await open(view)).querySelector('[data-header]')!;
        expect(header.textContent).toContain('FeatherSpec unknown');
        expect(header.textContent).toContain('2 project diagnostics');
    });

    it('formats times as local YYYY-MM-DD HH:mm and leaves an unreadable time as it is', () => {
        expect(formatTime(new Date(2026, 0, 2, 3, 4).toISOString())).toBe('2026-01-02 03:04');
        expect(formatTime('not a time')).toBe('not a time');
    });
});

describe('AC-001, AC-002, AC-025: spec counts', () => {
    it('shows the total, the six states with their counts as text, "of which Deprecated" and the derived label with the rule ID', async () => {
        const view = sampleView();
        view.specs = {
            kind: 'counts',
            total: 9,
            states: [
                { state: 'Backlog', count: 2 },
                { state: 'Ready', count: 1, derivedRule: 'S-READY' },
                { state: 'Active', count: 1 },
                { state: 'Review', count: 1, derivedRule: 'S-REVIEW' },
                { state: 'Done', count: 3, deprecated: 1 },
                { state: 'Blocked', count: 1, derivedRule: 'S-BLOCKED' },
            ],
            progress: { kind: 'value', percent: 25, done: 2, divisor: 8 },
        };
        const specs = area(await open(view)).querySelector('[data-specs]')!;
        expect(specs.querySelector('h2')?.textContent).toBe('Specs');
        expect(specs.textContent).toContain('Total 9');
        const rows = [...specs.querySelectorAll('[data-state-count]')].map((row) => row.textContent);
        expect(rows).toEqual([
            'Backlog 2',
            'Ready 1Derived: draft with a plan that has not started S-READY',
            'Active 1',
            'Review 1Derived: plan is Done, waiting for review S-REVIEW',
            'Done 3of which Deprecated: 1',
            'Blocked 1Derived: plan or return note says Blocked S-BLOCKED',
        ]);
    });

    it('AC-003: progress shows the percentage, both numbers and the formula text', async () => {
        const view = sampleView();
        const text = area(await open(view)).querySelector('[data-progress]')!.textContent!;
        expect(text).toContain('Progress 50 % (1 of 2)');
        expect(text).toContain('Done specs with status Implemented or Baseline ÷ (all specs − Deprecated), rounded down');
    });

    it('AC-004: with no divisor progress reads "not available" and shows no percentage', async () => {
        const view = sampleView();
        if (view.specs.kind === 'counts') {
            view.specs.progress = { kind: 'not available' };
        }
        const text = area(await open(view)).querySelector('[data-progress]')!.textContent!;
        expect(text).toContain('Progress: not available');
        expect(text).not.toContain('%');
    });
});

describe('AC-020, AC-028: zero specs', () => {
    it('shows "No specs yet" with the pointer to /sdd-specify in place of counts and progress, and keeps the header', async () => {
        const view = sampleView();
        view.specs = { kind: 'empty' };
        const container = area(await open(view));
        expect(container.textContent).toContain('No specs yet. Run /sdd-specify to write the first one.');
        expect(container.querySelector('[data-specs]')).toBeNull();
        expect(container.querySelector('[data-progress]')).toBeNull();
        expect(container.querySelector('[data-header]')).not.toBeNull();
    });

    it('control: with specs the message is not shown', async () => {
        expect(area(await open(sampleView())).textContent).not.toContain('No specs yet');
    });
});

describe('AC-016, AC-024: timing', () => {
    it('AC-016: a new event is in the DOM within 500 ms of the message event', async () => {
        const container = await open(sampleView());
        const next = sampleView();
        next.header.name = 'renamed';
        const started = performance.now();
        await send(missionControlEvent(next));
        expect(area(container).textContent).toContain('renamed');
        expect(performance.now() - started).toBeLessThan(500);
    });

    it('AC-024: the view of a 200-spec project renders within 1000 ms of the message event', async () => {
        const container = await open();
        const started = performance.now();
        await send(missionControlEvent(bigView(200, 5)));
        expect(area(container).textContent).toContain('Total 200');
        expect(performance.now() - started).toBeLessThan(1000);
    });
});
