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
import { planSample, stage, step } from '../shared/protocol/testing/planSample';
import type { SpecDetailView } from '../shared/protocol/detail';
import type { PlanView } from '../shared/protocol/planMap';
import { click } from './testing/dom';

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
        view.now = { rows: [{ spec: { stem: '0002-b', number: '0002', title: 'B', path: '.specs/active/0002-b.md', found: true }, state: 'Review', status: 'Review', problems: 1 }], more: 0, stems: [] };
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

describe('0023 AC-015: user language in the Plan section and the Plan map', () => {
    const INTERNAL = /S-[A-Z]{3,}|R-[1-7]|NS-\d|\bstruck\b|\bsibling\b|\bkind\b|\bstem\b|\bparsing\b/;

    function sample(): PlanView {
        const returned = planSample();
        return {
            ...returned,
            stages: [
                ...returned.stages.slice(0, 1),
                stage(2, [{ steps: [step('T-003', 'returned', { returned: { status: 'blocked', reason: 'no access' } }), step('T-004', 'dropped'), step('T-005', 'notFound', { open: undefined })] }], { current: true, returned: '1 of 2 returned, T-003 blocked · T-004 not back yet', ways: returned.stages[1]!.ways! }),
            ],
            loose: [step('T-009', 'open')],
        };
    }

    function within(container: HTMLElement, selector: string): string {
        const scoped = [...container.querySelectorAll<HTMLElement>(selector)];
        const attributes = scoped.flatMap((root) => [root, ...root.querySelectorAll('[title], [aria-label]')]).flatMap((element) => [element.getAttribute('title'), element.getAttribute('aria-label')]);
        return [...scoped.map((root) => root.textContent ?? ''), ...attributes].join('\n');
    }

    async function mapText(plan: PlanView): Promise<string> {
        const client = createClient({ post: () => undefined });
        clients.push(client);
        client.start();
        mounted = await mount(<App client={client} />);
        await send(shellEvent(baseView({ area: 'planMap', selection: { stem: '0007-thing', number: '0007' } }), 1));
        await send(boardEvent(boardView([card('0007')])));
        await send(detailEvent({ ...(detailView() as SpecDetailView), plan }));
        const toggle = mounted.container.querySelector<HTMLButtonElement>('[data-ways] .plan-ways-toggle');
        if (toggle !== null) {
            await click(toggle);
        }
        for (const head of mounted.container.querySelectorAll<HTMLButtonElement>('[data-card-toggle]')) {
            await click(head);
        }
        return within(mounted.container, '[data-plan-map]');
    }

    it('the Plan map with every state, the ways and the expanded cards holds no rule ID and no internal word', async () => {
        const text = await mapText(sample());
        expect(text).toContain('Ways to run stage 2');
        expect(text).toContain('Returned · blocked: no access');
        expect(text).not.toMatch(INTERNAL);
        expect(text).not.toMatch(FORBIDDEN);
    });

    it('the Plan section of the side panel holds no rule ID and no internal word', async () => {
        const client = createClient({ post: () => undefined });
        clients.push(client);
        client.start();
        mounted = await mount(<App client={client} />);
        await send(shellEvent(baseView({ area: 'board', selection: { stem: '0007-thing', number: '0007' } }), 1));
        await send(boardEvent(boardView([card('0007')])));
        await send(detailEvent({ ...(detailView() as SpecDetailView), plan: sample() }));
        const text = within(mounted.container, '.plan-stages, .plan-closing');
        expect(text).toContain('T-003');
        expect(text).not.toMatch(INTERNAL);
        expect(text).not.toMatch(FORBIDDEN);
    });

    it('negative control: the pattern finds each forbidden word', () => {
        for (const word of ['S-REVIEW', 'R-3', 'NS-6', 'a struck step', 'a sibling', 'kind', 'stem', 'parsing']) {
            expect(word).toMatch(INTERNAL);
        }
        expect('Returned · blocked: no access').not.toMatch(INTERNAL);
    });
});

describe('0025 AC-019: user language in the header, the card rows, U-05, U-06 and U-08', () => {
    const INTERNAL = /S-[A-Z]{3,}|R-[1-7]|NS-\d|\btraceability\b|\bstruck\b|\bsibling\b|\bkind\b|\bstem\b|\bparsing\b/;
    const U05 = '1 returned, waiting to be integrated: the next step integrates them.';
    const U08 = '1 of 2 returned · T-004 not back yet';

    function rich(): PlanView {
        const base = planSample();
        return {
            ...base,
            returned: U08,
            stages: [
                stage(1, [{ steps: [step('T-001', 'done', { verified: { short: '2026-11-09 · npm test green', full: '2026-11-09 · npm test green' }, covers: [{ id: 'AC-001', state: 'built' }] })] }], { finished: false }),
                stage(2, [{ steps: [step('T-003', 'returned', { returned: { status: 'done' }, reported: { short: '2026-11-10 · red → green', full: '2026-11-10 · red → green' } }), step('T-004', 'open', { copy: 'Implement T-004 of p' })] }], { current: true, returned: U08, ways: base.stages[1]!.ways! }),
            ],
            loose: [],
        };
    }

    const NEXT = { rule: 'NS-6', lines: [{ text: 'Implement T-004 of p', intent: 'Continue with T-004 Step', step: { id: 'T-004', open: { key: 'p', line: 5 } } }], parallel: { stage: 2 } };

    async function whole(area: 'planMap' | 'board'): Promise<string> {
        const client = createClient({ post: () => undefined });
        clients.push(client);
        client.start();
        mounted = await mount(<App client={client} />);
        await send(shellEvent(baseView({ area, selection: { stem: '0007-thing', number: '0007' } }), 1));
        await send(boardEvent(boardView([card('0007')])));
        await send(detailEvent({ ...(detailView({}, NEXT as never) as SpecDetailView), plan: rich() }));
        for (const head of mounted.container.querySelectorAll<HTMLButtonElement>('[data-card-toggle]')) {
            await click(head);
        }
        const scoped = [...mounted.container.querySelectorAll<HTMLElement>(area === 'planMap' ? '[data-plan-map]' : '.next-step')];
        const attributes = scoped.flatMap((root) => [root, ...root.querySelectorAll('[title], [aria-label]')]).flatMap((element) => [element.getAttribute('title'), element.getAttribute('aria-label')]);
        return [...scoped.map((root) => root.textContent ?? ''), ...attributes].join('\n');
    }

    it('0025 AC-019: the Plan map with the header, the card rows, U-05 and U-08 holds no rule ID and no internal word', async () => {
        const text = await whole('planMap');
        for (const wanted of ['Continue with T-004', 'Verified', 'Reported', 'AC-001 built', U08]) {
            expect(text, wanted).toContain(wanted);
        }
        expect(text).not.toMatch(INTERNAL);
        expect(text).not.toMatch(FORBIDDEN);
    });

    it('0025 AC-019: the side panel beside the Board with the parallel hint (U-06) holds no rule ID and no internal word', async () => {
        const text = await whole('board');
        expect(text).toContain('Stage 2 can run in parallel · Ways to run it');
        expect(text.match(INTERNAL)?.[0]).toBeUndefined();
        expect(text).not.toMatch(FORBIDDEN);
    });

    it('negative control: the pattern finds a rule ID, traceability, struck and stem', () => {
        for (const word of ['NS-6', 'R-3', 'the traceability row', 'a struck step', 'the stem']) {
            expect(word).toMatch(INTERNAL);
        }
        expect(`${U05}\n${U08}`).not.toMatch(INTERNAL);
    });
});
