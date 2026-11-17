import { describe, expect, it } from 'vitest';
import type { ApprovalAnswer } from '../ports/agentProvider';
import { createControlledAdapter } from '../providers/testing/controlledAdapter';
import { declarationWith } from '../providers/testing/adapters';
import type { JsonValue } from '../runtime/model';
import { READER_TEXT, STOP_NOT_CONFIRMED_CAUSE, STOP_TIMEOUT_MS, alreadyEndedText, noStopText, requestNotOpenText, stopPendingText } from './texts';
import { createWorld, type World } from './testing/world';

async function started(world: World, overrides = {}): Promise<string> {
    const result = await world.orchestrator.start(world.request(overrides));
    if (result.kind !== 'started') {
        throw new Error(`start refused: ${result.reason}`);
    }
    return result.runId;
}

const emit = (world: World, runId: string, kind: string, payload: JsonValue = {}) => world.controlled.sink(runId).emit({ kind, source: 'provider', payload });

async function running(world: World): Promise<string> {
    const runId = await started(world, { providerId: 'controlled' });
    emit(world, runId, 'session.started', { sessionRef: 's' });
    await world.orchestrator.whenIdle();
    return runId;
}

const IGNORING_CANCEL = [
    { type: 'emit', event: { kind: 'session.started', payload: { sessionRef: 's' } } },
    { type: 'ignoreCancel' },
    { type: 'wait', ms: 172_800_000 },
] as const;

