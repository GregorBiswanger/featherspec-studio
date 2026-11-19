import { describe, expect, it } from 'vitest';
import { NEED_PLAN_TEXT } from '../../shared/protocol/texts';
import { parseStepTipSettings } from '../settings/stepTipSettings';
import { stepTips } from '../board/stepTips';
import { projectNow, projectUpNext } from './rows';
import { createSpecResolver } from './specRefs';
import { AC001_FIXTURE, modelFor, type SpecInput } from './testing/projects';

async function project(specs: SpecInput[], extraFiles: Record<string, string> = {}) {
    const model = await modelFor(specs, extraFiles);
    const resolver = createSpecResolver(model);
    return { now: projectNow(model, resolver).rows, upNext: projectUpNext(model, resolver) };
}

describe('0018 AC-004: Now', () => {
    it('lists the entries in Active, Review or Blocked, Blocked first, then Review, then Active, then by number, no cap', async () => {
        const { now } = await project([
            { number: '0003', kind: 'Active' },
            { number: '0001', kind: 'Review' },
            { number: '0004', kind: 'Blocked' },
            { number: '0002', kind: 'Review' },
            { number: '0005', kind: 'Backlog' },
            { number: '0006', kind: 'Done' },
        ]);
        expect(now.map((row) => row.spec.number)).toEqual(['0004', '0001', '0002', '0003']);
        expect(now.map((row) => row.state)).toEqual(['Blocked', 'Review', 'Review', 'Active']);
    });

    it('0026 AC-007: seven entries give five rows (0018 O-2 refined: the cap is five)', async () => {
        const { now } = await project(Array.from({ length: 7 }, (_, index) => ({ number: String(index + 1).padStart(4, '0'), kind: 'Active' as const })));
        expect(now).toHaveLength(5);
    });

    it('a row carries state text, the title, the next step and no problem for a healthy spec', async () => {
        const { now } = await project([{ number: '0001', kind: 'Active', title: 'Login' }]);
        expect(now[0]).toMatchObject({ spec: { number: '0001', title: 'Login', found: true }, state: 'Active', status: 'Active', problems: 0 });
        expect(now[0]?.step?.line).toMatch(/\S/);
    });

    it('0021 AC-006: a row carries the short intent and the command short form of its step', async () => {
        const { now } = await project([{ number: '0001', kind: 'Active', title: 'Login' }]);
        expect(now[0]?.step).toMatchObject({ intent: expect.stringMatching(/^\S.*\S$/), short: expect.stringMatching(/^(?:\/sdd-|Implement)/) });
    });

    it('a Problem finding shows as problems > 0 and keeps the entry in Now', async () => {
        const { now } = await project([{ number: '0002', kind: 'Contradicted' }]);
        expect(now.map((row) => [row.spec.number, row.problems > 0])).toEqual([['0002', true]]);
    });

    it('negative control: a Backlog, Ready or Done spec is no Now row', async () => {
        const { now } = await project(AC001_FIXTURE.filter((input) => ['Backlog', 'Ready', 'Done', 'Deprecated'].includes(input.kind)));
        expect(now).toEqual([]);
    });
});

