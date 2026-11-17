import * as assert from 'assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { StudioApi } from '../extension';
import type { AgentProviderPort, DeliveredEvent, ProviderEventSink } from '../core/ports/agentProvider';

const OPT_IN = 'FEATHERSPEC_COPILOT_SMOKE';
const END_KINDS = ['run.completed', 'run.failed', 'run.cancelled'];

async function activateStudio(): Promise<StudioApi> {
    const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
    assert.ok(extension, 'extension is installed in the test host');
    return (await extension.activate()) as StudioApi;
}

function recorder(): { sink: ProviderEventSink; events: DeliveredEvent[] } {
    const events: DeliveredEvent[] = [];
    return { events, sink: { emit: (event) => void events.push(event), close: () => undefined, fail: () => undefined } };
}

async function waitForEvent(label: string, events: DeliveredEvent[], found: (event: DeliveredEvent) => boolean, timeoutMs: number): Promise<DeliveredEvent> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        const hit = events.find(found);
        if (hit) {
            return hit;
        }
        if (Date.now() > deadline) {
            throw new Error(`timed out waiting for ${label}; last event: ${events.at(-1)?.kind ?? 'none'}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
}

async function optedInCopilot(context: Mocha.Context): Promise<AgentProviderPort | undefined> {
    if (process.env[OPT_IN] !== '1') {
        console.log(`skipped: set ${OPT_IN}=1 to run against a signed-in Copilot CLI (no prompt is sent otherwise)`);
        context.skip();
        return undefined;
    }
    const api = await activateStudio();
    await api.whenIdle();
    const copilot = api.providers().registry.adapter('copilot');
    assert.ok(copilot, 'the copilot provider is registered');
    const availability = await copilot.checkAvailability();
    if (availability.result !== 'available') {
        console.log(`skipped: availability is ${availability.result}${availability.hint ? ` (${availability.hint})` : ''}`);
        context.skip();
        return undefined;
    }
    return copilot;
}

const kindsOf = (events: DeliveredEvent[]): string => events.map((event) => event.kind).join(', ');

suite('FeatherSpec Studio GitHub Copilot provider smoke', function () {
    this.timeout(300_000);

    test('M-07: the extension host runs a Node version the Copilot SDK supports', () => {
        const node = process.versions.node;
        console.log(`host node ${node}, electron ${process.versions.electron ?? 'none'}`);
        const [major = 0, minor = 0] = node.split('.').map(Number);
        const supported = (major === 20 && minor >= 19) || major > 22 || (major === 22 && minor >= 12);
        assert.ok(supported, `Node ${node} does not satisfy ^20.19 || >=22.12`);
    });

    test('a text-only run completes and a write request is rejected (skips without opt-in or a signed-in CLI)', async function () {
        if (process.env[OPT_IN] !== '1') {
            console.log(`skipped: set ${OPT_IN}=1 to run against a signed-in Copilot CLI (no prompt is sent otherwise)`);
            return this.skip();
        }
        const api = await activateStudio();
        await api.whenIdle();
        const copilot = api.providers().registry.adapter('copilot');
        assert.ok(copilot, 'the copilot provider is registered');
        const availability = await copilot.checkAvailability();
        if (availability.result !== 'available') {
            console.log(`skipped: availability is ${availability.result}${availability.hint ? ` (${availability.hint})` : ''}`);
            return this.skip();
        }
        const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'featherspec-copilot-smoke-'));
        const { sink, events } = recorder();
        try {
            await copilot.start({ runId: 'smoke-1', workingDirectory: folder, prompt: 'Reply with the single word ok. Do not use any tool.' }, sink);
            await waitForEvent('a terminal event of the text-only run', events, (event) => END_KINDS.includes(event.kind), 240_000);
            assert.ok(events.some((event) => event.kind === 'run.completed'), `run did not complete: ${events.map((event) => event.kind).join(', ')}`);
            copilot.endSession('smoke-1');

            const writing = recorder();
            const target = path.join(folder, 'should-not-exist.txt');
            await copilot.start({ runId: 'smoke-2', workingDirectory: folder, prompt: `Create the file ${target} containing the text hello.` }, writing.sink);
            const request = await waitForEvent('an approval request for the write', writing.events, (event) => event.kind === 'approval.requested', 240_000);
            const requestId = (request.payload as { requestId: string }).requestId;
            const outcome = await copilot.respondToApproval('smoke-2', requestId, { decision: 'reject' });
            assert.ok(outcome.ok, 'the rejection was accepted');
            await waitForEvent('the end of the rejected run', writing.events, (event) => END_KINDS.includes(event.kind), 240_000);
            assert.ok(!fs.existsSync(target), 'the rejected write left no file');
            copilot.endSession('smoke-2');
        } finally {
            fs.rmSync(folder, { recursive: true, force: true });
        }
    });
    test('M-02, M-03, M-05: a write approved once lands with file.changed, a read is observed, and the run resumes with its memory (skips without opt-in)', async function () {
        const copilot = await optedInCopilot(this);
        if (copilot === undefined) {
            return;
        }
        const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'featherspec-copilot-accept-'));
        const target = path.join(folder, 'approved.txt');
        try {
            const write = recorder();
            await copilot.start({ runId: 'accept-1', workingDirectory: folder, prompt: `Create the file ${target} containing the text hello. Use no other tool.` }, write.sink);
            const request = await waitForEvent('the approval request for the write', write.events, (event) => event.kind === 'approval.requested', 240_000);
            assert.ok(!fs.existsSync(target), 'M-02: no file before the answer');
            const outcome = await copilot.respondToApproval('accept-1', (request.payload as { requestId: string }).requestId, { decision: 'approve-once' });
            assert.ok(outcome.ok, 'the approval was accepted');
            await waitForEvent('the end of the approved run', write.events, (event) => END_KINDS.includes(event.kind), 240_000);
            assert.ok(write.events.some((event) => event.kind === 'run.completed'), `M-03: run did not complete: ${kindsOf(write.events)}`);
            assert.ok(fs.existsSync(target), 'M-02: the approved write created the file');
            assert.ok(write.events.some((event) => event.kind === 'file.changed'), `M-03: fileEdits produced no file.changed: ${kindsOf(write.events)}`);
            const started = write.events.find((event) => event.kind === 'session.started');
            const sessionRef = (started?.payload as { sessionRef?: string } | undefined)?.sessionRef;
            assert.ok(sessionRef, 'the run named its Copilot session');
            copilot.endSession('accept-1');

            const read = recorder();
            await copilot.start({ runId: 'accept-2', workingDirectory: folder, prompt: `Read the file ${target} and reply with its content only.` }, read.sink);
            const readEnd = await waitForEvent('an approval request for the read or the end of the read run', read.events, (event) => event.kind === 'approval.requested' || END_KINDS.includes(event.kind), 240_000);
            if (readEnd.kind === 'approval.requested') {
                console.log(`A-005 observation: a read asks first (kind ${(readEnd.payload as { actionKind?: string }).actionKind ?? '?'})`);
                await copilot.respondToApproval('accept-2', (readEnd.payload as { requestId: string }).requestId, { decision: 'reject' });
                await waitForEvent('the end of the read run', read.events, (event) => END_KINDS.includes(event.kind), 240_000);
            } else {
                console.log(`A-005 observation: the read ran without a request; events: ${kindsOf(read.events)}`);
            }
            copilot.endSession('accept-2');

            const resumed = recorder();
            await copilot.resume({ runId: 'accept-3', workingDirectory: folder, sessionRef, continuationText: 'What is the name of the file you created earlier? Reply with the file name only.' }, resumed.sink);
            await waitForEvent('the end of the resumed run', resumed.events, (event) => END_KINDS.includes(event.kind), 240_000);
            assert.strictEqual(resumed.events[0]?.kind, 'session.started', 'M-05: the resumed run starts with session.started');
            assert.strictEqual((resumed.events[0]?.payload as { sessionRef?: string }).sessionRef, sessionRef, 'M-05: the same Copilot session');
            const completed = resumed.events.find((event) => event.kind === 'run.completed');
            assert.ok(completed, `M-05: the resumed run did not complete: ${kindsOf(resumed.events)}`);
            assert.match((completed.payload as { finalMessage?: string }).finalMessage ?? '', /approved\.txt/, 'M-05: the agent remembers its earlier change');
            copilot.endSession('accept-3');
        } finally {
            fs.rmSync(folder, { recursive: true, force: true });
        }
    });

    test('M-04: a cancel while a tool waits for its approval ends the run as cancelled and nothing is written (skips without opt-in)', async function () {
        const copilot = await optedInCopilot(this);
        if (copilot === undefined) {
            return;
        }
        const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'featherspec-copilot-cancel-'));
        const target = path.join(folder, 'cancelled.txt');
        try {
            const run = recorder();
            await copilot.start({ runId: 'accept-4', workingDirectory: folder, prompt: `Create the file ${target} containing the text hello.` }, run.sink);
            await waitForEvent('the approval request to cancel under', run.events, (event) => event.kind === 'approval.requested', 240_000);
            const cancelledAt = Date.now();
            const outcome = await copilot.cancel('accept-4');
            assert.ok(outcome.ok, 'the cancel was accepted');
            const end = await waitForEvent('the end of the cancelled run', run.events, (event) => END_KINDS.includes(event.kind), 30_000);
            console.log(`M-04: ${end.kind} after ${Date.now() - cancelledAt} ms, cause ${(end.payload as { cause?: string }).cause ?? 'none'}`);
            assert.strictEqual(end.kind, 'run.cancelled', `M-04: ${kindsOf(run.events)}`);
            assert.strictEqual(run.events.filter((event) => END_KINDS.includes(event.kind)).length, 1, 'exactly one end kind');
            await new Promise((resolve) => setTimeout(resolve, 3_000));
            assert.ok(!fs.existsSync(target), 'M-04: no file after the cancel');
            copilot.endSession('accept-4');
        } finally {
            fs.rmSync(folder, { recursive: true, force: true });
        }
    });
});
