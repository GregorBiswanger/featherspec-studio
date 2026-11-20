import { describe, expect, it } from 'vitest';
import { createFakeSource } from '../board/testing/boardWorld';
import { parseStepTipSettings } from '../settings/stepTipSettings';
import { createFakeOffer } from '../assistant/testing/fakeOffer';
import { createFakeTips } from '../settings/testing/fakeTips';
import { createOverviewService } from './overviewService';
import { AC001_FIXTURE, modelFor } from './testing/projects';
import { createDiscovery, createHistory, createServiceWorld } from './testing/serviceWorld';

function current(world: ReturnType<typeof createServiceWorld>) {
    const view = world.service.view();
    if (view === undefined) {
        throw new Error('no view');
    }
    return view;
}

describe('dashboard service', () => {
    it('AC-015: the first listener makes the service compute; the view has the five parts and no run figure', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        world.listen();
        await world.service.whenIdle();
        const view = current(world);
        expect(view.figures).toMatchObject({ kind: 'counts', total: 9 });
        expect(view.activity).toMatchObject({ available: true });
        expect(Object.keys(view).sort()).toEqual(['activity', 'figures', 'now', 'problems', 'upNext']);
        expect(world.views).toHaveLength(1);
    });

    it('AC-015: a file change (a new model) and a history change each yield a new view without a reopen', async () => {
        const world = createServiceWorld(await modelFor([{ number: '0001', kind: 'Backlog' }]));
        world.listen();
        await world.service.whenIdle();
        world.source.set(await modelFor([{ number: '0001', kind: 'Backlog' }, { number: '0002', kind: 'Review' }]));
        await world.service.whenIdle();
        expect(current(world).figures).toMatchObject({ total: 2 });
        expect(current(world).now.rows.map((row) => row.spec.number)).toEqual(['0002']);
        const count = world.views.length;
        world.history.view = {
            available: true,
            label: 'Observed',
            entries: [{ observedAt: '2026-11-16T09:00:00.000Z', stem: '0001-thing', old: 'Backlog', new: 'Ready', rule: null, cause: { kind: 'files', paths: [] }, flow: 'not checked' }],
        };
        world.history.fire();
        await world.service.whenIdle();
        expect(world.views.length).toBeGreaterThan(count);
        expect(current(world).activity).toMatchObject({ available: true, entries: [{ change: { kind: 'state', old: 'Backlog', new: 'Ready' } }] });
    });

    it('0015 AC-018 (0006): with the history not available Activity says so with the reason; the figures and Now stay', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        world.history.view = { available: false, text: 'Status history not available: Another VS Code window holds the write lock for this project\'s status history.' };
        world.listen();
        await world.service.whenIdle();
        const view = current(world);
        expect(view.activity).toEqual({ available: false, reason: 'Another VS Code window holds the write lock for this project\'s status history.' });
        expect(view.figures).toMatchObject({ kind: 'counts', total: 9 });
        expect(view.now.rows.map((row) => row.spec.number)).toEqual(['0009', '0005', '0004']);
    });

    it('A-011: with no listener the service reads nothing; the last listener leaving stops it again', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        await world.service.whenIdle();
        expect(world.history.reads).toBe(0);
        world.source.set(await modelFor(AC001_FIXTURE));
        await world.service.whenIdle();
        expect(world.history.reads).toBe(0);
        const listening = world.listen();
        await world.service.whenIdle();
        const reads = world.history.reads;
        expect(reads).toBeGreaterThan(0);
        listening.dispose();
        world.history.fire();
        await world.service.whenIdle();
        expect(world.history.reads).toBe(reads);
    });

    it('a burst of notifications is coalesced: the history is read at most twice more after the running read', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        world.listen();
        await world.service.whenIdle();
        const before = world.history.reads;
        for (let index = 0; index < 20; index += 1) {
            world.history.fire();
        }
        await world.service.whenIdle();
        expect(world.history.reads - before).toBeLessThanOrEqual(2);
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
        const service = createOverviewService({ source, discovery: createDiscovery().port, history: createHistory().port, tips: createFakeTips(), assistant: createFakeOffer() });
        service.onDidChangeView(() => undefined);
        await service.whenIdle();
        expect(service.view()?.activity).toMatchObject({ available: true });
        service.dispose();
    });
});

