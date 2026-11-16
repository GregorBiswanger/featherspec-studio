import { describe, expect, it } from 'vitest';
import type { BoardState } from '../../shared/protocol/boardFilter';
import type { MoveResult } from '../../shared/protocol/board';
import type { MovePickPort, PickableSpec, StartRequest } from '../ports/board';
import { planText, specText } from '../lifecycle/testing/projects';
import { createMoves } from './moves';
import { createFakeSource, modelOf } from './testing/boardWorld';

const LINKED = '[0002-r.plan.md](0002-r.plan.md)';
const FILES = {
    '.specs/backlog/0001-b.md': specText(),
    '.specs/backlog/0002-r.md': specText({ plan: LINKED }),
    '.specs/backlog/0002-r.plan.md': planText({ status: 'Not started' }),
    '.specs/active/0003-a.md': specText({ status: 'In Progress', plan: '[0003-a.plan.md](0003-a.plan.md)' }),
    '.specs/active/0003-a.plan.md': planText({ status: 'In Progress' }),
    '.specs/done/0004-d.md': specText({ status: 'Baseline' }),
};

async function setup(options: { withStart?: boolean; focused?: string | null; selected?: { stem: string; path?: string }; pickSpec?: string; pickTarget?: BoardState } = {}) {
    const source = createFakeSource(await modelOf(FILES));
    const started: StartRequest[] = [];
    const shown: MoveResult[] = [];
    const picked: { specs: PickableSpec[][]; targets: { number: string; targets: BoardState[] }[] } = { specs: [], targets: [] };
    const picks: MovePickPort = {
        async pickSpec(items) {
            picked.specs.push(items);
            return options.pickSpec;
        },
        async pickTarget(number, targets) {
            picked.targets.push({ number, targets });
            return options.pickTarget;
        },
    };
    const moves = createMoves({
        source,
        start: options.withStart ? { start: async (request) => void started.push(request) } : undefined,
        picks,
        sink: { show: (result) => void shown.push(result) },
        selection: { selection: () => options.selected, onDidChange: () => ({ dispose: () => undefined }) },
        focused: () => options.focused ?? null,
    });
    return { moves, started, shown, picked, source };
}

const BACKLOG = '.specs/backlog/0001-b.md';
const READY = '.specs/backlog/0002-r.md';
const ACTIVE = '.specs/active/0003-a.md';

describe('move requests', () => {
    it.each([
        [READY, 'Ready', 'none'],
        [READY, 'Backlog', 'refused'],
        [READY, 'Review', 'refused'],
        [READY, 'Done', 'refused'],
        [READY, 'Blocked', 'refused'],
        [BACKLOG, 'Active', 'refused'],
        [ACTIVE, 'Done', 'refused'],
        [ACTIVE, 'Ready', 'refused'],
    ])('AC-014: %s to %s is %s, and a refusal carries the reason of 0003', async (key, target, kind) => {
        const { moves, started } = await setup({ withStart: true });
        const result = await moves.requestMove(key, target as BoardState);
        expect(result.kind).toBe(kind);
        expect(started).toEqual([]);
        if (result.kind === 'refused') {
            expect(result.text.length).toBeGreaterThan(10);
        }
    });

    it('AC-014: the reasons are the texts of 0003 (derived target, needs evidence, not ready, lifecycle move)', async () => {
        const { moves } = await setup();
        const texts = await Promise.all([moves.requestMove(READY, 'Review'), moves.requestMove(ACTIVE, 'Done'), moves.requestMove(BACKLOG, 'Active'), moves.requestMove(ACTIVE, 'Backlog')]);
        expect(texts.map((result) => (result.kind === 'refused' ? result.text : ''))).toEqual([
            'Review is derived from the files (rule S-REVIEW); it cannot be set on the board.',
            'Done needs /sdd-compile evidence and the /sdd-lifecycle move; Studio does not move specs.',
            expect.stringMatching(/^The spec is not Ready: R-3 /),
            'Studio does not move specs; lifecycle moves belong to /sdd-lifecycle.',
        ]);
    });

    it('AC-014: a key the model does not hold is refused with "no longer in the project"', async () => {
        const { moves } = await setup();
        expect(await moves.requestMove('.specs/active/0099-gone.md', 'Active')).toEqual({ kind: 'refused', text: 'This spec is no longer in the project.' });
    });

    it('AC-015: an accepted Ready to Active move with no start workflow is refused with "Agent start is not available yet"', async () => {
        const { moves, started } = await setup();
        expect(await moves.requestMove(READY, 'Active')).toEqual({ kind: 'refused', text: 'Agent start is not available yet' });
        expect(started).toEqual([]);
    });

    it('AC-015: with a start workflow the stem is handed off, the result names the number, and the model is untouched', async () => {
        const { moves, started, source } = await setup({ withStart: true });
        const before = JSON.stringify(source.current()?.lifecycle);
        expect(await moves.requestMove(READY, 'Active')).toEqual({ kind: 'handedOff', number: '0002' });
        expect(started).toEqual([{ stem: '0002-r', key: READY }]);
        expect(JSON.stringify(source.current()?.lifecycle)).toBe(before);
        expect(source.current()?.lifecycle.entries.find((entry) => entry.key === READY)?.state).toBe('Ready');
    });
});

describe('the move command', () => {
    it('AC-014: it acts on the focused card first', async () => {
        const { moves, shown, picked } = await setup({ focused: READY, selected: { stem: '0003-a' }, pickTarget: 'Active' });
        await moves.runMoveCommand();
        expect(picked.specs).toEqual([]);
        expect(picked.targets).toEqual([{ number: '0002', targets: ['Backlog', 'Active', 'Review', 'Done', 'Blocked'] }]);
        expect(shown).toEqual([{ kind: 'refused', text: 'Agent start is not available yet' }]);
    });

    it('AC-014: else on the selected spec', async () => {
        const { moves, picked } = await setup({ selected: { stem: '0003-a' }, pickTarget: 'Done' });
        await moves.runMoveCommand();
        expect(picked.targets.map((entry) => entry.number)).toEqual(['0003']);
        expect(picked.targets[0]?.targets).toEqual(['Backlog', 'Ready', 'Review', 'Done', 'Blocked']);
    });

    it('AC-014: else on the spec the developer picks from the project specs', async () => {
        const { moves, picked, shown } = await setup({ pickSpec: BACKLOG, pickTarget: 'Active' });
        await moves.runMoveCommand();
        expect(picked.specs[0]?.map((item) => item.number)).toEqual(['0001', '0002', '0003', '0004']);
        expect(shown[0]?.kind).toBe('refused');
    });

    it('AC-014: cancelling a pick shows nothing', async () => {
        const first = await setup();
        await first.moves.runMoveCommand();
        expect(first.shown).toEqual([]);
        const second = await setup({ pickSpec: BACKLOG });
        await second.moves.runMoveCommand();
        expect(second.shown).toEqual([]);
    });

    it('AC-014: a selection of a stem the model no longer has falls through to the pick list', async () => {
        const { moves, picked } = await setup({ selected: { stem: '0099-gone' } });
        await moves.runMoveCommand();
        expect(picked.specs).toHaveLength(1);
    });
});
