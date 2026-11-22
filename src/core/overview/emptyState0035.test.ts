import { describe, expect, it } from 'vitest';
import { isBoardView } from '../../shared/protocol/board';
import { isOverviewView } from '../../shared/protocol/overview';
import { ASSISTANT_TARGETS } from '../../shared/protocol/assistant';
import { emptySendOf } from '../assistant/welcome';
import { createFakeOffer } from '../assistant/testing/fakeOffer';
import { createBoardWorld } from '../board/testing/boardWorld';
import { modelOfFixture } from '../board/testing/nextStepSnapshot';
import type { SetupRun } from '../discovery/setupSign';
import type { ShellModel } from '../ports/shell';
import { buildOverviewView } from './overviewView';

const HISTORY = { available: true as const, label: 'Observed', entries: [] };

function withSign(model: ShellModel, setupRun: SetupRun): ShellModel {
    return { ...model, project: { ...model.project, setupRun } };
}

async function boardOf(model: ShellModel, assistant?: 'copilot' | 'claudeCode') {
    const world = createBoardWorld(model, undefined, undefined, createFakeOffer(assistant === undefined ? undefined : { assistant }));
    await world.service.whenIdle();
    return world.service.view()!;
}

describe('0035 AC-007: the empty state No specs yet offers the step action', () => {
    it.each(['copilot', 'claudeCode'] as const)('0035 AC-007 fs-setup-done-no-specs with %s: Overview and Board carry start with 0026 default target and menu, no attachment', async (assistant) => {
        const model = withSign(await modelOfFixture('fs-setup-done-no-specs'), 'run or unknown');
        const expected = { assistant, target: 'new', targets: [...ASSISTANT_TARGETS[assistant]] };
        const overview = buildOverviewView({ model, history: HISTORY, offer: { assistant } });
        const board = await boardOf(model, assistant);
        expect(overview.start).toEqual(expected);
        expect(board.start).toEqual(expected);
        expect(overview.start).not.toHaveProperty('attach');
        expect(overview.welcome).toBeUndefined();
        expect(board.welcome).toBeUndefined();
        expect(isOverviewView(overview)).toBe(true);
        expect(isBoardView(board)).toBe(true);
    });

    it('0035 AC-007 with an unknown sign the same start is offered', async () => {
        const model = withSign(await modelOfFixture('fs-setup-done-no-specs'), 'run or unknown');
        expect(emptySendOf(model, { assistant: 'claudeCode' })).toEqual({ assistant: 'claudeCode', target: 'new', targets: [...ASSISTANT_TARGETS.claudeCode] });
    });

    it('0035 AC-008 without an offered assistant the views carry no start key', async () => {
        const model = withSign(await modelOfFixture('fs-setup-done-no-specs'), 'run or unknown');
        const overview = buildOverviewView({ model, history: HISTORY });
        const board = await boardOf(model);
        expect('start' in overview).toBe(false);
        expect('start' in board).toBe(false);
        expect(emptySendOf(model, undefined)).toBeUndefined();
    });

    it('0035 AC-007 fs-setup-not-run keeps the welcome and carries no start', async () => {
        const model = withSign(await modelOfFixture('fs-setup-not-run'), 'not run');
        const overview = buildOverviewView({ model, history: HISTORY, offer: { assistant: 'claudeCode' } });
        const board = await boardOf(model, 'claudeCode');
        expect(overview.welcome).toBeDefined();
        expect(board.welcome).toBeDefined();
        expect('start' in overview).toBe(false);
        expect('start' in board).toBe(false);
        expect(emptySendOf(model, { assistant: 'claudeCode' })).toBeUndefined();
    });

    it('0035 AC-008 a project with specs carries no start even with an offer', async () => {
        const model = await modelOfFixture('fs180-de-baselines');
        const overview = buildOverviewView({ model, history: HISTORY, offer: { assistant: 'copilot' } });
        const board = await boardOf(model, 'copilot');
        expect('start' in overview).toBe(false);
        expect('start' in board).toBe(false);
    });

    it('0035 AC-007 the validators accept start only beside the empty state and only as a send view', async () => {
        const model = withSign(await modelOfFixture('fs-setup-done-no-specs'), 'run or unknown');
        const overview = buildOverviewView({ model, history: HISTORY, offer: { assistant: 'copilot' } });
        const board = await boardOf(model, 'copilot');
        expect(isOverviewView({ ...overview, start: { assistant: 'copilot' } })).toBe(false);
        expect(isBoardView({ ...board, start: 'x' })).toBe(false);
        const populated = await modelOfFixture('fs180-de-baselines');
        const withSpecs = buildOverviewView({ model: populated, history: HISTORY });
        expect(isOverviewView({ ...withSpecs, start: overview.start })).toBe(false);
    });
});