describe('0018 AC-010: the open state of Activity lives in the host', () => {
    function opened(world: ReturnType<typeof createServiceWorld>): boolean | undefined {
        const activity = world.service.view()?.activity;
        return activity?.available ? activity.open : undefined;
    }

    it('Activity is collapsed at the first listener', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        world.listen();
        await world.service.whenIdle();
        expect(opened(world)).toBe(false);
    });

    it('the request opens it, the view says so, and a new view while listened keeps it open', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        world.listen();
        await world.service.whenIdle();
        await world.service.handlers.overviewSetActivity({ open: true });
        await world.service.whenIdle();
        expect(opened(world)).toBe(true);
        world.source.set(await modelFor([...AC001_FIXTURE, { number: '0010', kind: 'Backlog' }]));
        await world.service.whenIdle();
        expect(opened(world)).toBe(true);
        world.history.fire();
        await world.service.whenIdle();
        expect(opened(world)).toBe(true);
        await world.service.handlers.overviewSetActivity({ open: false });
        await world.service.whenIdle();
        expect(opened(world)).toBe(false);
    });

    it('a re-push for a hidden and shown panel (the view read again) carries the same state', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        world.listen();
        await world.service.whenIdle();
        world.service.setActivityOpen(true);
        await world.service.whenIdle();
        expect(world.service.view()).toEqual(world.service.view());
        expect(opened(world)).toBe(true);
    });

    it('after the last listener left and a new one came (panel closed and reopened) it is collapsed again', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        const first = world.listen();
        await world.service.whenIdle();
        world.service.setActivityOpen(true);
        await world.service.whenIdle();
        expect(opened(world)).toBe(true);
        first.dispose();
        world.listen();
        await world.service.whenIdle();
        expect(opened(world)).toBe(false);
    });

    it('with a second listener still there, one leaving keeps the state (negative control)', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        const first = world.listen();
        world.listen();
        await world.service.whenIdle();
        world.service.setActivityOpen(true);
        await world.service.whenIdle();
        first.dispose();
        world.history.fire();
        await world.service.whenIdle();
        expect(opened(world)).toBe(true);
    });

    it('while the history is not available the view carries no open flag', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        world.history.view = { available: false, text: 'Status history not available: locked' };
        world.listen();
        await world.service.whenIdle();
        world.service.setActivityOpen(true);
        await world.service.whenIdle();
        expect(world.service.view()?.activity).toEqual({ available: false, reason: 'locked' });
    });
});

describe('0021 AC-011, AC-010: a settings change reaches the Overview', () => {
    it('turning the tips on adds the coach line to the first Now row, a hint changes it, turning them off removes it, Activity stays open', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        world.listen();
        await world.service.whenIdle();
        await world.service.handlers.overviewSetActivity({ open: true });
        await world.service.whenIdle();
        expect(current(world).now.rows.some((row) => 'tips' in row)).toBe(false);
        world.tips.set(parseStepTipSettings(true, {}));
        await world.service.whenIdle();
        expect(current(world).now.rows[0]?.tips?.coach).toMatch(/^Tip: Use .* with a (?:strong|fast) model/);
        expect(current(world).now.rows.filter((row) => 'tips' in row)).toHaveLength(1);
        const before = current(world).now.rows[0]?.tips?.coach;
        world.tips.set(parseStepTipSettings(true, { strong: 'X', fast: 'Y' }));
        await world.service.whenIdle();
        expect(current(world).now.rows[0]?.tips?.coach).not.toBe(before);
        expect(current(world).now.rows[0]?.tips?.coach).toMatch(/ model \((?:X|Y)\)/);
        world.tips.set(parseStepTipSettings(false, {}));
        await world.service.whenIdle();
        expect(current(world).now.rows.some((row) => 'tips' in row)).toBe(false);
        const activity = current(world).activity;
        expect(activity.available && activity.open).toBe(true);
    });

    it('a service nobody listens to computes nothing for a settings change', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        world.tips.set(parseStepTipSettings(true, {}));
        await world.service.whenIdle();
        expect(world.service.view()).toBeUndefined();
        expect(world.views).toHaveLength(0);
    });
});

describe('0024 AC-010: an offer change reaches the Overview', () => {
    it('the first Now row gains, changes and loses its send view; Activity stays open; nobody listening computes nothing', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        world.listen();
        await world.service.whenIdle();
        await world.service.handlers.overviewSetActivity({ open: true });
        await world.service.whenIdle();
        expect(current(world).now.rows.some((row) => 'send' in row)).toBe(false);
        world.assistant.set({ assistant: 'copilot' });
        await world.service.whenIdle();
        expect(current(world).now.rows[0]?.send).toMatchObject({ assistant: 'copilot' });
        expect(current(world).now.rows.filter((row) => 'send' in row)).toHaveLength(1);
        world.assistant.set({ assistant: 'claudeCode' });
        await world.service.whenIdle();
        expect(current(world).now.rows[0]?.send).toEqual({ assistant: 'claudeCode', attach: { name: '0009-thing.md', path: '.specs/active/0009-thing.md' }, target: 'new', targets: ['new'] });
        world.assistant.uninstall('claudeCode');
        await world.service.whenIdle();
        expect(current(world).now.rows.some((row) => 'send' in row)).toBe(false);
        const activity = current(world).activity;
        expect(activity.available && activity.open).toBe(true);
    });

    it('a service nobody listens to computes nothing for an offer change', async () => {
        const world = createServiceWorld(await modelFor(AC001_FIXTURE));
        world.assistant.set({ assistant: 'copilot' });
        await world.service.whenIdle();
        expect(world.service.view()).toBeUndefined();
        expect(world.views).toHaveLength(0);
    });
});

