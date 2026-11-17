import * as assert from 'assert';
import * as vscode from 'vscode';
import { waitFor } from '../core/discovery/testing/waitFor';
import type { StudioApi } from '../extension';

async function activateStudio(): Promise<StudioApi> {
    const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
    assert.ok(extension, 'extension is installed in the test host');
    return (await extension.activate()) as StudioApi;
}

suite('FeatherSpec Studio orchestrator smoke', function () {
    this.timeout(120_000);

    teardown(async () => {
        await vscode.workspace.getConfiguration('featherspec-studio').update('fakeProvider.enabled', undefined, vscode.ConfigurationTarget.Global);
    });

    test('0011 AC-022: the Stop Run and Resume Run commands are registered', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('featherspec-studio.stopRun'));
        assert.ok(commands.includes('featherspec-studio.resumeRun'));
    });

    test('0011 AC-001: with the fake provider enabled, a start on the fixture project reaches Completed in the store', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        await waitFor('the runtime store of the active project to be writable', () => api.runtimeState(), (state) => state.kind === 'writable', { timeoutMs: 30_000 });
        await vscode.workspace.getConfiguration('featherspec-studio').update('fakeProvider.enabled', true, vscode.ConfigurationTarget.Global);
        await waitFor('the fake provider to be registered', () => api.providers().registry.list().map((entry) => entry.id), (ids) => ids.includes('fake'), { timeoutMs: 15_000 });
        const folder = (vscode.workspace.workspaceFolders ?? []).find((candidate) => candidate.name === 'fs110-de-active-review');
        assert.ok(folder, 'fixture folder is part of the workspace');
        const started = await api.orchestrator().start({
            stem: '0001-smoke',
            path: '.specs/active/0001-smoke.md',
            providerId: 'fake',
            model: 'not available',
            prompt: 'Smoke run.',
            workingDirectory: folder.uri.fsPath,
        });
        assert.strictEqual(started.kind, 'started');
        const runId = started.kind === 'started' ? started.runId : '';
        const store = api.runtimeStore();
        assert.ok(store, 'a store is open for the active project');
        const deadline = Date.now() + 60_000;
        let last = 'nothing observed yet';
        while (last !== 'Completed') {
            const found = await store.getRun(runId);
            last = found.available ? (found.value?.status ?? 'run not found') : `store unavailable: ${found.reason}`;
            if (last !== 'Completed' && Date.now() > deadline) {
                assert.fail(`run ${runId} did not reach Completed in time; last status: ${last}`);
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        assert.strictEqual(last, 'Completed');
    });
});
