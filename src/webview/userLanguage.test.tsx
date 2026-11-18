import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createClient, type ShellClient } from './client';
import { baseView, mount, send, shellEvent, type Mounted } from './testing/dom';
import { detailEvent, detailView, sections } from './detail/testing/views';
import { resetSectionMemory } from './detail/sectionMemory';
import { boardEvent, boardView, card } from './board/testing/views';
import { overviewEvent } from './testing/dom';
import { sampleView } from '../shared/protocol/testing/overviewSample';
import type { AreaId } from '../shared/protocol/areas';
import type { SpecRow } from '../shared/protocol/messages';

/** 0016 AC-011: the visible text holds no internal vocabulary. */
const FORBIDDEN = /S-[A-Z]{3,}|R-[1-7]|NS-\d|persisted|Model updated|first observed|no longer observed|not checked|\d{4}-\d{2}-\d{2}T\d{2}:/;

let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function textOf(area: AreaId, event: unknown, rows: SpecRow[] = []): Promise<string> {
    const client = createClient({ post: () => undefined });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area, rows }), 1));
    await send(event);
    return mounted.container.textContent ?? '';
}

function row(number: string, overrides: Partial<SpecRow> = {}): SpecRow {
    return {
        stem: `${number}-thing`,
        path: `.specs/active/${number}-thing.md`,
        number,
        title: `Thing ${number}`,
        state: 'Active',
        derivedRule: undefined,
        showPath: false,
        selected: false,
        ...overrides,
    };
}

async function visibleText(view = detailView()): Promise<string> {
    const client = createClient({ post: () => undefined });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'specExplorer' }), 1));
    await send(detailEvent(view));
    return mounted.container.textContent ?? '';
}

afterEach(() => {
    resetSectionMemory();
    clients.splice(0).forEach((client) => client.stop());
    mounted?.unmount();
    mounted = undefined;
});

describe('0016 AC-011: user language in the detail', () => {
    it('shows no rule ID, "persisted", ISO time or "first observed" in any section', async () => {
        const history = [
            { observedAt: '2026-11-16T09:00:00Z', old: null, new: 'Review', rule: 'S-REVIEW', cause: { kind: 'first-observed' as const, paths: [] }, flow: 'not checked' },
            { observedAt: '2026-11-16T09:05:00Z', old: 'Review', new: null, rule: null, cause: { kind: 'no-longer-observed' as const, paths: [] }, flow: 'not checked' },
        ];
        const base = sections().history;
        const text = await visibleText(detailView({ history: { ...base, statusHistory: history } }));
        expect(text).not.toMatch(FORBIDDEN);
        expect(text).toContain('first seen as Review');
        expect(text).toContain('Review → no longer in the project');
    });

    it('negative control: the old history line is caught by the same pattern', () => {
        expect('2026-11-17T21:56:14.561Z · — → Review · S-REVIEW · first observed · not checked').toMatch(FORBIDDEN);
        expect('S-ACTIVE · persisted').toMatch(FORBIDDEN);
    });
});

describe('0016 AC-011: user language on every surface 0016 touched', () => {
    it('the Board card shows no rule ID or internal word, whatever its state, need or Problem', async () => {
        const cards = [
            card('0001', { state: 'Ready', derivedRule: 'S-READY' }),
            card('0002', { state: 'Review', derivedRule: 'S-REVIEW' }),
            card('0003', { state: 'Blocked', derivedRule: 'S-BLOCKED', blocked: ['Blocked: plan status Blocked'] }),
            card('0004', { state: 'Backlog', need: { text: 'needs a plan', rule: 'R-3' }, problems: 2 }),
            card('0005', { state: 'Done', deprecated: true }),
        ];
        const text = await textOf('board', boardEvent(boardView(cards)));
        expect(text).not.toMatch(FORBIDDEN);
        expect(text).toContain('needs a plan');
        expect(text).toContain('Plan done, waiting for review');
    });

    it('the Spec Explorer row shows no rule ID', async () => {
        const rows = [row('0001', { state: 'Ready', derivedRule: 'S-READY' }), row('0002', { state: 'Review', derivedRule: 'S-REVIEW' }), row('0003', { state: 'Blocked', derivedRule: 'S-BLOCKED' })];
        const text = await textOf('specExplorer', detailEvent(detailView()), rows);
        expect(text).toContain('Thing 0002');
        expect(text).not.toMatch(FORBIDDEN);
    });

    it('Overview (Now, Up next, Problems, figures, activity) shows no rule ID or internal word', async () => {
        const view = sampleView();
        view.now = [{ spec: { stem: '0002-b', number: '0002', title: 'B', path: '.specs/active/0002-b.md', found: true }, state: 'Review', status: 'Review', problems: 1 }];
        view.upNext = { rows: [{ spec: { stem: '0003-c', number: '0003', title: 'C', found: true }, state: 'Backlog', status: 'needs a plan', problems: 0 }], more: 1, stems: ['0003-c', '0004-d'] };
        if (view.activity.available) {
            view.activity = { ...view.activity, open: true };
        }
        view.problems.lines = [{ where: 'project', reason: 'a return note has no spec' }];
        const text = await textOf('overview', overviewEvent(view));
        expect(text).toContain('Problems (2)');
        expect(text).toContain('Up next');
        expect(text).toContain('no longer in the project');
        expect(text).not.toMatch(FORBIDDEN);
    });

    it('the banner shows no rule ID or internal word in its Problems or its format notes', async () => {
        const banner = {
            problems: [{ where: '.memory-bank/activeContext.0099-T-001.md', reason: 'return note matches no spec (number 0099)' }],
            notes: [{ where: '.specs/plan-archive/0042-lonely.2026-09-19.plan.md', reason: 'plan matches no spec' }],
        };
        const text = await textOf('board', boardEvent(boardView([card('0001')], { banner })));
        expect(text).toContain('Problems');
        expect(text).toContain('return note matches no spec (number 0099)');
        expect(text).not.toMatch(FORBIDDEN);
    });

    it('negative control: a rule ID in a card sentence is caught by the same pattern', () => {
        expect('Plan done, waiting for review S-REVIEW').toMatch(FORBIDDEN);
        expect('needs a plan R-3').toMatch(FORBIDDEN);
        expect('needs a planR-3Tasks: 3 of 7').toMatch(FORBIDDEN);
        expect('(number 0099)R-61 format note').toMatch(FORBIDDEN);
    });
});
