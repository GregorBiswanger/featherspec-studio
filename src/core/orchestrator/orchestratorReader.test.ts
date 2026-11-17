import { describe, expect, it } from 'vitest';
import type { ApprovalAnswer } from '../ports/agentProvider';
import { READER_TEXT } from './texts';
import { isSpecNotFound } from './specLink';
import { createWorld, type World } from './testing/world';

async function running(world: World): Promise<string> {
    const result = await world.orchestrator.start(world.request({ providerId: 'controlled' }));
    if (result.kind !== 'started') {
        throw new Error(result.reason);
    }
    world.controlled.sink(result.runId).emit({ kind: 'session.started', source: 'provider', payload: {} });
    world.controlled.sink(result.runId).emit({ kind: 'approval.requested', source: 'provider', payload: { requestId: 'a1', actionKind: 'e', summary: 's', outsideProject: false } });
    await world.orchestrator.whenIdle();
    return result.runId;
}

async function changingCalls(world: World, runId: string): Promise<unknown[]> {
    return [
        await world.orchestrator.start(world.request({ providerId: 'nope' })),
        await world.orchestrator.start(world.request({ providerId: 'controlled' })),
        await world.orchestrator.stop(runId),
        await world.orchestrator.resume(runId),
        await world.orchestrator.respondToApproval(runId, 'a1', { decision: 'reject' } as ApprovalAnswer),
        await world.orchestrator.respondToInput(runId, 'a1', 'text'),
    ];
}

describe('reader window', () => {
    it('AC-020: start, stop, resume and every answer are refused with the reader text before anything else and call no provider', async () => {
        const world = await createWorld();
        await world.setSpecs([{ folder: 'active', stem: '0007-board' }]);
        const runId = await running(world);
        world.session.use(await world.openStoreOn());
        const calls = [...world.controlled.calls];
        const results = await changingCalls(world, runId);
        for (const result of results) {
            expect(result).toEqual({ kind: 'refused', code: 'reader-window', reason: READER_TEXT });
        }
        expect(world.controlled.calls).toEqual(calls);
        expect(world.fake.calls()).toEqual([]);
        expect(world.ui.confirmations).toEqual([]);
        expect(await world.runs()).toHaveLength(1);
    });

    it('AC-020: previous run and the flag still answer in a reader window', async () => {
        const world = await createWorld();
        await world.setSpecs([{ folder: 'active', stem: '0007-board' }]);
        const runId = await running(world);
        world.session.use(await world.openStoreOn());
        expect(await world.orchestrator.previousRun('0007-board')).toMatchObject({ kind: 'run', runId });
        expect(isSpecNotFound('0007-board', world.model.current)).toBe(false);
        expect(isSpecNotFound('0099-gone', world.model.current)).toBe(true);
    });

    it('AC-020: negative control, the same calls in the writer window are not refused as a reader', async () => {
        const world = await createWorld();
        await world.setSpecs([{ folder: 'active', stem: '0007-board' }]);
        const runId = await running(world);
        const results = await changingCalls(world, runId);
        for (const result of results) {
            expect(result).not.toMatchObject({ code: 'reader-window' });
        }
    });
});
