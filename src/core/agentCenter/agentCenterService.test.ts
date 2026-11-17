import { describe, expect, it } from 'vitest';
import type { AgentCenterView } from '../../shared/protocol/agentCenter';
import { AGENT_CENTER_PAGE_SIZE, MAX_LOADED_PAGES } from './constants';
import { createCenterWorld } from './testing/centerWorld';

function ready(view: AgentCenterView | undefined) {
    if (view?.kind !== 'ready') {
        throw new Error(`no ready view: ${JSON.stringify(view)}`);
    }
    return view;
}

describe('AC-013: the run list follows new runs and status changes', () => {
    it('a new run and a status change show up as soon as the store signals, with no clock advance', async () => {
        const world = await createCenterWorld();
        await world.flush();
        expect(ready(world.service.view()).empty).toBe('no-runs');
        const run = await world.addRun('Running');
        await world.flush();
        expect(ready(world.service.view()).rows.map((row) => [row.runId, row.status])).toEqual([[run.runId, 'Running']]);
        await world.world.store.reportStatus(run.runId, 'WaitingForApproval');
        await world.flush();
        expect(ready(world.service.view()).rows[0]?.status).toBe('WaitingForApproval');
    });

    it('open runs are listed before ended runs', async () => {
        const world = await createCenterWorld();
        const ended = await world.addRun('Running');
        await world.world.store.reportStatus(ended.runId, 'Completed');
        const open = await world.addRun('Running');
        await world.flush();
        expect(ready(world.service.view()).rows.map((row) => row.runId)).toEqual([open.runId, ended.runId]);
    });
});

describe('AC-012: the shown run follows its events', () => {
    it('a stored event appears in the timeline, the activity and the file list without a developer action or a clock advance', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        await world.flush();
        world.service.select(run.runId);
        await world.flush();
        expect(world.service.timeline()).toEqual({ runId: run.runId, rows: [], hasEarlier: false });
        await world.append(run.runId, 'tool.started', { toolName: 'edit', callId: 'c1' });
        await world.flush();
        expect(world.service.timeline()?.rows.map((row) => row.kind)).toEqual(['Tool started']);
        expect(ready(world.service.view()).detail?.activity).toBe('Running tool edit');
        await world.append(run.runId, 'file.changed', { path: 'a.md', operation: 'add', confidence: 'reported', outsideProject: false });
        await world.flush();
        expect(ready(world.service.view()).detail?.files.map((file) => file.path)).toEqual(['a.md']);
    });

    it('a status change of the shown run updates its header and drops the activity of an ended run', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        await world.append(run.runId, 'approval.requested', { requestId: 'a1', actionKind: 'edit', summary: 'Edit', outsideProject: false });
        world.service.select(run.runId);
        await world.flush();
        expect(ready(world.service.view()).detail?.activity).toBe('Waiting for approval: Edit');
        await world.world.store.reportStatus(run.runId, 'Cancelled');
        await world.flush();
        const detail = ready(world.service.view()).detail;
        expect(detail?.header.status).toBe('Cancelled');
        expect(detail?.activity).toBeUndefined();
        expect(detail?.requests).toEqual([]);
    });

    it('a burst of events coalesces: the final timeline is complete and fewer views are published than events', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        world.service.select(run.runId);
        await world.flush();
        const before = world.views.length;
        await Promise.all(Array.from({ length: 30 }, (_, index) => world.append(run.runId, 'turn.completed', { n: index })));
        await world.flush();
        expect(world.service.timeline()?.rows).toHaveLength(30);
        expect(world.views.length - before).toBeLessThan(30);
    });

    it('a page for a run that is no longer shown is dropped: selecting another run during a read shows the second run', async () => {
        const world = await createCenterWorld();
        const first = await world.addRun();
        const second = await world.addRun();
        await world.append(first.runId, 'turn.started');
        await world.append(second.runId, 'turn.completed');
        world.service.select(first.runId);
        world.service.select(second.runId);
        await world.flush();
        expect(world.service.timeline()?.runId).toBe(second.runId);
        expect(world.service.timeline()?.rows.map((row) => row.kind)).toEqual(['Turn completed']);
    });
});