describe('0018 AC-005: Up next', () => {
    it('lists Ready entries, then Backlog entries, each by number, at most three, with "more" and the stems of every entry', async () => {
        const { upNext } = await project([
            { number: '0001', kind: 'Backlog' },
            { number: '0002', kind: 'Backlog' },
            { number: '0003', kind: 'Backlog' },
            { number: '0004', kind: 'Backlog' },
            { number: '0005', kind: 'Ready' },
            { number: '0006', kind: 'Ready' },
        ]);
        expect(upNext.rows.map((row) => row.spec.number)).toEqual(['0005', '0006', '0001']);
        expect(upNext.more).toBe(3);
        expect(upNext.stems).toEqual(['0005-thing', '0006-thing', '0001-thing', '0002-thing', '0003-thing', '0004-thing']);
    });

    it('with three or fewer entries there is no "more" and the stems are those of the rows', async () => {
        const { upNext } = await project([
            { number: '0001', kind: 'Ready' },
            { number: '0002', kind: 'Backlog' },
        ]);
        expect(upNext.more).toBe(0);
        expect(upNext.stems).toEqual(upNext.rows.map((row) => row.spec.stem));
    });

    it('0018 AC-005, boundary: exactly four entries give three rows, "more" 1 and four stems; exactly three give "more" 0', async () => {
        const four = await project([
            { number: '0001', kind: 'Ready' },
            { number: '0002', kind: 'Ready' },
            { number: '0003', kind: 'Backlog' },
            { number: '0004', kind: 'Backlog' },
        ]);
        expect(four.upNext.rows.map((row) => row.spec.number)).toEqual(['0001', '0002', '0003']);
        expect(four.upNext.more).toBe(1);
        expect(four.upNext.stems).toEqual(['0001-thing', '0002-thing', '0003-thing', '0004-thing']);
        const three = await project([
            { number: '0001', kind: 'Ready' },
            { number: '0002', kind: 'Backlog' },
            { number: '0003', kind: 'Backlog' },
        ]);
        expect(three.upNext.rows).toHaveLength(3);
        expect(three.upNext.more).toBe(0);
    });

    it('a Backlog row names its first need, else Backlog; a Ready row names Ready', async () => {
        const { upNext } = await project([
            { number: '0001', kind: 'Backlog' },
            { number: '0002', kind: 'Ready' },
        ]);
        const byNumber = new Map(upNext.rows.map((row) => [row.spec.number, row]));
        expect(byNumber.get('0002')?.status).toBe('Ready');
        expect(byNumber.get('0001')?.status).toBe(NEED_PLAN_TEXT);
    });

    it('a Backlog spec that lacks nothing reads Backlog', async () => {
        const model = await modelFor([{ number: '0001', kind: 'Backlog' }]);
        const entry = model.lifecycle.entries[0]!;
        const ready = { ...model, lifecycle: { ...model.lifecycle, entries: [{ ...entry, readiness: { ...entry.readiness, failing: [] } }] } };
        expect(projectUpNext(ready, createSpecResolver(ready)).rows[0]?.status).toBe('Backlog');
    });

    it('a duplicated stem carries its path in the row and appears once in the stems', async () => {
        const { upNext } = await project([{ number: '0001', kind: 'Backlog' }], { '.specs/done/0001-thing.md': '# Dup\n\n**Status:** Implemented\n**Plan:** _none_\n' });
        expect(upNext.rows[0]?.spec.path).toBe('.specs/backlog/0001-thing.md');
        expect(upNext.stems).toEqual(['0001-thing']);
    });

    it('nothing up next gives no rows, no more and no stems; Active and Done specs are not listed', async () => {
        const { upNext } = await project([
            { number: '0001', kind: 'Active' },
            { number: '0002', kind: 'Done' },
        ]);
        expect(upNext).toEqual({ rows: [], more: 0, stems: [] });
    });
});

describe('0021 AC-009, AC-010: the coach line of the first Now row', () => {
    const SHOW = parseStepTipSettings(true, {});

    async function rowsWith(specs: SpecInput[], tips?: ReturnType<typeof parseStepTipSettings>) {
        const model = await modelFor(specs);
        const resolver = createSpecResolver(model);
        return { now: projectNow(model, resolver, tips).rows, upNext: projectUpNext(model, resolver) };
    }

    it('only now[0] carries tips, those of its case; the other Now rows and Up next carry none', async () => {
        const { now, upNext } = await rowsWith(
            [
                { number: '0001', kind: 'Review' },
                { number: '0002', kind: 'Review' },
                { number: '0003', kind: 'Backlog' },
            ],
            SHOW,
        );
        expect(now[0]?.tips).toEqual(stepTips('NS-5', SHOW));
        expect(now[1]).toBeDefined();
        expect('tips' in now[1]!).toBe(false);
        expect(upNext.rows.every((row) => !('tips' in row))).toBe(true);
    });

    it('without tips input or with show false no row carries tips and the rows are equal', async () => {
        const specs: SpecInput[] = [{ number: '0001', kind: 'Review' }];
        const none = await rowsWith(specs);
        const hidden = await rowsWith(specs, parseStepTipSettings(false, {}));
        const shown = await rowsWith(specs, SHOW);
        expect('tips' in none.now[0]!).toBe(false);
        expect(hidden.now).toEqual(none.now);
        expect({ ...shown.now[0], tips: undefined }).toEqual({ ...none.now[0], tips: undefined });
    });

    it('a first Now row without a line gives no coach line anywhere in Now', async () => {
        const { now } = await rowsWith(
            [
                { number: '0001', slug: 'a', kind: 'Active' },
                { number: '0001', slug: 'b', kind: 'Active' },
                { number: '0002', kind: 'Active' },
            ],
            SHOW,
        );
        expect(now.map((row) => row.step === undefined)).toEqual([true, true, false]);
        expect(now.some((row) => 'tips' in row)).toBe(false);
    });
});

