import { describe, expect, it } from 'vitest';
import type { CliLocation } from './cliLocator';
import type { CopilotEvent } from './client';
import { events, recordedRows, syntheticRows, toSteps, type ScriptStep } from './testing/recorded';
import { createCopilotWorld, flush, ROOT, type CopilotWorldOptions } from './testing/world';

const DAY = 24 * 3_600_000;
const event = (type: string, data: Record<string, unknown>, afterMs = 0, id = `e-${type}`): ScriptStep => ({ kind: 'event', event: { type, id, data }, afterMs });
const ABORT: ScriptStep[] = [event('abort', { reason: 'user_initiated' }, 34), event('session.idle', { aborted: true }, 1)];
const REQUEST_ID = 'b575e742-d868-4ed7-b349-479fa134276a';

async function started(options: CopilotWorldOptions = {}) {
    const world = createCopilotWorld(options);
    await world.provider.start(world.request(), world.sink);
    await world.settle();
    return world;
}

const writeRequest = (): ScriptStep[] => toSteps(recordedRows('M-02')).filter((step) => step.kind === 'permission' || (step.kind === 'event' && step.event.type === 'permission.requested'));
const endKinds = (kinds: string[]): string[] => kinds.filter((kind) => ['run.completed', 'run.failed', 'run.cancelled'].includes(kind));

describe('approvals (AC-013, AC-014, AC-015)', () => {
    it('AC-013: a write request of the recording is one approval.requested with Copilot\'s request ID, the kind, the path and the marker; nothing is answered, also after 24 h', async () => {
        const world = await started({ client: { onSend: writeRequest() } });
        const requested = world.sink.events.filter((entry) => entry.kind === 'approval.requested');
        expect(requested).toHaveLength(1);
        expect(requested[0]?.payload).toEqual({ requestId: REQUEST_ID, actionKind: 'write', summary: 'hello.txt', outsideProject: false });
        const count = world.sink.events.length;
        await world.settle(DAY);
        expect(world.scripted.answers()).toEqual([]);
        expect(world.sink.events).toHaveLength(count);
    });

    it('AC-013: a request of every kind, one the adapter does not know included, becomes one approval.requested each and stays unanswered', async () => {
        const steps = toSteps(syntheticRows('S-approvals')).filter((step) => !(step.kind === 'event' && step.event.type === 'permission.completed'));
        const world = await started({ client: { onSend: steps } });
        const requested = world.sink.events.filter((entry) => entry.kind === 'approval.requested').map((entry) => (entry.payload as { actionKind: string; outsideProject: boolean }));
        expect(requested.map((entry) => entry.actionKind)).toEqual(['shell', 'read', 'url', 'mystery-kind']);
        expect(requested[1]?.outsideProject).toBe(true);
        await world.settle(DAY);
        expect(world.scripted.answers()).toEqual([]);
    });

    it('AC-014: approve once settles Copilot\'s promise with approve-once and emits one derived approval.resolved; a later permission.completed of Copilot is dropped', async () => {
        const steps = [...writeRequest(), event('permission.completed', { requestId: REQUEST_ID, result: 'approved' }, 1_000)];
        const world = await started({ client: { onSend: steps } });
        expect(await world.provider.respondToApproval('run-1', REQUEST_ID, { decision: 'approve-once' })).toEqual({ ok: true });
        await world.settle(2_000);
        expect(world.scripted.answers()).toEqual([{ call: 'answer.permission', answer: { kind: 'approve-once' } }]);
        const resolved = world.sink.events.filter((entry) => entry.kind === 'approval.resolved');
        expect(resolved).toHaveLength(1);
        expect(resolved[0]).toMatchObject({ source: 'derived', payload: { requestId: REQUEST_ID, decision: 'approve-once' } });
    });

    it('AC-014: reject passes the reason as feedback, or none; the resolution says reject', async () => {
        for (const [reason, expected] of [['not now', { kind: 'reject', feedback: 'not now' }], [undefined, { kind: 'reject' }]] as const) {
            const world = await started({ client: { onSend: writeRequest() } });
            const answer = reason === undefined ? { decision: 'reject' as const } : { decision: 'reject' as const, reason };
            expect(await world.provider.respondToApproval('run-1', REQUEST_ID, answer)).toEqual({ ok: true });
            await world.settle();
            expect(world.scripted.answers()).toEqual([{ call: 'answer.permission', answer: expected }]);
            expect(world.sink.events.find((entry) => entry.kind === 'approval.resolved')?.payload).toEqual({ requestId: REQUEST_ID, decision: 'reject' });
        }
    });

    it('AC-014: an answer is accepted once; unknown run, unknown request and a request of another type are refused and send nothing', async () => {
        const world = await started({ client: { onSend: [...writeRequest(), ...toSteps(syntheticRows('S-input')).slice(0, 2)] } });
        expect(await world.provider.respondToApproval('nope', REQUEST_ID, { decision: 'approve-once' })).toMatchObject({ ok: false });
        expect(await world.provider.respondToApproval('run-1', 'unknown', { decision: 'approve-once' })).toMatchObject({ ok: false });
        expect(await world.provider.respondToApproval('run-1', 'syn-input-1', { decision: 'approve-once' })).toMatchObject({ ok: false });
        expect(await world.provider.respondToApproval('run-1', REQUEST_ID, { decision: 'approve-once' })).toEqual({ ok: true });
        expect(await world.provider.respondToApproval('run-1', REQUEST_ID, { decision: 'reject' })).toMatchObject({ ok: false });
        await world.settle();
        expect(world.scripted.answers()).toHaveLength(1);
    });

    it('AC-015: a request open when the run is cancelled gets no answer afterwards, and respondToApproval is refused', async () => {
        const world = await started({ client: { onSend: writeRequest(), onAbort: ABORT } });
        await world.provider.cancel('run-1');
        await world.settle(100);
        expect(world.sink.kinds().at(-1)).toBe('run.cancelled');
        expect(await world.provider.respondToApproval('run-1', REQUEST_ID, { decision: 'approve-once' })).toMatchObject({ ok: false });
        await world.settle(DAY);
        expect(world.scripted.answers()).toEqual([]);
    });

    it('AC-015: a request open when the run ends (session error) gets no answer afterwards', async () => {
        const world = await started({ client: { onSend: [...writeRequest(), event('session.error', { errorType: 'x', message: 'm' }, 10)] } });
        await world.settle(100);
        expect(world.sink.kinds().at(-1)).toBe('run.failed');
        expect(await world.provider.respondToApproval('run-1', REQUEST_ID, { decision: 'approve-once' })).toMatchObject({ ok: false });
        expect(world.scripted.answers()).toEqual([]);
    });

    it('AC-015: the call log of a run that approves and rejects holds only approve-once and reject', async () => {
        const world = await started({ client: { onSend: toSteps(syntheticRows('S-approvals')) } });
        for (const [index, id] of ['syn-req-shell', 'syn-req-read', 'syn-req-url', 'syn-req-new'].entries()) {
            await world.provider.respondToApproval('run-1', id, index % 2 === 0 ? { decision: 'approve-once' } : { decision: 'reject', reason: 'r' });
        }
        await world.settle();
        expect(world.scripted.answers().map((entry) => (entry.call === 'answer.permission' ? entry.answer.kind : ''))).toEqual(['approve-once', 'reject', 'approve-once', 'reject']);
    });
});

