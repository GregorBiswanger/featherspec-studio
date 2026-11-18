import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createClient, type ShellClient } from './client';
import { baseView, mount, send, shellEvent, type Mounted } from './testing/dom';
import { detailEvent, detailView, historySection } from './detail/testing/views';
import { resetSectionMemory } from './detail/sectionMemory';
import { boardEvent, boardView, card } from './board/testing/views';
import { overviewEvent } from './testing/dom';
import { sampleView } from '../shared/protocol/testing/overviewSample';
import type { AreaId } from '../shared/protocol/areas';

/** 0016 AC-011: the visible text holds no internal vocabulary. */
const FORBIDDEN = /S-[A-Z]{3,}|R-[1-7]|NS-\d|persisted|Model updated|first observed|no longer observed|not checked|\d{4}-\d{2}-\d{2}T\d{2}:/;

let mounted: Mounted | undefined;
const clients: ShellClient[] = [];

async function textOf(area: AreaId, event: unknown): Promise<string> {
    const client = createClient({ post: () => undefined });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area }), 1));
    await send(event);
    return mounted.container.textContent ?? '';
}


async function visibleText(view = detailView()): Promise<string> {
    const client = createClient({ post: () => undefined });
    clients.push(client);
    client.start();
    mounted = await mount(<App client={client} />);
    await send(shellEvent(baseView({ area: 'board', selection: { stem: '0007-thing', number: '0007' } }), 1));
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
        const text = await visibleText(detailView({ history: { ...historySection(), statusHistory: history } }));
        expect(text).not.toMatch(FORBIDDEN);
        expect(text).toContain('first seen as Review');
        expect(text).toContain('Review → no longer in the project');
    });

    it('0019: the situation picture (a derived state, needs, steps, open criteria, files, notes) shows no rule ID or internal word', async () => {
        const view = detailView({
            state: 'Review',
            rule: 'S-REVIEW',
            persistence: 'derived',
            successor: 'Successor: none — behaviour removed',
            progress: {
                needs: [{ text: 'needs a plan', rule: 'R-3' }],
                noPlan: false,
                steps: { kind: 'steps', done: 1, total: 2, next: { id: 'T-002', title: 'Second', open: { key: '.specs/active/0007-thing.plan.md', line: 30 } } },
                criteria: { kind: 'criteria', verified: 0, total: 1, open: [{ id: 'AC-001', text: 'The board shall render.', built: true, open: { key: '.specs/active/0007-thing.md', line: 9 } }] },
            },
        }, undefined, [{ reason: 'Folder done/ does not match status "In Progress".', open: { key: '.specs/active/0007-thing.md', line: 4 } }]);
        const text = await visibleText(view);
        expect(text).not.toMatch(FORBIDDEN);
        expect(text).toContain('Plan done, waiting for review');
        expect(text).toContain('The board shall render. · built');
        expect(text).toContain('needs a plan');
    });

    it('negative control: the old history line is caught by the same pattern', () => {
        expect('2026-11-17T21:56:14.561Z · — → Review · S-REVIEW · first observed · not checked').toMatch(FORBIDDEN);
        expect('S-ACTIVE · persisted').toMatch(FORBIDDEN);
    });
});

describe('0016 AC-011: user language on every surface 0016 touched', () => {
    it('the Board card shows no rule ID or internal word, whatever its state, need or Problem', async () => {
        const cards = [
            card('0001', { state: 'Ready' }),
            card('0002', { state: 'Review' }),
            card('0003', { state: 'Blocked', blocked: ['Blocked: plan status Blocked'] }),
            card('0004', { state: 'Backlog', need: { text: 'needs a plan', rule: 'R-3' }, problems: 2 }),
            card('0005', { state: 'Done', deprecated: true }),
        ];
        const text = await textOf('board', boardEvent(boardView(cards)));
        expect(text).not.toMatch(FORBIDDEN);
        expect(text).toContain('needs a plan');
        expect(text).toContain('Blocked: plan status Blocked');
    });

    it('Overview (Now, Up next, Problems, figures, activity) shows no rule ID or internal word', async () => {
        const view = sampleView();
        view.now = [{ spec: { stem: '0002-b', number: '0002', title: 'B', path: '.specs/active/0002-b.md', found: true }, state: 'Review', status: 'Review', problems: 1 }];
        view.upNext = { rows: [{ spec: { stem: '0003-c', number: '0003', title: 'C', found: true }, state: 'Backlog', status: 'needs a plan', problems: 0 }], more: 1, stems: ['0003-c', '0004-d'] };
        if (view.activity.available) {
            view.activity = { ...view.activity, open: true };
        }
        view.problems.lines = [{ where: 'project', reason: 'a return note has no spec', sentence: 'a return note has no spec' }];
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

    it('0022 AC-013: a sentence replaces the reason in the banner, the Overview and the detail, and the reason stays in the tooltip', async () => {
        const banner = { problems: [{ where: '.specs/backlog', reason: 'R-5 listing failed', sentence: 'Studio could not read the backlog folder.' }], notes: [] };
        const board = await textOf('board', boardEvent(boardView([card('0001')], { banner })));
        expect(board).toContain('Studio could not read the backlog folder.');
        expect(board).not.toContain('R-5 listing failed');
        expect(board).not.toMatch(FORBIDDEN);
        mounted?.unmount();
        const detail = await visibleText(detailView({}, undefined, [{ reason: 'S-REVIEW contradiction', sentence: 'The files disagree about the state of this spec.' }]));
        expect(detail).toContain('The files disagree about the state of this spec.');
        expect(detail).not.toContain('S-REVIEW contradiction');
        expect(detail).not.toMatch(FORBIDDEN);
    });

    it('negative control: a rule ID in a card sentence is caught by the same pattern', () => {
        expect('Plan done, waiting for review S-REVIEW').toMatch(FORBIDDEN);
        expect('needs a plan R-3').toMatch(FORBIDDEN);
        expect('needs a planR-3Tasks: 3 of 7').toMatch(FORBIDDEN);
        expect('(number 0099)R-61 format note').toMatch(FORBIDDEN);
    });
});
