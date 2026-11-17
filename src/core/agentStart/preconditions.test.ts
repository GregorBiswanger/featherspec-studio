import { describe, expect, it } from 'vitest';
import { OPEN_STATUSES } from '../runtime/model';
import { settle } from '../runtime/testing/fakes';
import { checkPreconditions, REQUIRED_FILES, type PreconditionFailure } from './preconditions';
import { START_STEM, createStartWorld, type StartWorld } from './testing/startWorld';

async function failures(world: StartWorld, stem = START_STEM): Promise<PreconditionFailure[]> {
    return (await checkPreconditions(world.deps, stem)).failures;
}

describe('run-start preconditions (AC-001, AC-007, AC-008, AC-013)', () => {
    it('passes all eight on the Ready fixture with the fake provider', async () => {
        const world = await createStartWorld();
        const result = await checkPreconditions(world.deps, START_STEM);
        expect(result.failures).toEqual([]);
        expect(result.entry?.stem).toBe(START_STEM);
        expect(result.entry?.state).toBe('Ready');
        expect(result.provider?.entry.id).toBe('fake');
    });

    it('P-1 transition: names the refusal kind and its rule IDs (a Backlog spec is not Ready)', async () => {
        const world = await createStartWorld();
        await world.setSpecs([{ folder: 'backlog', stem: '0003-plain' }]);
        const found = await failures(world, '0003-plain');
        const failure = found.find((candidate) => candidate.id === 'P-1');
        expect(failure).toMatchObject({ id: 'P-1', kind: 'transition', refusal: { kind: 'not-ready' } });
        if (failure?.id === 'P-1' && failure.kind === 'transition' && failure.refusal.kind === 'not-ready') {
            expect(failure.refusal.failing.length).toBeGreaterThan(0);
        }
    });

    it('P-1 transition: an Active spec is refused as a lifecycle move', async () => {
        const world = await createStartWorld();
        await world.setSpecs([{ folder: 'active', stem: '0003-plain' }]);
        expect((await failures(world, '0003-plain')).find((candidate) => candidate.id === 'P-1')).toMatchObject({ kind: 'transition', refusal: { kind: 'lifecycle-move' } });
    });

    it('P-1 no-entry: no spec carries the stem', async () => {
        const world = await createStartWorld();
        expect(await failures(world, '0099-missing')).toContainEqual({ id: 'P-1', kind: 'no-entry' });
    });

    it('P-1 no-entry: no model at all', async () => {
        const world = await createStartWorld();
        world.model.current = undefined;
        expect(await failures(world)).toContainEqual({ id: 'P-1', kind: 'no-entry' });
    });

    it('P-1 several: two entries carry the stem (PD-019)', async () => {
        const world = await createStartWorld();
        await world.setSpecs([
            { folder: 'backlog', stem: '0003-twin' },
            { folder: 'active', stem: '0003-twin' },
        ]);
        const failure = (await failures(world, '0003-twin')).find((candidate) => candidate.id === 'P-1');
        expect(failure).toMatchObject({ kind: 'several' });
        if (failure?.id === 'P-1' && failure.kind === 'several') {
            expect([...failure.keys].sort()).toEqual(['.specs/active/0003-twin.md', '.specs/backlog/0003-twin.md']);
        }
    });

    it('P-2 (AC-007): each of the three files missing alone is named by its project-relative path', async () => {
        for (const path of REQUIRED_FILES) {
            const world = await createStartWorld();
            world.files.hide(path);
            expect(await failures(world)).toEqual([{ id: 'P-2', missing: [path] }]);
        }
    });

    it('P-2: all three missing are named together', async () => {
        const world = await createStartWorld();
        REQUIRED_FILES.forEach((path) => world.files.hide(path));
        expect(await failures(world)).toEqual([{ id: 'P-2', missing: [...REQUIRED_FILES] }]);
    });

    it('P-3: an empty setting, a non-string and an unregistered ID fail with the configured value', async () => {
        const world = await createStartWorld();
        world.setting.set('');
        expect(await failures(world)).toEqual([{ id: 'P-3', configured: undefined }]);
        world.setting.set(42);
        expect(await failures(world)).toEqual([{ id: 'P-3', configured: undefined }]);
        world.setting.set('copilot');
        expect(await failures(world)).toEqual([{ id: 'P-3', configured: 'copilot' }]);
    });

    it('P-3 skips P-4: the availability check is not asked when no provider is registered', async () => {
        const world = await createStartWorld();
        world.setting.set('copilot');
        await failures(world);
        expect(world.fakeCalls()).not.toContain('checkAvailability');
    });

    it('P-4: any result but available fails with the result and the reason unchanged, unknown included', async () => {
        for (const result of ['not-installed', 'not-signed-in', 'blocked-by-policy', 'unknown'] as const) {
            const world = await createStartWorld();
            world.controlled.adapter.checkAvailability = () => Promise.resolve({ result, hint: 'try this' });
            world.setting.set('controlled');
            const found = await failures(world);
            expect(found).toHaveLength(1);
            expect(found[0]).toMatchObject({ id: 'P-4', result, hint: 'try this' });
            expect(found[0]).toHaveProperty('reason');
        }
    });

    it('P-4: no answer within the service timeout becomes unknown', async () => {
        const world = await createStartWorld();
        world.controlled.adapter.checkAvailability = () => new Promise(() => undefined);
        world.setting.set('controlled');
        const pending = checkPreconditions(world.deps, START_STEM);
        await settle();
        await world.advance(15_000);
        expect((await pending).failures).toMatchObject([{ id: 'P-4', result: 'unknown' }]);
    });

    it('P-5: an open run is named by run ID and stem, for every open status', async () => {
        for (const status of OPEN_STATUSES) {
            const world = await createStartWorld();
            const created = await world.store.createRun({ providerId: 'fake', spec: { stem: '0002-old-feature', path: '.specs/active/0002-old-feature.md' } });
            if (status !== 'Starting') {
                await world.store.reportStatus(created.runId, 'Running');
            }
            if (status === 'WaitingForApproval' || status === 'WaitingForInput') {
                await world.store.reportStatus(created.runId, status);
            }
            expect(await failures(world)).toEqual([{ id: 'P-5', runId: created.runId, stem: '0002-old-feature' }]);
        }
    });

    it('P-5: an ended run does not fail', async () => {
        const world = await createStartWorld();
        const created = await world.store.createRun({ providerId: 'fake', spec: { stem: '0002-old-feature', path: '.specs/active/0002-old-feature.md' } });
        await world.store.reportStatus(created.runId, 'Running');
        await world.store.reportStatus(created.runId, 'Completed');
        expect(await failures(world)).toEqual([]);
    });

    it('P-5 is skipped when the runs cannot be read, P-6 names the state and reason (AC-013)', async () => {
        for (const state of [
            { kind: 'read-only', reason: 'Another window writes.' },
            { kind: 'unavailable', reason: 'No storage.' },
        ] as const) {
            const world = await createStartWorld();
            world.session.use(world.store, state);
            const found = await failures(world);
            expect(found).toContainEqual({ id: 'P-6', state: state.kind, reason: state.reason });
            expect(found.some((candidate) => candidate.id === 'P-5')).toBe(false);
        }
    });

    it('P-5 is skipped when the store is unavailable even with an open run in it', async () => {
        const world = await createStartWorld();
        await world.store.createRun({ providerId: 'fake', spec: { stem: '0002-old-feature', path: '.specs/active/0002-old-feature.md' } });
        world.session.use(undefined, { kind: 'unavailable', reason: 'No storage.' });
        const found = await failures(world);
        expect(found.map((candidate) => candidate.id)).toEqual(['P-6']);
    });

    it('P-7: Restricted Mode fails', async () => {
        const world = await createStartWorld();
        world.trust.trusted = false;
        expect(await failures(world)).toEqual([{ id: 'P-7' }]);
    });

    it('P-8: stems outside NNNN-slug fail with the stem', async () => {
        for (const stem of ['001-short', '0001', '0001-Upper', '0001-snake_case', '0001--double', '0001-', 'x0001-a', '0001-ä']) {
            const world = await createStartWorld();
            expect(await failures(world, stem), stem).toContainEqual({ id: 'P-8', stem });
        }
        const world = await createStartWorld();
        expect((await failures(world)).some((candidate) => candidate.id === 'P-8')).toBe(false);
    });

    it('several fail at once, in ID order (AC-001 example: P-1 refused and P-5 for r-7)', async () => {
        const world = await createStartWorld();
        await world.setSpecs([{ folder: 'backlog', stem: '0003-plain' }]);
        const created = await world.store.createRun({ providerId: 'fake', spec: { stem: '0002-old-feature', path: '.specs/active/0002-old-feature.md' } });
        world.trust.trusted = false;
        const found = await failures(world, '0003-plain');
        expect(found.map((candidate) => candidate.id)).toEqual(['P-1', 'P-5', 'P-7']);
        expect(found[1]).toEqual({ id: 'P-5', runId: created.runId, stem: '0002-old-feature' });
    });

    it('holds each failure alone: the fixture world shows no failure besides the one provoked', async () => {
        const world = await createStartWorld();
        expect(await failures(world)).toEqual([]);
    });
});