describe('AC-009: paging and the window', () => {
    it('opens with the newest page only, loads earlier pages on request, and never asks for more than the page size per request', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        for (let index = 0; index < 250; index += 1) {
            await world.append(run.runId, 'turn.completed');
        }
        world.reads.length = 0;
        world.service.select(run.runId);
        await world.flush();
        expect(world.reads.every((read) => read.size <= 500)).toBe(true);
        let timeline = world.service.timeline();
        expect(timeline?.rows).toHaveLength(AGENT_CENTER_PAGE_SIZE);
        expect(timeline?.rows[0]?.key).toBe(151);
        expect(timeline?.hasEarlier).toBe(true);

        world.reads.length = 0;
        world.service.loadEarlier(run.runId);
        await world.flush();
        expect(world.reads).toEqual([{ runId: run.runId, fromSeq: 51, size: 100 }]);
        timeline = world.service.timeline();
        expect(timeline?.rows).toHaveLength(200);
        expect(timeline?.hasEarlier).toBe(true);

        world.reads.length = 0;
        world.service.loadEarlier(run.runId);
        await world.flush();
        expect(world.reads).toEqual([{ runId: run.runId, fromSeq: 1, size: 50 }]);
        timeline = world.service.timeline();
        expect(timeline?.rows).toHaveLength(250);
        expect(timeline?.rows[0]?.key).toBe(1);
        expect(timeline?.hasEarlier).toBe(false);

        world.reads.length = 0;
        world.service.loadEarlier(run.runId);
        await world.flush();
        expect(world.reads).toEqual([]);
    });

    it('a short run is loaded whole and offers no "Load earlier"', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        await world.append(run.runId, 'turn.started');
        world.service.select(run.runId);
        await world.flush();
        expect(world.service.timeline()).toMatchObject({ hasEarlier: false });
        expect(world.service.timeline()?.rows).toHaveLength(1);
    });

    it('while following, the window keeps MAX_LOADED_PAGES pages and drops the oldest; after follow is turned off it keeps everything', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        world.service.select(run.runId);
        await world.flush();
        const limit = AGENT_CENTER_PAGE_SIZE * MAX_LOADED_PAGES;
        for (let index = 0; index < limit + 80; index += 1) {
            await world.append(run.runId, 'turn.completed');
        }
        await world.flush();
        let timeline = world.service.timeline();
        expect(timeline?.rows).toHaveLength(limit);
        expect(timeline?.rows.at(-1)?.key).toBe(limit + 80);
        expect(timeline?.hasEarlier).toBe(true);

        world.service.follow(run.runId, false);
        for (let index = 0; index < 40; index += 1) {
            await world.append(run.runId, 'turn.completed');
        }
        await world.flush();
        timeline = world.service.timeline();
        expect(timeline?.rows).toHaveLength(limit + 40);
    });

    it('AC-007: the activity covers the whole run, also when the deciding event lies outside the newest page', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        await world.append(run.runId, 'approval.requested', { requestId: 'a1', actionKind: 'edit', summary: 'Edit far away', outsideProject: false });
        for (let index = 0; index < 650; index += 1) {
            await world.append(run.runId, 'turn.completed');
        }
        world.service.select(run.runId);
        await world.flush();
        expect(world.service.timeline()?.rows).toHaveLength(AGENT_CENTER_PAGE_SIZE);
        const detail = ready(world.service.view()).detail;
        expect(detail?.activity).toBe('Waiting for approval: Edit far away');
        expect(detail?.requests.map((request) => request.requestId)).toEqual(['a1']);
    });
});

describe('AC-027: states of the area', () => {
    it('the store unavailable gives its reason instead of a list; the view recovers when the store returns', async () => {
        const world = await createCenterWorld();
        await world.addRun();
        await world.flush();
        world.world.session.use(undefined, { kind: 'unavailable', reason: 'disk is full' });
        await world.flush();
        expect(world.service.view()).toEqual({ kind: 'unavailable', reason: 'disk is full' });
        world.world.session.use(world.world.store);
        await world.flush();
        expect(ready(world.service.view()).rows).toHaveLength(1);
    });

    it('the store gone without a reason gives a sentence for humans, not a code word', async () => {
        const world = await createCenterWorld();
        await world.flush();
        world.world.session.use(undefined, { kind: 'unavailable', reason: undefined });
        await world.flush();
        expect(world.service.view()).toEqual({ kind: 'unavailable', reason: 'the run history of this project is not open' });
    });

    it('zero runs gives "no-runs"; a filter without a match gives "no-match" with the filter label', async () => {
        const world = await createCenterWorld();
        await world.flush();
        expect(ready(world.service.view())).toMatchObject({ empty: 'no-runs', rows: [], detail: undefined });
        await world.addRun();
        world.navigation.send({ area: 'agentCenter', target: { kind: 'spec', stem: '0099-gone' } });
        await world.flush();
        expect(ready(world.service.view())).toMatchObject({ empty: 'no-match', rows: [], filter: { stem: '0099-gone', label: '0099-gone' } });
        world.service.clearFilter();
        await world.flush();
        expect(ready(world.service.view())).toMatchObject({ empty: undefined, filter: undefined });
        expect(ready(world.service.view()).rows).toHaveLength(1);
    });

    it('one run with unreadable history says so in its row and detail; the other runs are unaffected', async () => {
        const world = await createCenterWorld();
        const good = await world.addRun();
        const bad = await world.addRun();
        await world.append(good.runId, 'turn.started');
        const inner = world.world.store;
        const wrapped = {
            ...inner,
            async listRuns(query?: Parameters<typeof inner.listRuns>[0]) {
                const list = await inner.listRuns(query);
                return list.available ? { available: true as const, value: list.value.map((run) => (run.runId === bad.runId ? { ...run, historyUnreadable: true } : run)) } : list;
            },
            async readEvents(runId: string, fromSeq: number, size: number) {
                return runId === bad.runId ? { available: false as const, reason: 'history unreadable' } : inner.readEvents(runId, fromSeq, size);
            },
        };
        world.world.session.use(wrapped);
        world.service.select(bad.runId);
        await world.flush();
        let view = ready(world.service.view());
        expect(view.rows.find((row) => row.runId === bad.runId)?.historyUnreadable).toBe(true);
        expect(view.rows.find((row) => row.runId === good.runId)?.historyUnreadable).toBe(false);
        expect(view.detail?.unreadable).toBe(true);
        expect(world.service.timeline()).toEqual({ runId: bad.runId, rows: [], hasEarlier: false });
        world.service.select(good.runId);
        await world.flush();
        view = ready(world.service.view());
        expect(view.detail?.unreadable).toBe(false);
        expect(world.service.timeline()?.rows).toHaveLength(1);
    });
});