describe('0024 AC-003: only the first Now row with a step carries the send view', () => {
    const SHOW = parseStepTipSettings(true, {});
    const OFFER_A = { assistant: 'copilot' } as const;

    async function rowsWith(specs: SpecInput[], offer?: typeof OFFER_A | { assistant: 'claudeCode' }, tips: ReturnType<typeof parseStepTipSettings> | undefined = undefined) {
        const model = await modelFor(specs);
        const resolver = createSpecResolver(model);
        return { now: projectNow(model, resolver, tips, offer).rows, upNext: projectUpNext(model, resolver) };
    }

    it('now[0] carries send with the default target of its case; later Now rows and Up next carry none', async () => {
        const { now, upNext } = await rowsWith(
            [
                { number: '0001', kind: 'Review' },
                { number: '0002', kind: 'Review' },
                { number: '0003', kind: 'Backlog' },
            ],
            OFFER_A,
        );
        expect(now[0]?.send).toEqual({ assistant: 'copilot', target: 'new', targets: ['new', 'current'] });
        expect('send' in now[1]!).toBe(false);
        expect(upNext.rows.every((row) => !('send' in row))).toBe(true);
    });

    it('Claude Code gives a new chat only; the Active case of Copilot is the current chat', async () => {
        const claude = await rowsWith([{ number: '0001', kind: 'Review' }], { assistant: 'claudeCode' });
        expect(claude.now[0]?.send).toEqual({ assistant: 'claudeCode', target: 'new', targets: ['new'] });
        const active = await rowsWith([{ number: '0001', kind: 'Active' }], OFFER_A);
        expect(active.now[0]?.send).toMatchObject({ assistant: 'copilot', target: 'new' });
    });

    it('without an offer no row carries send and the rows equal the rows of the earlier build', async () => {
        const specs: SpecInput[] = [{ number: '0001', kind: 'Review' }, { number: '0002', kind: 'Active' }];
        const none = await rowsWith(specs);
        const offered = await rowsWith(specs, OFFER_A);
        expect(none.now.some((row) => 'send' in row)).toBe(false);
        expect(offered.now.map((row) => ({ ...row, send: undefined }))).toEqual(none.now.map((row) => ({ ...row, send: undefined })));
    });

    it('a first Now row without a line gives no send in any Now row', async () => {
        const { now } = await rowsWith(
            [
                { number: '0001', slug: 'a', kind: 'Active' },
                { number: '0001', slug: 'b', kind: 'Active' },
                { number: '0002', kind: 'Active' },
            ],
            OFFER_A,
            SHOW,
        );
        expect(now.map((row) => row.step === undefined)).toEqual([true, true, false]);
        expect(now.some((row) => 'send' in row)).toBe(false);
    });

    it('the send view stays with tips off, and the tips of row 0 take the closing pair of the offer', async () => {
        const hidden = await rowsWith([{ number: '0001', kind: 'Review' }], OFFER_A, parseStepTipSettings(false, {}));
        expect(hidden.now[0]?.send).toBeDefined();
        expect('tips' in hidden.now[0]!).toBe(false);
        const shown = await rowsWith([{ number: '0001', kind: 'Review' }], { assistant: 'claudeCode' }, SHOW);
        expect(shown.now[0]?.tips?.about[2]).toBe('Send to Claude Code puts the prompt into its chat and sends nothing: choose the model there, check the prompt, then send it.');
    });
});