describe('questions (AC-016)', () => {
    const inputSteps = () => toSteps(syntheticRows('S-input')).filter((step) => !(step.kind === 'event' && step.event.type.endsWith('.completed')));

    it('AC-016: user input and a one-field elicitation are input.requested with Copilot\'s request ID; a larger form is declined at once with one warning', async () => {
        const world = await started({ client: { onSend: inputSteps() } });
        const requested = world.sink.events.filter((entry) => entry.kind === 'input.requested').map((entry) => entry.payload);
        expect(requested).toEqual([
            { requestId: 'syn-input-1', question: 'Which framework?\n\nChoices: React, Vue' },
            { requestId: 'syn-input-2', question: 'Project name?' },
            { requestId: 'syn-elic-1', question: 'Which branch?' },
        ]);
        expect(world.sink.events.filter((entry) => entry.kind === 'warning')).toHaveLength(1);
        expect(world.scripted.answers()).toEqual([{ call: 'answer.elicitation', answer: { action: 'decline' } }]);
    });

    it('AC-016: the text of respondToInput reaches Copilot unchanged, and input.resolved is derived and carries no text', async () => {
        const world = await started({ client: { onSend: inputSteps() } });
        const text = '  Vue \n with  spaces\t';
        expect(await world.provider.respondToInput('run-1', 'syn-input-1', text)).toEqual({ ok: true });
        expect(await world.provider.respondToInput('run-1', 'syn-elic-1', 'main')).toEqual({ ok: true });
        await world.settle();
        expect(world.scripted.answers()).toEqual([
            { call: 'answer.elicitation', answer: { action: 'decline' } },
            { call: 'answer.userInput', answer: { answer: text, wasFreeform: true } },
            { call: 'answer.elicitation', answer: { action: 'accept', content: { branch: 'main' } } },
        ]);
        const resolved = world.sink.events.filter((entry) => entry.kind === 'input.resolved');
        expect(resolved.map((entry) => entry.payload)).toEqual([{ requestId: 'syn-input-1' }, { requestId: 'syn-elic-1' }]);
        expect(resolved.every((entry) => entry.source === 'derived')).toBe(true);
        expect(JSON.stringify(world.sink.events)).not.toContain('with  spaces');
    });

    it('AC-016: a Copilot completion of an answered question adds no second input.resolved; an input id is no approval id', async () => {
        const steps = [...inputSteps(), event('user_input.completed', { requestId: 'syn-input-1', answer: 'x' }, 1_000)];
        const world = await started({ client: { onSend: steps } });
        await world.provider.respondToInput('run-1', 'syn-input-1', 'x');
        expect(await world.provider.respondToInput('run-1', 'syn-input-1', 'again')).toMatchObject({ ok: false });
        expect(await world.provider.respondToInput('run-1', 'nope', 'x')).toMatchObject({ ok: false });
        await world.settle(2_000);
        expect(world.sink.events.filter((entry) => entry.kind === 'input.resolved' && (entry.payload as { requestId: string }).requestId === 'syn-input-1')).toHaveLength(1);
    });
});