describe('AC-002, AC-003: navigation requests', () => {
    it('a run target selects that run, clears the filter and shows its detail; an unknown run gives the notice and no selection', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        await world.addRun();
        world.navigation.send({ area: 'agentCenter', target: { kind: 'spec', stem: '0007-board' } });
        await world.flush();
        world.navigation.send({ area: 'agentCenter', target: { kind: 'run', id: run.runId } });
        await world.flush();
        let view = ready(world.service.view());
        expect(view.filter).toBeUndefined();
        expect(view.detail?.header.runId).toBe(run.runId);
        expect(view.rows.find((row) => row.selected)?.runId).toBe(run.runId);
        world.navigation.send({ area: 'agentCenter', target: { kind: 'run', id: 'nope' } });
        await world.flush();
        view = ready(world.service.view());
        expect(view.notice).toBe('Run nope is not in the run history');
        expect(view.detail).toBeUndefined();
    });

    it('a request for another area is ignored; a target sent before any listener is applied when the first listener attaches', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        world.navigation.send({ area: 'specBoard', target: { kind: 'run', id: run.runId } });
        await world.flush();
        expect(ready(world.service.view()).detail).toBeUndefined();
        const late = world.makeService(undefined, false);
        world.navigation.send({ area: 'agentCenter', target: { kind: 'run', id: run.runId } });
        late.onDidChangeView(() => undefined);
        await late.whenIdle();
        expect(ready(late.view()).detail?.header.runId).toBe(run.runId);
    });

    it('the selected run leaving the store gives the notice', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        await world.world.store.reportStatus(run.runId, 'Completed');
        world.service.select(run.runId);
        await world.flush();
        const inner = world.world.store;
        world.world.session.use({ ...inner, async listRuns() { return { available: true as const, value: [] }; } });
        await world.flush();
        expect(ready(world.service.view()).notice).toBe(`Run ${run.runId} is not in the run history`);
    });
});

describe('BR-02, OP-13: remembered selection and filter', () => {
    it('selection and filter are written to the memory per project root and read back by a new service', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        world.navigation.send({ area: 'agentCenter', target: { kind: 'spec', stem: '0007-board' } });
        world.service.select(run.runId);
        await world.flush();
        expect(world.memory.value).toEqual({ v: 1, projects: { 'memory://project': { runId: run.runId, stem: '0007-board' } } });
        const second = world.makeService();
        await second.whenIdle();
        expect(ready(second.view()).detail?.header.runId).toBe(run.runId);
        expect(ready(second.view()).filter).toEqual({ stem: '0007-board', label: '0007' });
        world.root.current = 'memory://other';
        const third = world.makeService();
        await third.whenIdle();
        expect(ready(third.view()).detail).toBeUndefined();
        expect(ready(third.view()).filter).toBeUndefined();
    });
});

describe('OP-09: a reader window re-reads instead of following', () => {
    it('events stored by another window appear after reread, not before', async () => {
        const world = await createCenterWorld();
        const run = await world.addRun();
        world.service.select(run.runId);
        await world.flush();
        await world.world.session.use(world.world.store, { kind: 'read-only', reason: 'Another VS Code window holds the lock' });
        await world.flush();
        expect(ready(world.service.view()).controls).toEqual({ kind: 'disabled', reason: 'Another VS Code window holds the lock' });
        await world.raw.appendEvent(run.runId, { type: 'turn.started', payload: { source: 'provider' } });
        await world.flush();
        expect(world.service.timeline()?.rows).toHaveLength(0);
        world.service.reread();
        await world.flush();
        expect(world.service.timeline()?.rows).toHaveLength(1);
    });
});

describe('computes only while listened to (0006 pattern)', () => {
    it('without a listener the service reads nothing; after the last listener leaves it stops following', async () => {
        const world = await createCenterWorld();
        const bare = world.makeService(undefined, false);
        world.reads.length = 0;
        await world.addRun();
        await bare.whenIdle();
        expect(bare.view()).toBeUndefined();
        const subscription = bare.onDidChangeView(() => undefined);
        await bare.whenIdle();
        expect(bare.view()?.kind).toBe('ready');
        subscription.dispose();
        expect(bare.view()).toBeUndefined();
    });
});
