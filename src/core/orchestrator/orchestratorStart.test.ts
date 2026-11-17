import { describe, expect, it } from 'vitest';
import type { ProviderService } from '../providers/providerService';
import { NOT_AVAILABLE, type JsonValue } from '../runtime/model';
import { READER_TEXT, createFailedText, notRegisteredText, runOpenText, storeText } from './texts';
import { createWorld, type World } from './testing/world';

async function started(world: World, overrides = {}): Promise<string> {
    const result = await world.orchestrator.start(world.request(overrides));
    if (result.kind !== 'started') {
        throw new Error(`start refused: ${result.reason}`);
    }
    return result.runId;
}

function sinkFor(world: World, runId: string) {
    return world.controlled.sink(runId);
}

const emit = (world: World, runId: string, kind: string, payload: JsonValue = {}, source: 'provider' | 'derived' = 'provider') =>
    sinkFor(world, runId).emit({ kind, source, payload });

describe('start', () => {
    it('AC-001: creates one Starting run with the request data, then calls the provider start once with run ID, directory, prompt and model', async () => {
        const world = await createWorld();
        const result = await world.orchestrator.start(world.request({ providerId: 'controlled', model: 'model-x', workingDirectory: 'C:/work', prompt: 'Do it.' }));
        expect(result.kind).toBe('started');
        const runs = await world.runs();
        expect(runs).toHaveLength(1);
        expect(runs[0]).toMatchObject({ providerId: 'controlled', model: 'model-x', spec: { stem: '0007-board', path: '.specs/active/0007-board.md' }, status: 'Starting' });
        expect(world.controlled.started).toEqual([{ runId: runs[0]?.runId, workingDirectory: 'C:/work', prompt: 'Do it.', model: 'model-x' }]);
        expect(world.controlled.calls).toEqual([`start:${runs[0]?.runId}`]);
    });

    it('AC-001: a model "not available" is passed to 0004 and the provider as absent', async () => {
        const world = await createWorld();
        const runId = await started(world, { providerId: 'controlled' });
        expect(world.controlled.started[0]).not.toHaveProperty('model');
        expect((await world.runOf(runId)).model).toBe(NOT_AVAILABLE);
    });

    it('AC-001: session.started hands its session reference and model to 0004 with the Running status', async () => {
        const world = await createWorld({ scenario: 'long-run' });
        const runId = await started(world);
        await world.advance(10);
        const run = await world.runOf(runId);
        expect(run.status).toBe('Running');
        expect(run.sessionRef).toBe(`fake-session-${runId}`);
        expect(run.model).toBe('fake-model');
    });

    it('AC-001: every event is stored in arrival order with its source as one more payload field', async () => {
        const world = await createWorld();
        const runId = await started(world, { providerId: 'controlled' });
        emit(world, runId, 'session.started', { sessionRef: 's1' });
        emit(world, runId, 'message.delta', { text: 'a' }, 'provider');
        emit(world, runId, 'warning', { text: 'derived one' }, 'derived');
        await world.orchestrator.whenIdle();
        const events = await world.store.readEvents(runId, 0, 100);
        expect(events.available && events.value.map((event) => event.type)).toEqual(['session.started', 'message.delta', 'warning']);
        expect(events.available && events.value.map((event) => event.payload)).toEqual([
            { sessionRef: 's1', source: 'provider' },
            { text: 'a', source: 'provider' },
            { text: 'derived one', source: 'derived' },
        ]);
    });

    it('AC-001: the happy path ends Completed through events alone', async () => {
        const world = await createWorld();
        const runId = await started(world);
        await world.advance(1_000);
        expect(await world.statusesOf(runId)).toEqual(['Starting', 'Running', 'Completed']);
    });
});

