import { describe, expect, it } from 'vitest';
import type { BoardState } from '../../shared/protocol/boardFilter';
import type { MoveResult } from '../../shared/protocol/board';
import type { MovePickPort, PickableSpec } from '../ports/board';
import { planText, specText } from '../lifecycle/testing/projects';
import { createMoveResultPresenter, createMoves } from './moves';
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

async function setup(options: { focused?: string | null; selected?: { stem: string; path?: string }; pickSpec?: string; pickTarget?: BoardState } = {}) {
    const source = createFakeSource(await modelOf(FILES));
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
        picks,
        sink: { show: (result) => void shown.push(result) },
        selection: { selection: () => options.selected, onDidChange: () => ({ dispose: () => undefined }) },
        focused: () => options.focused ?? null,
    });
    return { moves, shown, picked, source };
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
        const { moves } = await setup();
        const result = await moves.requestMove(key, target as BoardState);
        expect(result.kind).toBe(kind);
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

    it('0015 AC-006: an accepted Ready to Active request returns the next step of the spec, and the model is untouched', async () => {
        const { moves, source } = await setup();
        const before = JSON.stringify(source.current());
        expect(await moves.requestMove(READY, 'Active')).toEqual({ kind: 'nextStep', number: '0002', line: 'Implement .specs/backlog/0002-r.plan.md' });
        expect(JSON.stringify(source.current())).toBe(before);
        expect(source.current()?.lifecycle.entries.find((entry) => entry.key === READY)?.state).toBe('Ready');
    });

    it('0015 AC-006: the line names the first open step of the plan (NS-7)', async () => {
        const source = createFakeSource(
            await modelOf({
                '.specs/backlog/0005-s.md': specText({ plan: '[0005-s.plan.md](0005-s.plan.md)' }),
                '.specs/backlog/0005-s.plan.md': `${planText()}\n## Steps\n\n### T-001 — A\n\n- [x] **Verified (T-001):** done\n\n### T-002 — B\n\n- [ ] **Verified (T-002):** —\n`,
            }),
        );
        const moves = createMoves({ source, picks: { pickSpec: async () => undefined, pickTarget: async () => undefined }, sink: { show: () => undefined }, selection: { selection: () => undefined, onDidChange: () => ({ dispose: () => undefined }) }, focused: () => null });
        expect(await moves.requestMove('.specs/backlog/0005-s.md', 'Active')).toEqual({ kind: 'nextStep', number: '0005', line: 'Start T-002 of .specs/backlog/0005-s.plan.md' });
    });

    it('0015 AC-006, AC-008: every refusal keeps its text and no request starts anything (negative control: no start dependency exists)', async () => {
        const { moves } = await setup();
        expect(await moves.requestMove(BACKLOG, 'Active')).toMatchObject({ kind: 'refused' });
        expect(await moves.requestMove(ACTIVE, 'Backlog')).toEqual({ kind: 'refused', text: 'Studio does not move specs; lifecycle moves belong to /sdd-lifecycle.' });
    });
});

describe('the move command', () => {
    it('AC-014: it acts on the focused card first', async () => {
        const { moves, shown, picked } = await setup({ focused: READY, selected: { stem: '0003-a' }, pickTarget: 'Active' });
        await moves.runMoveCommand();
        expect(picked.specs).toEqual([]);
        expect(picked.targets).toEqual([{ number: '0002', targets: ['Backlog', 'Active', 'Review', 'Done', 'Blocked'] }]);
        expect(shown).toEqual([{ kind: 'nextStep', number: '0002', line: 'Implement .specs/backlog/0002-r.plan.md' }]);
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
        expect(shown).toHaveLength(1);
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

describe('0015 AC-006, AC-009: the move result outside the board ("Move Spec to…" command)', () => {
    const LINE = '/sdd-plan .specs/backlog/0002-r.md';
    const RESULT: MoveResult = { kind: 'nextStep', number: '0002', line: LINE };

    function presenter(options: { choice?: string; boardShown?: boolean; clipboardFails?: boolean } = {}) {
        const said: string[] = [];
        const copied: string[] = [];
        const shown = createMoveResultPresenter({
            boardShown: () => options.boardShown ?? false,
            messages: {
                async inform(text, action) {
                    said.push(`info: ${text}${action === undefined ? '' : ` [${action}]`}`);
                    return action === undefined ? undefined : options.choice;
                },
                warn: (text) => void said.push(`warn: ${text}`),
            },
            clipboard: {
                async writeText(text) {
                    if (options.clipboardFails === true) {
                        throw new Error('clipboard refused');
                    }
                    copied.push(text);
                },
            },
        });
        return { shown, said, copied };
    }

    it('0015 AC-006: the result names the number and the line and offers "Copy"; dismissing it copies nothing', async () => {
        const { shown, said, copied } = presenter();
        await shown.show(RESULT);
        expect(said).toEqual([`info: Studio starts no agent. Next step for 0002 — paste it into your AI assistant: ${LINE} [Copy]`]);
        expect(copied).toEqual([]);
    });

    it('0015 AC-005: "Copy" puts exactly the line on the clipboard and says "Copied to the clipboard."', async () => {
        const { shown, said, copied } = presenter({ choice: 'Copy' });
        await shown.show(RESULT);
        expect(copied).toEqual([LINE]);
        expect(said.at(-1)).toBe('info: Copied to the clipboard.');
    });

    it('0015 AC-009: a failed clipboard write says "Could not copy to the clipboard." and nothing else', async () => {
        const { shown, said, copied } = presenter({ choice: 'Copy', clipboardFails: true });
        await shown.show(RESULT);
        expect(copied).toEqual([]);
        expect(said.slice(1)).toEqual(['warn: Could not copy to the clipboard.']);
    });

    it('a refusal is a warning; no change and a result the board shows say nothing here', async () => {
        const refused = presenter();
        await refused.shown.show({ kind: 'refused', text: 'Not allowed.' });
        expect(refused.said).toEqual(['warn: Not allowed.']);
        const none = presenter();
        await none.shown.show({ kind: 'none' });
        expect(none.said).toEqual([]);
        const onBoard = presenter({ boardShown: true });
        await onBoard.shown.show(RESULT);
        expect(onBoard.said).toEqual([]);
    });
});