describe('stop', () => {
    it('AC-009: calls the provider cancel exactly once, asks nothing and leaves the status until an end kind arrives', async () => {
        const world = await createWorld();
        const runId = await running(world);
        expect(await world.orchestrator.stop(runId)).toEqual({ kind: 'stopping' });
        expect(world.controlled.calls).toEqual([`start:${runId}`, `cancel:${runId}`]);
        expect(world.ui.confirmations).toEqual([]);
        expect((await world.runOf(runId)).status).toBe('Running');
        emit(world, runId, 'run.cancelled', { cause: 'x' });
        await world.orchestrator.whenIdle();
        expect(await world.statusesOf(runId)).toEqual(['Starting', 'Running', 'Cancelled']);
    });

    it('AC-009: with the fake provider the cancelled run ends Cancelled and the stop timer is dropped', async () => {
        const world = await createWorld({ scenario: 'long-run' });
        const runId = await started(world);
        await world.advance(10);
        await world.orchestrator.stop(runId);
        await world.orchestrator.whenIdle();
        expect((await world.runOf(runId)).status).toBe('Cancelled');
        await world.advance(STOP_TIMEOUT_MS * 2);
        expect(world.fakeCalls()).toEqual(['start', 'cancel']);
        expect((await world.runOf(runId)).statusHistory.at(-1)?.cause).toBeUndefined();
    });

    it('AC-010: a cancel that never answers ends Cancelled with the cause at 30 s, not at 30 s minus 1 ms; endSession once, nothing else after', async () => {
        const world = await createWorld({ script: IGNORING_CANCEL });
        const runId = await started(world);
        await world.advance(10);
        await world.orchestrator.stop(runId);
        await world.advance(STOP_TIMEOUT_MS - 1);
        expect((await world.runOf(runId)).status).toBe('Running');
        await world.advance(1);
        const run = await world.runOf(runId);
        expect(run.status).toBe('Cancelled');
        expect(run.statusHistory.at(-1)).toMatchObject({ status: 'Cancelled', cause: STOP_NOT_CONFIRMED_CAUSE });
        expect(world.fakeCalls()).toEqual(['start', 'cancel', 'endSession']);
        await world.advance(STOP_TIMEOUT_MS * 4);
        expect(world.fakeCalls()).toEqual(['start', 'cancel', 'endSession']);
        expect(await world.statusesOf(runId)).toEqual(['Starting', 'Running', 'Cancelled']);
    });

    it('AC-010: the timer counts from the cancel call whatever the call returned', async () => {
        const world = await createWorld();
        const cancels: string[] = [];
        const failing = createControlledAdapter('failing', {
            cancel: (id) => {
                cancels.push(id);
                return Promise.resolve({ ok: false, reason: 'cannot' });
            },
        });
        world.setup.registry.register(failing.adapter);
        const runId = await started(world, { providerId: 'failing' });
        failing.sink(runId).emit({ kind: 'session.started', source: 'provider', payload: {} });
        await world.advance(5_000);
        expect(await world.orchestrator.stop(runId)).toEqual({ kind: 'stopping' });
        await world.advance(STOP_TIMEOUT_MS);
        expect((await world.runOf(runId)).statusHistory.at(-1)).toMatchObject({ status: 'Cancelled', cause: STOP_NOT_CONFIRMED_CAUSE });
        expect(cancels).toEqual([runId]);
        expect(failing.calls).toEqual([`start:${runId}`, `endSession:${runId}`]);
    });

    it('AC-010: another end kind that arrives first wins and drops the stop timer', async () => {
        const world = await createWorld();
        const runId = await running(world);
        await world.orchestrator.stop(runId);
        await world.advance(10_000);
        emit(world, runId, 'run.failed', { category: 'auth', text: 't' });
        await world.advance(STOP_TIMEOUT_MS * 2);
        expect(await world.statusesOf(runId)).toEqual(['Starting', 'Running', 'Failed']);
        expect(world.controlled.calls).toEqual([`start:${runId}`, `cancel:${runId}`]);
    });

    it('AC-011: refuses a run in an end state, a provider without cancel and a pending stop, and calls no provider', async () => {
        const world = await createWorld();
        const quiet = createControlledAdapter('quiet', { capabilities: declarationWith({ cancel: 'none' }) });
        world.setup.registry.register(quiet.adapter);
        const quietRun = await started(world, { providerId: 'quiet' });
        quiet.sink(quietRun).emit({ kind: 'session.started', source: 'provider', payload: {} });
        await world.orchestrator.whenIdle();
        expect(await world.orchestrator.stop(quietRun)).toEqual({ kind: 'refused', code: 'not-supported', reason: noStopText('Provider quiet') });
        expect(quiet.calls).toEqual([`start:${quietRun}`]);
        quiet.sink(quietRun).emit({ kind: 'run.completed', source: 'provider', payload: {} });
        await world.orchestrator.whenIdle();
        expect(await world.orchestrator.stop(quietRun)).toEqual({ kind: 'refused', code: 'not-open', reason: alreadyEndedText(quietRun) });

        const runId = await running(world);
        await world.orchestrator.stop(runId);
        expect(await world.orchestrator.stop(runId)).toEqual({ kind: 'refused', code: 'stop-pending', reason: stopPendingText(runId) });
        expect(world.controlled.calls).toEqual([`start:${runId}`, `cancel:${runId}`]);
        expect(await world.orchestrator.stop('run-unknown')).toMatchObject({ kind: 'refused', code: 'not-open' });
    });

    it('AC-020: in a reader window a stop is refused with the reader text before anything else', async () => {
        const world = await createWorld();
        const runId = await running(world);
        world.session.use(await world.openStoreOn());
        const calls = [...world.controlled.calls];
        expect(await world.orchestrator.stop(runId)).toEqual({ kind: 'refused', code: 'reader-window', reason: READER_TEXT });
        expect(world.controlled.calls).toEqual(calls);
    });
});

function recordingAdapter(world: World, outcome: { ok: true } | { ok: false; reason: string } = { ok: true }) {
    const answers: { runId: string; requestId: string; answer: ApprovalAnswer | string }[] = [];
    const adapter = createControlledAdapter('rec', {
        respondToApproval: (runId, requestId, answer) => {
            answers.push({ runId, requestId, answer });
            return Promise.resolve(outcome);
        },
        respondToInput: (runId, requestId, text) => {
            answers.push({ runId, requestId, answer: text });
            return Promise.resolve(outcome);
        },
    });
    world.setup.registry.register(adapter.adapter);
    return { adapter, answers };
}

