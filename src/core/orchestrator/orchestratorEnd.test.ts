import { describe, expect, it } from 'vitest';
import { createControlledAdapter } from '../providers/testing/controlledAdapter';
import { declarationWith } from '../providers/testing/adapters';
import { NOT_AVAILABLE, type JsonValue } from '../runtime/model';
import { readRunResult } from './result';
import { START_TIMEOUT_MS, STOP_TIMEOUT_MS } from './texts';
import { createWorld, type World } from './testing/world';

async function started(world: World, overrides = {}): Promise<string> {
    const result = await world.orchestrator.start(world.request(overrides));
    if (result.kind !== 'started') {
        throw new Error(`start refused: ${result.reason}`);
    }
    return result.runId;
}

const emit = (world: World, runId: string, kind: string, payload: JsonValue = {}, source: 'provider' | 'derived' = 'provider') =>
    world.controlled.sink(runId).emit({ kind, source, payload });

const controlled = (world: World, overrides = {}) => started(world, { providerId: 'controlled', ...overrides });

describe('result', () => {
    it('AC-018: a provider without usage data, completing with "Done", gives Completed, "Done", a duration and usage "not available"', async () => {
        const world = await createWorld();
        const runId = await controlled(world);
        emit(world, runId, 'session.started', { sessionRef: 's' });
        await world.advance(5_000);
        emit(world, runId, 'run.completed', { finalMessage: 'Done' });
        await world.orchestrator.whenIdle();
        const run = await world.runOf(runId);
        expect(run.status).toBe('Completed');
        expect(readRunResult(run)).toEqual({ finalMessage: 'Done', usage: NOT_AVAILABLE, changedFiles: NOT_AVAILABLE, durationMs: 5_000 });
    });

    it('AC-018: usage and changed files that events delivered are part of the result', async () => {
        const world = await createWorld();
        const runId = await started(world);
        await world.advance(1_000);
        const result = readRunResult(await world.runOf(runId));
        expect(result.finalMessage).toBe('Done (fake).');
        expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 48 });
        expect(result.changedFiles).toEqual([{ path: 'README.md', operation: 'update' }]);
    });

    it('AC-018: without run.completed text the last message.completed is the final message', async () => {
        const world = await createWorld();
        const runId = await controlled(world);
        emit(world, runId, 'session.started');
        emit(world, runId, 'message.completed', { text: 'Last words' });
        emit(world, runId, 'run.completed', {});
        await world.orchestrator.whenIdle();
        expect(readRunResult(await world.runOf(runId)).finalMessage).toBe('Last words');
    });

    it('AC-018: a failed run carries error class and text in its fields and "not available" for the rest', async () => {
        const world = await createWorld();
        const runId = await controlled(world);
        emit(world, runId, 'session.started');
        emit(world, runId, 'run.failed', { category: 'auth', text: 'The provider rejected the sign-in.' });
        await world.orchestrator.whenIdle();
        const run = await world.runOf(runId);
        expect(run).toMatchObject({ status: 'Failed', errorClass: 'auth', errorMessage: 'The provider rejected the sign-in.' });
        expect(readRunResult(run)).toMatchObject({ finalMessage: NOT_AVAILABLE, usage: NOT_AVAILABLE, changedFiles: NOT_AVAILABLE });
    });

    it('AC-018: readRunResult of a run without a stored result answers "not available" everywhere', async () => {
        const world = await createWorld();
        const runId = await controlled(world);
        expect(readRunResult(await world.runOf(runId))).toEqual({
            finalMessage: NOT_AVAILABLE,
            usage: NOT_AVAILABLE,
            changedFiles: NOT_AVAILABLE,
            durationMs: NOT_AVAILABLE,
        });
    });
});

describe('start timeout', () => {
    it('AC-008, AC-010: the start timeout is 60 s and the stop timeout 30 s', () => {
        expect(START_TIMEOUT_MS).toBe(60_000);
        expect(STOP_TIMEOUT_MS).toBe(30_000);
    });

    it('AC-008: 60 s minus 1 ms leaves Starting; at 60 s it is Failed/start_timeout, cancel once, then endSession once', async () => {
        const world = await createWorld();
        const runId = await controlled(world);
        await world.advance(START_TIMEOUT_MS - 1);
        expect((await world.runOf(runId)).status).toBe('Starting');
        expect(world.controlled.calls).toEqual([`start:${runId}`]);
        await world.advance(1);
        const run = await world.runOf(runId);
        expect(run).toMatchObject({ status: 'Failed', errorClass: 'start_timeout' });
        expect(world.controlled.calls).toEqual([`start:${runId}`, `cancel:${runId}`, `endSession:${runId}`]);
        expect(readRunResult(run).finalMessage).toBe(NOT_AVAILABLE);
    });

    it('AC-008: a provider that does not declare cancel gets only endSession', async () => {
        const world = await createWorld();
        const quiet = createControlledAdapter('quiet', { capabilities: declarationWith({ cancel: 'none' }) });
        world.setup.registry.register(quiet.adapter);
        const runId = await started(world, { providerId: 'quiet' });
        await world.advance(START_TIMEOUT_MS);
        expect(quiet.calls).toEqual([`start:${runId}`, `endSession:${runId}`]);
        expect((await world.runOf(runId)).errorClass).toBe('start_timeout');
    });

    it('AC-008: the timer is dropped once Starting is left, and an event after the timeout changes nothing', async () => {
        const world = await createWorld();
        const runId = await controlled(world);
        await world.advance(10_000);
        emit(world, runId, 'session.started');
        await world.advance(START_TIMEOUT_MS);
        expect((await world.runOf(runId)).status).toBe('Running');
        expect(world.controlled.calls).toEqual([`start:${runId}`]);
    });

    it('AC-005: after the start timeout no event and no timer appends a status', async () => {
        const world = await createWorld();
        const runId = await controlled(world);
        await world.advance(START_TIMEOUT_MS);
        emit(world, runId, 'session.started');
        emit(world, runId, 'run.cancelled', {});
        await world.advance(86_400_000);
        expect(await world.statusesOf(runId)).toEqual(['Starting', 'Failed']);
    });
});

