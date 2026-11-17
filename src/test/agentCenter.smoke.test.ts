import * as assert from 'assert';
import * as vscode from 'vscode';
import { waitFor } from '../core/discovery/testing/waitFor';
import type { StudioApi } from '../extension';
import type { AgentCenterView } from '../shared/protocol/agentCenter';

async function activateStudio(): Promise<StudioApi> {
    const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
    assert.ok(extension, 'extension is installed in the test host');
    return (await extension.activate()) as StudioApi;
}

function statusOf(view: AgentCenterView | undefined, runId: string): string | undefined {
    return view?.kind === 'ready' ? view.rows.find((row) => row.runId === runId)?.status : undefined;
}

suite('FeatherSpec Studio Agent Center smoke', function () {
    this.timeout(120_000);

    test('AC-012, AC-013: a run and its events written through the runtime store show up in the live run list and the timeline', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        await waitFor('the runtime store to be writable', () => api.runtimeState(), (state) => state.kind === 'writable', { timeoutMs: 30_000 });
        const store = api.runtimeStore();
        assert.ok(store, 'the runtime store is open for the active project');
        const center = api.agentCenter();
        const listening = center.listen(() => undefined);
        try {
            const run = await store.createRun({ providerId: 'fake', spec: { stem: '0001-tip-splitter', path: '.specs/active/0001-tip-splitter.md' } });
            await store.reportStatus(run.runId, 'Running');
            await waitFor('the Agent Center to list the new run as Running', () => statusOf(center.view(), run.runId), (status) => status === 'Running', { timeoutMs: 20_000 });
            center.select(run.runId);
            await store.appendEvent(run.runId, { type: 'message.completed', payload: { source: 'provider', text: 'smoke message' } });
            await waitFor(
                'the timeline to hold the appended message',
                () => center.timeline()?.rows.map((row) => row.kind) ?? [],
                (kinds) => kinds.includes('Message'),
                { timeoutMs: 20_000 },
            );
            await store.reportStatus(run.runId, 'Failed');
            await waitFor('the run row to show Failed', () => statusOf(center.view(), run.runId), (status) => status === 'Failed', { timeoutMs: 20_000 });
        } finally {
            listening.dispose();
        }
    });
});