describe('one open run', () => {
    it('AC-002: two start requests that do not wait for each other create exactly one run; the other names the open run and its stem', async () => {
        const world = await createWorld({ scenario: 'long-run' });
        const [first, second] = await Promise.all([
            world.orchestrator.start(world.request({ stem: '0007-board', path: '.specs/active/0007-board.md' })),
            world.orchestrator.start(world.request({ stem: '0008-start', path: '.specs/active/0008-start.md' })),
        ]);
        expect(first.kind).toBe('started');
        expect(second).toMatchObject({ kind: 'refused', code: 'run-open', run: { stem: '0007-board' } });
        expect(second.kind === 'refused' && second.reason).toBe(runOpenText(first.kind === 'started' ? first.runId : '', '0007-board'));
        expect(await world.runs()).toHaveLength(1);
        expect(world.fakeCalls().filter((call) => call === 'start')).toHaveLength(1);
    });

    it('AC-002: a start is refused while a run of the project is open and accepted once it has ended', async () => {
        const world = await createWorld();
        const first = await started(world, { providerId: 'controlled' });
        const refused = await world.orchestrator.start(world.request({ stem: '0008-start' }));
        expect(refused).toMatchObject({ kind: 'refused', code: 'run-open', run: { runId: first, stem: '0007-board' } });
        emit(world, first, 'run.failed', { category: 'auth', text: 't' });
        await world.orchestrator.whenIdle();
        const second = await world.orchestrator.start(world.request({ stem: '0008-start' }));
        expect(second.kind).toBe('started');
    });

    it('AC-002: a run left open by an earlier store instance counts as well', async () => {
        const world = await createWorld();
        const seeded = await world.store.createRun({ providerId: 'fake', spec: { stem: '0001-x', path: '.specs/active/0001-x.md' } });
        const refused = await world.orchestrator.start(world.request());
        expect(refused).toMatchObject({ kind: 'refused', code: 'run-open', run: { runId: seeded.runId, stem: '0001-x' } });
        expect(world.fake.calls()).toEqual([]);
    });
});

describe('refusals call no provider', () => {
    it('AC-003: a provider ID the registry does not hold', async () => {
        const world = await createWorld();
        const result = await world.orchestrator.start(world.request({ providerId: 'nope' }));
        expect(result).toEqual({ kind: 'refused', code: 'not-registered', reason: notRegisteredText('nope') });
        expect(await world.runs()).toEqual([]);
    });

    it('AC-003: a store that is not writable, with the reason', async () => {
        const world = await createWorld();
        world.session.use(undefined);
        const result = await world.orchestrator.start(world.request());
        expect(result).toEqual({ kind: 'refused', code: 'store-not-writable', reason: storeText('No active FeatherSpec project.') });
        expect(world.fake.calls()).toEqual([]);
    });

    it('AC-003: creating the run fails', async () => {
        const world = await createWorld();
        world.store.createRun = () => Promise.reject(new Error('disk full'));
        const result = await world.orchestrator.start(world.request());
        expect(result).toEqual({ kind: 'refused', code: 'create-failed', reason: createFailedText('disk full') });
        expect(world.fake.calls()).toEqual([]);
        expect(world.controlled.calls).toEqual([]);
    });

    it('AC-003: the writer check comes first and no refusal creates a run', async () => {
        const world = await createWorld();
        const reader = await world.openStoreOn();
        world.session.use(reader);
        const result = await world.orchestrator.start(world.request({ providerId: 'nope' }));
        expect(result).toEqual({ kind: 'refused', code: 'reader-window', reason: READER_TEXT });
        expect(await world.runs()).toEqual([]);
    });
});

