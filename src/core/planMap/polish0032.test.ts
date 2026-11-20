import { describe, expect, it } from 'vitest';
import { waitingIntegrateIntent } from '../../shared/protocol/nextStepTexts';
import { buildDetail } from '../board/detail';
import { fixtureModel, replaceIn, setNote } from './testing/plans';

const PARTIAL = '.specs/active/0001-fixture-demo.md';
const PARTIAL_PLAN = '.specs/active/0001-fixture-demo.plan.md';
const NO_HISTORY = { available: true as const, label: '', entries: [] };
const NOTE_4 = '.memory-bank/activeContext.0001-T-004.md';
const note = (id: string, status: string) => `# Return note — 0001 · ${id}\n\n- **Status:** ${status}\n- **Files:** —\n- **Verified:** —\n- **Notes:** —\n`;

async function intentOf(model: Awaited<ReturnType<typeof fixtureModel>>): Promise<{ intent: string; quiet: boolean }> {
    const view = buildDetail({ selection: { stem: '0001-fixture-demo', path: PARTIAL }, model, history: NO_HISTORY });
    if (view.kind !== 'spec' || !('lines' in view.nextStep)) {
        throw new Error('no lines');
    }
    return { intent: view.nextStep.lines[0]!.intent, quiet: 'quiet' in view.nextStep && view.nextStep.quiet === true };
}

describe('0032 AC-005: the quiet Integrate names the members that are not back', () => {
    it('0032 AC-005 one, two and three or more missing IDs, joined in plan order', () => {
        expect(waitingIntegrateIntent(['T-004'])).toBe('When T-004 is back: integrate the returned steps');
        expect(waitingIntegrateIntent(['T-004', 'T-006'])).toBe('When T-004 and T-006 are back: integrate the returned steps');
        expect(waitingIntegrateIntent(['T-004', 'T-005', 'T-006'])).toBe('When T-004, T-005 and T-006 are back: integrate the returned steps');
    });

    it('0032 AC-005 fs-partial-return (T-004 not back): the detail reads the waiting sentence and stays quiet', async () => {
        expect(await intentOf(await fixtureModel('fs-partial-return'))).toEqual({ intent: 'When T-004 is back: integrate the returned steps', quiet: true });
    });

    it('0032 AC-005 a BLOCKED member counts as back: the next step finds out what blocks, no waiting sentence', async () => {
        const model = await fixtureModel('fs-partial-return', setNote('.memory-bank/activeContext.0001-T-005.md', note('T-005', 'BLOCKED')));
        expect(await intentOf(model)).toEqual({ intent: 'Find out what blocks', quiet: false });
    });

    it('0032 AC-005 once every member is back the intent is Integrate the returned steps again', async () => {
        const model = await fixtureModel('fs-partial-return', setNote(NOTE_4, note('T-004', 'DONE')));
        expect(await intentOf(model)).toEqual({ intent: 'Integrate the returned steps', quiet: false });
    });

    it('0032 AC-005 two members out of a three-member group: the detail names both in plan order', async () => {
        const model = await fixtureModel('fs-partial-return', replaceIn(PARTIAL_PLAN, '2. T-004 ‖ T-005 — separate modules', '2. T-004 ‖ T-005 ‖ T-006 — separate modules'));
        expect(await intentOf(model)).toEqual({ intent: 'When T-004 and T-006 are back: integrate the returned steps', quiet: true });
    });
});
