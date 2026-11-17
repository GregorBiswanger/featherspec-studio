import * as assert from 'assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { StudioApi } from '../extension';
import type { DeliveredEvent, ProviderEventSink } from '../core/ports/agentProvider';

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
});