describe('cancel (AC-017)', () => {
    it('AC-017: cancel requests one abort however often it is called, run.cancelled follows Copilot\'s abort event, one end kind, no forced stop', async () => {
        const world = await started({ client: { onSend: [], onAbort: ABORT } });
        expect(await world.provider.cancel('run-1')).toEqual({ ok: true });
        expect(await world.provider.cancel('run-1')).toEqual({ ok: true });
        await world.settle(34);
        expect(world.scripted.count('abort')).toBe(1);
        expect(world.sink.events.at(-1)).toMatchObject({ kind: 'run.cancelled', source: 'provider', payload: {} });
        expect(endKinds(world.sink.kinds())).toEqual(['run.cancelled']);
        await world.settle(60_000);
        expect(world.scripted.count('forceStop')).toBe(0);
        expect(endKinds(world.sink.kinds())).toEqual(['run.cancelled']);
    });

    it('AC-017: without Copilot\'s abort event the runtime is stopped after 10 s and run.cancelled carries the cause "forced stop", derived; nothing follows', async () => {
        const world = await started({ client: { onSend: [], onAbort: 'silent' } });
        await world.provider.cancel('run-1');
        await world.settle(9_999);
        expect(world.scripted.count('forceStop')).toBe(0);
        expect(endKinds(world.sink.kinds())).toEqual([]);
        await world.settle(1);
        expect(world.scripted.count('forceStop')).toBe(1);
        expect(world.sink.events.at(-1)).toMatchObject({ kind: 'run.cancelled', source: 'derived', payload: { cause: 'forced stop' } });
        const count = world.sink.events.length;
        world.scripted.exit({ code: 1, message: 'killed' });
        await world.settle(30_000);
        expect(world.sink.events).toHaveLength(count);
    });

    it('AC-017: a runtime that exits while a cancel is pending is no failure', async () => {
        const world = await started({ client: { onSend: [], onAbort: 'silent' } });
        await world.provider.cancel('run-1');
        world.scripted.exit({ code: 1, message: 'gone' });
        await world.settle(10_000);
        expect(world.sink.kinds().filter((kind) => kind === 'run.failed')).toEqual([]);
        expect(world.sink.events.at(-1)).toMatchObject({ kind: 'run.cancelled', payload: { cause: 'forced stop' } });
    });

    it('AC-017: no session yet: run.cancelled at once, no prompt is sent, no session is created and the runtime is not left running', async () => {
        let release: (location: CliLocation) => void = () => undefined;
        const gate = new Promise<CliLocation>((resolve) => (release = resolve));
        const world = createCopilotWorld({ locate: () => gate });
        const done = world.provider.start(world.request(), world.sink);
        await flush();
        expect(await world.provider.cancel('run-1')).toEqual({ ok: true });
        await flush();
        expect(world.sink.events).toHaveLength(1);
        expect(world.sink.events[0]).toMatchObject({ kind: 'run.cancelled', source: 'derived' });
        release({ kind: 'found', path: '/usr/bin/copilot', version: '1.0.87' });
        await done;
        await world.settle();
        expect(world.scripted.count('createSession')).toBe(0);
        expect(world.scripted.count('send')).toBe(0);
        expect(world.sink.kinds()).toEqual(['run.cancelled']);
    });

    it('AC-017: a cancel while the session is being created also sends no prompt', async () => {
        const world = createCopilotWorld({ client: { onSend: [] } });
        const done = world.provider.start(world.request(), world.sink);
        await world.provider.cancel('run-1');
        await done;
        await world.settle();
        expect(world.scripted.count('send')).toBe(0);
        expect(world.sink.kinds()).toEqual(['run.cancelled']);
    });

    it('AC-017: cancel on an unknown or ended run, or an abort that fails, is refused with a reason', async () => {
        const world = await started({ client: { onSend: [event('session.idle', {}, 1)] } });
        await world.settle(10);
        expect(world.sink.kinds().at(-1)).toBe('run.completed');
        expect(await world.provider.cancel('run-1')).toMatchObject({ ok: false });
        expect(await world.provider.cancel('missing')).toMatchObject({ ok: false });
        const failing = await started({ client: { onSend: [], abortError: new Error('abort rejected') } });
        expect(await failing.provider.cancel('run-1')).toEqual({ ok: false, reason: 'abort rejected' });
    });

    it('AC-017: exactly one end kind per run whatever arrives after the first', async () => {
        const stream: CopilotEvent[] = [
            { type: 'session.idle', id: 'i1', data: {} },
            { type: 'session.error', id: 'e', data: { errorType: 'x', message: 'm' } },
            { type: 'abort', id: 'a', data: {} },
            { type: 'session.idle', id: 'i2', data: {} },
        ];
        const world = await started({ client: { onSend: stream.map((entry) => ({ kind: 'event', event: entry }) as const) } });
        expect(endKinds(world.sink.kinds())).toEqual(['run.completed']);
        world.scripted.exit({ code: 1, message: 'late' });
        await world.settle();
        expect(endKinds(world.sink.kinds())).toEqual(['run.completed']);
    });
});

