import { describe, expect, it } from 'vitest';
import { createRunSource } from './runSource';
import { generateModel } from './testing/bigModel';
import { createServiceWorld } from './testing/serviceWorld';
import { AC001_FIXTURE, modelFor } from './testing/projects';
import { makeRun } from './testing/runs';
import { createFakeSession, openMemoryStore } from './testing/runtimeWorld';
import { createMissionControlService } from './missionControlService';
import { createClock, createDiscovery, createHistory } from './testing/serviceWorld';
import { createFakeSource } from '../board/testing/boardWorld';

function current(world: ReturnType<typeof createServiceWorld>) {
    const view = world.service.view();
    if (view === undefined) {
        throw new Error('no view');
    }
    return view;
}

describe('dashboard service', () => {
    it('AC-015: the first listener makes the service compute; the view has all five sections', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        world.listen();
        await world.service.whenIdle();
        const view = current(world);
        expect(view.header).toMatchObject({ name: 'demo', version: '1.10.0' });
        expect(view.specs).toMatchObject({ kind: 'counts', total: 9 });
        expect(view.runs).toMatchObject({ available: true, running: 0 });
        expect(view.activity).toMatchObject({ available: true });
        expect(world.views).toHaveLength(1);
    });

    it('AC-015: a file change (a new model), a run change and a store state change each yield a new view without a reopen', async () => {
        const world = createServiceWorld(await modelFor([{ number: '0001', kind: 'Backlog' }]));
        world.listen();
        await world.service.whenIdle();
        world.source.set(await modelFor([{ number: '0001', kind: 'Backlog' }, { number: '0002', kind: 'Review' }]));
        await world.service.whenIdle();
        expect(current(world).specs).toMatchObject({ total: 2 });
        expect(current(world).attention.rows.map((row) => row.spec.number)).toEqual(['0002']);

        world.store.setRuns([makeRun({ id: 'r1', stem: '0001-thing', status: 'Running' })]);
        world.store.notify();
        await world.service.whenIdle();
        expect(current(world).runs).toMatchObject({ running: 1, singleRunId: 'r1' });

        world.store.setRuns(undefined);
        world.session.setState({ kind: 'unavailable', reason: 'disk is full' });
        await world.service.whenIdle();
        expect(current(world).runs).toEqual({ available: false, reason: 'no storage' });
        expect(world.views.length).toBeGreaterThanOrEqual(4);
    });

    it('AC-006: a run that is created or changes status leaves the total and every state count unchanged; a spec state change leaves Running unchanged', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        world.listen();
        await world.service.whenIdle();
        const before = current(world).specs;
        world.store.setRuns([makeRun({ id: 'r1', stem: '0004-thing', status: 'Running' })]);
        world.store.notify();
        await world.service.whenIdle();
        world.store.setRuns([makeRun({ id: 'r1', stem: '0004-thing', status: 'Failed' })]);
        world.store.notify();
        await world.service.whenIdle();
        expect(current(world).specs).toEqual(before);
        world.store.setRuns([makeRun({ id: 'r1', stem: '0004-thing', status: 'Running' })]);
        world.store.notify();
        await world.service.whenIdle();
        const running = current(world).runs;
        world.source.set(await modelFor(AC001_FIXTURE.map((item) => (item.number === '0004' ? { ...item, kind: 'Blocked' as const } : item))));
        await world.service.whenIdle();
        expect(current(world).runs).toEqual(running);
        expect(JSON.stringify(current(world).specs)).not.toEqual(JSON.stringify(before));
    });

    it('AC-018: with the store unavailable the runs and the activity are "not available" with the reason, the spec figures and reasons (a), (d), (e) stay', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        world.store.setState({ kind: 'unavailable', reason: 'disk is full' });
        world.history.view = { available: false, text: 'Status history not available: disk is full' };
        world.listen();
        await world.service.whenIdle();
        const view = current(world);
        expect(view.runs).toEqual({ available: false, reason: 'disk is full' });
        expect(view.activity).toEqual({ available: false, reason: 'disk is full' });
        expect(view.specs).toMatchObject({ kind: 'counts', total: 9 });
        expect(view.attention.runReasons).toEqual({ available: false, reason: 'disk is full' });
        expect(view.attention.rows.map((row) => row.spec.number)).toEqual(['0005', '0009']);
    });

    it('AC-011: events appended through the real store change nothing and cause no new view; a created run does', async () => {
        const { store } = await openMemoryStore();
        const world = createServiceWorld(await modelFor([{ number: '0001', kind: 'Active' }]));
        world.session.use(store);
        world.listen();
        await world.service.whenIdle();
        const run = await store.createRun({ providerId: 'fake', spec: { stem: '0001-thing', path: '.specs/active/0001-thing.md' } });
        await world.service.whenIdle();
        const count = world.views.length;
        expect(current(world).runs).toMatchObject({ running: 1 });
        await store.appendEvent(run.runId, { type: 'tool', payload: { name: 'x' } });
        await store.appendEvent(run.runId, { type: 'message', payload: { text: 'y' } });
        await world.service.whenIdle();
        expect(world.views).toHaveLength(count);
        await store.reportStatus(run.runId, 'Completed');
        await world.service.whenIdle();
        expect(world.views.length).toBeGreaterThan(count);
        expect(current(world).runs).toMatchObject({ running: 0 });
    });

    it('A-011: with no listener the service reads nothing and subscribes to nothing; the last listener leaving stops it again', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        await world.service.whenIdle();
        expect(world.store.listCalls()).toBe(0);
        expect(world.history.reads).toBe(0);
        world.store.notify();
        world.source.set(await modelFor(AC001_FIXTURE));
        await world.service.whenIdle();
        expect(world.store.listCalls()).toBe(0);
        const listening = world.listen();
        await world.service.whenIdle();
        const reads = world.store.listCalls();
        expect(reads).toBeGreaterThan(0);
        listening.dispose();
        world.store.notify();
        world.history.fire();
        await world.service.whenIdle();
        expect(world.store.listCalls()).toBe(reads);
    });

    it('a burst of notifications is coalesced: the sources are read at most once more after the running read', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        world.listen();
        await world.service.whenIdle();
        const before = world.store.listCalls();
        for (let index = 0; index < 20; index += 1) {
            world.store.notify();
        }
        await world.service.whenIdle();
        expect(world.store.listCalls() - before).toBeLessThanOrEqual(2);
    });

    it('AC-017: a model read at 10:00 shows 10:00 in a panel opened at 11:00, and reopening keeps it', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        world.source.stamp('2026-11-16T10:00:00.000Z');
        world.clock.set('2026-11-16T11:00:00.000Z');
        const first = world.listen();
        await world.service.whenIdle();
        expect(current(world).header.updatedAt).toBe('2026-11-16T10:00:00.000Z');
        first.dispose();
        world.clock.set('2026-11-16T13:00:00.000Z');
        world.listen();
        await world.service.whenIdle();
        expect(current(world).header.updatedAt).toBe('2026-11-16T10:00:00.000Z');
    });

    it('AC-017 (A-013): a spec read while open moves the time to the read; a processed run change moves it to the clock time of that change', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        world.listen();
        await world.service.whenIdle();
        expect(current(world).header.updatedAt).toBe('2026-11-16T10:00:00.000Z');
        world.source.set(await modelFor(AC001_FIXTURE), '2026-11-16T10:30:00.000Z');
        await world.service.whenIdle();
        expect(current(world).header.updatedAt).toBe('2026-11-16T10:30:00.000Z');
        world.clock.set('2026-11-16T11:00:00.000Z');
        world.store.setRuns([makeRun({ id: 'r1', stem: '0001-thing', status: 'Running' })]);
        world.store.notify();
        await world.service.whenIdle();
        expect(current(world).header.updatedAt).toBe('2026-11-16T11:00:00.000Z');
    });

    it('AC-017 (negative control): a change the dashboard did not process leaves the time alone', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        world.listen();
        await world.service.whenIdle();
        world.clock.set('2026-11-16T12:00:00.000Z');
        world.history.fire();
        await world.service.whenIdle();
        expect(current(world).header.updatedAt).toBe('2026-11-16T10:00:00.000Z');
    });

    it('without a model or an active project there is no view; the project coming back gives one', async () => {
        const world = createServiceWorld(undefined);
        world.listen();
        await world.service.whenIdle();
        expect(world.service.view()).toBeUndefined();
        world.source.set(await modelFor(AC001_FIXTURE));
        await world.service.whenIdle();
        expect(world.service.view()).toBeDefined();
        world.discovery.setActive(undefined);
        world.discovery.update();
        await world.service.whenIdle();
        expect(world.service.view()).toBeUndefined();
    });

    it('AC-023: the service needs only read members of its sources (these fakes have no write method at all)', async () => {
        const source = createFakeSource(await modelFor(AC001_FIXTURE));
        const service = createMissionControlService({
            source,
            discovery: createDiscovery().port,
            session: createFakeSession(),
            history: createHistory().port,
            clock: createClock(),
        });
        service.onDidChangeView(() => undefined);
        await service.whenIdle();
        expect(service.view()?.runs).toMatchObject({ available: false });
        service.dispose();
    });

    it('AC-024: a project of 200 specs, 5 runs per spec and 1,000 history entries is projected in under 1000 ms', async () => {
        const big = await generateModel(200, 5, 1000);
        const world = createServiceWorld(big.model);
        world.store.setRuns(big.runs);
        world.history.view = big.history;
        const started = performance.now();
        world.listen();
        await world.service.whenIdle();
        const elapsed = performance.now() - started;
        expect(world.service.view()?.specs).toMatchObject({ total: 200 });
        expect(world.service.view()?.runs).toMatchObject({ available: true });
        expect(elapsed).toBeLessThan(1000);
    });

    it('createRunSource is the only way the service reaches runs: a session with a real store feeds it (integration of T-001)', async () => {
        const { store } = await openMemoryStore();
        const source = createRunSource({ session: createFakeSession(store) });
        expect(await source.read()).toEqual({ available: true, runs: [] });
    });
});