describe('events and statuses', () => {
    it('AC-005: run.cancelled then run.completed leaves Cancelled and appends no further status', async () => {
        const world = await createWorld();
        const runId = await started(world, { providerId: 'controlled' });
        emit(world, runId, 'session.started', { sessionRef: 's' });
        emit(world, runId, 'run.cancelled', { cause: 'x' });
        emit(world, runId, 'run.completed', { finalMessage: 'late' });
        await world.orchestrator.whenIdle();
        expect(await world.statusesOf(runId)).toEqual(['Starting', 'Running', 'Cancelled']);
        expect((await world.runOf(runId)).status).toBe('Cancelled');
        expect(await world.eventKinds(runId)).toEqual(['session.started', 'run.cancelled', 'run.completed']);
    });

    it('AC-005: a duplicate event changes nothing and is stored once', async () => {
        const world = await createWorld({ scenario: 'duplicates-and-late' });
        const runId = await started(world);
        await world.advance(1_000);
        const kinds = await world.eventKinds(runId);
        expect(kinds.filter((kind) => kind === 'reasoning')).toHaveLength(1);
        expect(await world.statusesOf(runId)).toEqual(['Starting', 'Running', 'Completed']);
    });

    it('AC-005: a duplicate approval.requested after its .resolved changes no status', async () => {
        const world = await createWorld();
        const runId = await started(world, { providerId: 'controlled' });
        const sink = sinkFor(world, runId);
        sink.emit({ kind: 'session.started', source: 'provider', payload: {} });
        sink.emit({ kind: 'approval.requested', source: 'provider', providerEventId: 'p-1', payload: { requestId: 'r1', tool: 'shell', summary: 's' } });
        sink.emit({ kind: 'approval.resolved', source: 'provider', providerEventId: 'p-2', payload: { requestId: 'r1' } });
        sink.emit({ kind: 'approval.requested', source: 'provider', providerEventId: 'p-1', payload: { requestId: 'r1', tool: 'shell', summary: 's' } });
        await world.orchestrator.whenIdle();
        expect(await world.statusesOf(runId)).toEqual(['Starting', 'Running', 'WaitingForApproval', 'Running']);
        expect(await world.eventKinds(runId)).toEqual(['session.started', 'approval.requested', 'approval.resolved']);
    });

    it('AC-006: the fake approval and input scenarios hold their waiting statuses', async () => {
        const approval = await createWorld({ scenario: 'approval' });
        const approvalRun = await started(approval);
        await approval.advance(1_000);
        expect((await approval.runOf(approvalRun)).status).toBe('WaitingForApproval');
        const input = await createWorld({ scenario: 'input' });
        const inputRun = await started(input);
        await input.advance(1_000);
        expect((await input.runOf(inputRun)).status).toBe('WaitingForInput');
        expect(await input.statusesOf(inputRun)).toEqual(['Starting', 'Running', 'WaitingForInput']);
    });

    it('AC-007: a failure category that bears a class name gives that class and the text', async () => {
        const world = await createWorld({ scenario: 'failure:quota_or_rate_limit' });
        const runId = await started(world);
        await world.advance(1_000);
        const run = await world.runOf(runId);
        expect(run).toMatchObject({ status: 'Failed', errorClass: 'quota_or_rate_limit', errorMessage: "The provider's quota or rate limit was reached." });
    });

    it('AC-007: a category that is no class is unknown; a derived failure is provider_exited', async () => {
        const tool = await createWorld({ scenario: 'failure:tool_failure' });
        const toolRun = await started(tool);
        await tool.advance(1_000);
        expect((await tool.runOf(toolRun)).errorClass).toBe('unknown');
        const silent = await createWorld({ scenario: 'no-end' });
        const silentRun = await started(silent);
        await silent.advance(1_000);
        expect(await silent.runOf(silentRun)).toMatchObject({ status: 'Failed', errorClass: 'provider_exited' });
    });

    it('AC-007: a port refusal without an end kind fails the run at once with unknown and the refusal reason', async () => {
        const world = await createWorld({
            wrapProviders: (service): ProviderService => ({ ...service, start: () => Promise.resolve({ kind: 'failed', reason: 'boom' }) }),
        });
        const result = await world.orchestrator.start(world.request());
        expect(result.kind).toBe('started');
        await world.orchestrator.whenIdle();
        const run = await world.runOf(result.kind === 'started' ? result.runId : '');
        expect(run).toMatchObject({ status: 'Failed', errorClass: 'unknown', errorMessage: 'boom' });
    });

    it('AC-007: a tool.completed that is not ok fails no run', async () => {
        const world = await createWorld();
        const runId = await started(world, { providerId: 'controlled' });
        emit(world, runId, 'session.started');
        emit(world, runId, 'tool.completed', { toolName: 't', callId: 'c', ok: false, errorText: 'x' });
        await world.orchestrator.whenIdle();
        expect((await world.runOf(runId)).status).toBe('Running');
    });

    it('AC-006: requests that opened before session.started count from that event on', async () => {
        const world = await createWorld();
        const runId = await started(world, { providerId: 'controlled' });
        emit(world, runId, 'approval.requested', { requestId: 'a1', actionKind: 'edit', summary: 's', outsideProject: false });
        await world.orchestrator.whenIdle();
        expect((await world.runOf(runId)).status).toBe('Starting');
        emit(world, runId, 'session.started', { sessionRef: 's' });
        await world.orchestrator.whenIdle();
        expect(await world.statusesOf(runId)).toEqual(['Starting', 'Running', 'WaitingForApproval']);
    });
});
