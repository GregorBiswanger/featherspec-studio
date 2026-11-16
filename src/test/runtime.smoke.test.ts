import * as assert from 'assert';
import * as vscode from 'vscode';
import { snapshotTree } from '../core/discovery/testing/snapshotTree';
import type { StudioApi } from '../extension';

async function waitFor(condition: () => boolean, timeoutMs: number): Promise<void> {
    const started = Date.now();
    while (!condition()) {
        if (Date.now() - started > timeoutMs) {
            throw new Error('Timed out waiting for the condition');
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
}

async function activateStudio(): Promise<StudioApi> {
    const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
    assert.ok(extension, 'extension is installed in the test host');
    return (await extension.activate()) as StudioApi;
}

suite('FeatherSpec Studio runtime store smoke', function () {
    this.timeout(90_000);

    test('0004 AC-025: the store of the active project is writable, and the clear command is registered', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        await waitFor(() => api.runtimeState().kind === 'writable', 70_000);
        assert.deepStrictEqual(api.runtimeState(), { kind: 'writable', reason: undefined });
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('featherspec-studio.clearRunHistory'));
    });

    test('0004 AC-016: storing a run and events leaves the workspace fixture unchanged', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        await waitFor(() => api.runtimeState().kind === 'writable', 70_000);
        const folder = (vscode.workspace.workspaceFolders ?? []).find((candidate) => candidate.name === 'fs110-de-active-review');
        assert.ok(folder, 'fixture folder is part of the workspace');
        const before = await snapshotTree(folder.uri.fsPath);
        const store = api.runtimeStore();
        assert.ok(store, 'a store is open for the active project');
        const run = await store.createRun({ providerId: 'smoke', spec: { stem: '0001-smoke', path: '.specs/active/0001-smoke.md' } });
        await store.appendEvent(run.runId, { type: 'message', payload: 'smoke event' });
        await store.reportStatus(run.runId, 'Completed');
        const page = await store.readEvents(run.runId, 1, 10);
        assert.ok(page.available && page.value.length === 1);
        assert.deepStrictEqual(await snapshotTree(folder.uri.fsPath), before);
    });
});