async function recorded(world: World, recorder: ReturnType<typeof recordingAdapter>): Promise<string> {
    const runId = await started(world, { providerId: 'rec' });
    recorder.adapter.sink(runId).emit({ kind: 'session.started', source: 'provider', payload: {} });
    await world.orchestrator.whenIdle();
    return runId;
}

const requestApproval = (recorder: ReturnType<typeof recordingAdapter>, runId: string, requestId = 'a1') =>
    recorder.adapter.sink(runId).emit({ kind: 'approval.requested', source: 'provider', payload: { requestId, actionKind: 'edit', summary: 's', outsideProject: false } });
const requestInput = (recorder: ReturnType<typeof recordingAdapter>, runId: string, requestId = 'i1') =>
    recorder.adapter.sink(runId).emit({ kind: 'input.requested', source: 'provider', payload: { requestId, question: 'q' } });

describe('answers', () => {
    it('AC-012: "approve once" and "reject" with a reason are forwarded exactly and the provider result is returned', async () => {
        const world = await createWorld();
        const recorder = recordingAdapter(world);
        const runId = await recorded(world, recorder);
        requestApproval(recorder, runId, 'a1');
        requestApproval(recorder, runId, 'a2');
        await world.orchestrator.whenIdle();
        expect(await world.orchestrator.respondToApproval(runId, 'a1', { decision: 'approve-once' })).toEqual({ kind: 'ok' });
        expect(await world.orchestrator.respondToApproval(runId, 'a2', { decision: 'reject', reason: 'no thanks' })).toEqual({ kind: 'ok' });
        expect(recorder.answers).toEqual([
            { runId, requestId: 'a1', answer: { decision: 'approve-once' } },
            { runId, requestId: 'a2', answer: { decision: 'reject', reason: 'no thanks' } },
        ]);
    });

    it('AC-012: any other answer value is refused and forwards nothing', async () => {
        const world = await createWorld();
        const recorder = recordingAdapter(world);
        const runId = await recorded(world, recorder);
        requestApproval(recorder, runId);
        await world.orchestrator.whenIdle();
        for (const bad of [{ decision: 'approve-for-session' }, { decision: 'approve' }, {}, { decision: 'reject', reason: 5 }]) {
            const result = await world.orchestrator.respondToApproval(runId, 'a1', bad as unknown as ApprovalAnswer);
            expect(result).toMatchObject({ kind: 'refused', code: 'invalid-answer', reason: 'An approval answer is "approve once" or "reject".' });
        }
        expect(recorder.answers).toEqual([]);
    });

    it('AC-012: a provider refusal comes back with its reason; the request stays open for the next try', async () => {
        const world = await createWorld();
        const recorder = recordingAdapter(world, { ok: false, reason: 'provider says no' });
        const runId = await recorded(world, recorder);
        requestApproval(recorder, runId);
        await world.orchestrator.whenIdle();
        expect(await world.orchestrator.respondToApproval(runId, 'a1', { decision: 'approve-once' })).toEqual({ kind: 'refused', code: 'provider-refused', reason: 'provider says no' });
        expect(await world.orchestrator.respondToApproval(runId, 'a1', { decision: 'approve-once' })).toMatchObject({ code: 'provider-refused' });
        expect(recorder.answers).toHaveLength(2);
    });

    it('AC-012: an unanswered request is still open and answerable after 24 h; nothing is answered by the system', async () => {
        const world = await createWorld();
        const recorder = recordingAdapter(world);
        const runId = await recorded(world, recorder);
        requestApproval(recorder, runId);
        await world.advance(86_400_000);
        expect((await world.runOf(runId)).status).toBe('WaitingForApproval');
        expect(recorder.answers).toEqual([]);
        expect(await world.orchestrator.respondToApproval(runId, 'a1', { decision: 'reject' })).toEqual({ kind: 'ok' });
    });

    it('AC-013: input text is forwarded unchanged and the request stays open until its .resolved event', async () => {
        const world = await createWorld();
        const recorder = recordingAdapter(world);
        const runId = await recorded(world, recorder);
        requestInput(recorder, runId);
        await world.orchestrator.whenIdle();
        const text = '  line one\n\tline two  ';
        expect(await world.orchestrator.respondToInput(runId, 'i1', text)).toEqual({ kind: 'ok' });
        expect(recorder.answers).toEqual([{ runId, requestId: 'i1', answer: text }]);
        expect((await world.runOf(runId)).status).toBe('WaitingForInput');
        recorder.adapter.sink(runId).emit({ kind: 'input.resolved', source: 'provider', payload: { requestId: 'i1' } });
        await world.orchestrator.whenIdle();
        expect((await world.runOf(runId)).status).toBe('Running');
    });

    it('AC-013: an answer for a request that is not open is refused and forwards nothing: unknown, resolved, wrong type, run ended, unknown run', async () => {
        const world = await createWorld();
        const recorder = recordingAdapter(world);
        const runId = await recorded(world, recorder);
        requestApproval(recorder, runId);
        requestInput(recorder, runId);
        recorder.adapter.sink(runId).emit({ kind: 'approval.resolved', source: 'provider', payload: { requestId: 'a1', decision: 'reject' } });
        await world.orchestrator.whenIdle();
        const refusal = (requestId: string) => ({ kind: 'refused', code: 'request-not-open', reason: requestNotOpenText(runId, requestId) });
        expect(await world.orchestrator.respondToApproval(runId, 'nope', { decision: 'reject' })).toEqual(refusal('nope'));
        expect(await world.orchestrator.respondToApproval(runId, 'a1', { decision: 'reject' })).toEqual(refusal('a1'));
        expect(await world.orchestrator.respondToApproval(runId, 'i1', { decision: 'reject' })).toEqual(refusal('i1'));
        expect(await world.orchestrator.respondToInput(runId, 'a1', 'x')).toEqual(refusal('a1'));
        recorder.adapter.sink(runId).emit({ kind: 'run.completed', source: 'provider', payload: {} });
        await world.orchestrator.whenIdle();
        expect(await world.orchestrator.respondToInput(runId, 'i1', 'x')).toEqual(refusal('i1'));
        expect(await world.orchestrator.respondToInput('run-unknown', 'i1', 'x')).toMatchObject({ kind: 'refused', code: 'request-not-open' });
        expect(recorder.answers).toEqual([]);
    });

    it('AC-013: with the fake provider an approve-once answer lets the run finish', async () => {
        const world = await createWorld({ scenario: 'approval' });
        const runId = await started(world);
        await world.advance(1_000);
        expect(await world.orchestrator.respondToApproval(runId, 'fake-approval-1', { decision: 'approve-once' })).toEqual({ kind: 'ok' });
        await world.advance(1_000);
        expect(await world.statusesOf(runId)).toEqual(['Starting', 'Running', 'WaitingForApproval', 'Running', 'Completed']);
    });

    it('AC-020: in a reader window every answer is refused with the reader text', async () => {
        const world = await createWorld();
        const recorder = recordingAdapter(world);
        const runId = await recorded(world, recorder);
        requestApproval(recorder, runId);
        await world.orchestrator.whenIdle();
        world.session.use(await world.openStoreOn());
        expect(await world.orchestrator.respondToApproval(runId, 'a1', { decision: 'reject' })).toEqual({ kind: 'refused', code: 'reader-window', reason: READER_TEXT });
        expect(await world.orchestrator.respondToInput(runId, 'i1', 'x')).toEqual({ kind: 'refused', code: 'reader-window', reason: READER_TEXT });
        expect(recorder.answers).toEqual([]);
    });
});