describe('end session (AC-025)', () => {
    it('AC-025: endSession stops the runtime at once, delivers nothing more, and refuses later answers and cancels', async () => {
        const steps = [...writeRequest(), event('assistant.turn_start', {}, 500), event('session.idle', {}, 500)];
        const world = await started({ client: { onSend: steps, onAbort: 'silent' } });
        const count = world.sink.events.length;
        world.provider.endSession('run-1');
        expect(world.scripted.count('forceStop')).toBe(1);
        await world.settle(DAY);
        expect(world.sink.events).toHaveLength(count);
        expect(await world.provider.respondToApproval('run-1', REQUEST_ID, { decision: 'approve-once' })).toMatchObject({ ok: false });
        expect(await world.provider.cancel('run-1')).toMatchObject({ ok: false });
        expect(world.scripted.answers()).toEqual([]);
    });

    it('AC-025: endSession during a pending cancel drops the forced-stop timer; endSession of an unknown run does nothing', async () => {
        const world = await started({ client: { onSend: [], onAbort: 'silent' } });
        await world.provider.cancel('run-1');
        world.provider.endSession('run-1');
        world.provider.endSession('missing');
        const count = world.sink.events.length;
        await world.settle(60_000);
        expect(world.sink.events).toHaveLength(count);
        expect(world.scripted.count('forceStop')).toBe(1);
        expect(world.clock.pendingTimers()).toBe(0);
    });

    it('AC-025: the recorded cancel (M-04) ends the run as cancelled and no run.completed follows the idle', async () => {
        const rows = recordedRows('M-04');
        const before = toSteps(rows.filter((row) => row.seq < 163));
        const after = toSteps(rows.filter((row) => row.seq >= 163));
        const world = await started({ client: { onSend: before, onAbort: after } });
        await world.provider.cancel('run-1');
        await world.settle();
        expect(world.sink.kinds()).toEqual(['session.started', 'turn.started', 'run.cancelled']);
        expect(events(after).length).toBeGreaterThan(0);
        void ROOT;
    });
});