describe('no stall', () => {
    it('AC-014: after 24 h of clock time without events the status is unchanged', async () => {
        const world = await createWorld({
            script: [
                { type: 'emit', event: { kind: 'session.started', payload: { sessionRef: 's' } } },
                { type: 'wait', ms: 172_800_000 },
            ],
        });
        await world.orchestrator.whenIdle();
        const baseline = world.clock.pendingTimers();
        const runId = await started(world);
        await world.advance(1);
        expect((await world.runOf(runId)).status).toBe('Running');
        await world.advance(86_400_000);
        expect(await world.statusesOf(runId)).toEqual(['Starting', 'Running']);
        expect(world.clock.pendingTimers() - baseline).toBeLessThanOrEqual(1);
    });
});

describe('window end', () => {
    it('AC-024: losing the write lock with a run open calls cancel once, then endSession once, and appends nothing more', async () => {
        const world = await createWorld();
        const runId = await controlled(world);
        emit(world, runId, 'session.started');
        await world.orchestrator.whenIdle();
        world.session.use(await world.openStoreOn());
        expect(world.controlled.calls).toEqual([`start:${runId}`, `cancel:${runId}`, `endSession:${runId}`]);
        emit(world, runId, 'run.failed', { category: 'auth', text: 't' });
        await world.advance(START_TIMEOUT_MS * 2);
        expect(await world.statusesOf(runId)).toEqual(['Starting', 'Running']);
        expect(await world.eventKinds(runId)).toEqual(['session.started']);
    });

    it('AC-024: a closed store and a switch to another store do the same; a writable state change that keeps the store does nothing', async () => {
        for (const change of ['closed', 'switched'] as const) {
            const world = await createWorld();
            const runId = await controlled(world);
            emit(world, runId, 'session.started');
            await world.orchestrator.whenIdle();
            world.session.use(world.store);
            expect(world.controlled.calls, 'same store').toEqual([`start:${runId}`]);
            world.session.use(change === 'closed' ? undefined : await world.openStoreOn({ files: new Map() }));
            expect(world.controlled.calls, change).toEqual([`start:${runId}`, `cancel:${runId}`, `endSession:${runId}`]);
        }
    });

    it('AC-024: a provider without cancel gets only endSession; an ended run is not touched', async () => {
        const world = await createWorld();
        const quiet = createControlledAdapter('quiet', { capabilities: declarationWith({ cancel: 'none' }) });
        world.setup.registry.register(quiet.adapter);
        const runId = await started(world, { providerId: 'quiet' });
        quiet.sink(runId).emit({ kind: 'session.started', source: 'provider', payload: {} });
        await world.orchestrator.whenIdle();
        world.session.use(undefined);
        expect(quiet.calls).toEqual([`start:${runId}`, `endSession:${runId}`]);
        const other = await createWorld();
        const endedRun = await controlled(other);
        emit(other, endedRun, 'run.failed', { category: 'auth', text: 't' });
        await other.orchestrator.whenIdle();
        other.session.use(undefined);
        expect(other.controlled.calls).toEqual([`start:${endedRun}`]);
    });

    it('AC-024: dispose with an open run makes the same two calls at once, without waiting', async () => {
        const world = await createWorld();
        const runId = await controlled(world);
        world.orchestrator.dispose();
        expect(world.controlled.calls).toEqual([`start:${runId}`, `cancel:${runId}`, `endSession:${runId}`]);
        await world.advance(START_TIMEOUT_MS * 2);
        expect(world.controlled.calls).toHaveLength(3);
        expect((await world.runOf(runId)).status).toBe('Starting');
    });
});

describe('previous run', () => {
    it('AC-021: a stem without a run answers none', async () => {
        const world = await createWorld();
        expect(await world.orchestrator.previousRun('0007-board')).toEqual({ kind: 'none' });
    });

    it('AC-021: the latest run of the stem with its ID, status, error class and error text', async () => {
        const world = await createWorld();
        const first = await controlled(world);
        emit(world, first, 'session.started');
        emit(world, first, 'run.completed', { finalMessage: 'x' });
        await world.orchestrator.whenIdle();
        expect(await world.orchestrator.previousRun('0007-board')).toEqual({
            kind: 'run',
            runId: first,
            status: 'Completed',
            errorClass: NOT_AVAILABLE,
            errorText: NOT_AVAILABLE,
        });
        await world.advance(1_000);
        const second = await controlled(world);
        emit(world, second, 'run.failed', { category: 'auth', text: 'The provider rejected the sign-in.' });
        await world.orchestrator.whenIdle();
        expect(await world.orchestrator.previousRun('0007-board')).toEqual({
            kind: 'run',
            runId: second,
            status: 'Failed',
            errorClass: 'auth',
            errorText: 'The provider rejected the sign-in.',
        });
        expect(await world.orchestrator.previousRun('0099-other')).toEqual({ kind: 'none' });
    });

    it('AC-021: with no store the answer is "not available" with the reason', async () => {
        const world = await createWorld();
        world.session.use(undefined);
        expect(await world.orchestrator.previousRun('0007-board')).toMatchObject({ kind: 'not-available' });
    });
});
