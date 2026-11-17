import { describe, expect, it } from 'vitest';
import { createCenterWorld } from './testing/centerWorld';

describe('AC-025: after a restart', () => {
    it('a second store instance on the same memory shows the same rows in the same order, formerly open runs as Interrupted without an open request, and the remembered selection and filter', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun('Running');
        await world.append(run.runId, 'turn.started');
        await world.append(run.runId, 'message.delta', { text: 'Hel' });
        await world.append(run.runId, 'message.completed', { text: 'Hello' });
        await world.append(run.runId, 'approval.requested', { requestId: 'a1', actionKind: 'edit', summary: 'Edit', outsideProject: false });
        world.navigation.send({ area: 'agentCenter', target: { kind: 'spec', stem: '0007-board' } });
        world.service.select(run.runId);
        await world.flush();
        const beforeRows = world.service.timeline()?.rows;
        expect(beforeRows).toHaveLength(3);
        const beforeDetail = world.service.view();
        expect(beforeDetail?.kind === 'ready' && beforeDetail.detail?.requests).toHaveLength(1);
        world.service.dispose();

        await world.world.reopen();
        const restarted = world.makeService();
        await restarted.whenIdle();
        const view = restarted.view();
        expect(view?.kind).toBe('ready');
        if (view?.kind !== 'ready') {
            return;
        }
        expect(view.rows.map((row) => [row.runId, row.status])).toEqual([[run.runId, 'Interrupted']]);
        expect(view.filter).toEqual({ stem: '0007-board', label: '0007' });
        expect(view.detail?.header.runId).toBe(run.runId);
        expect(view.detail?.requests).toEqual([]);
        expect(view.detail?.activity).toBeUndefined();
        expect(restarted.timeline()?.rows).toEqual(beforeRows);
    });
});
