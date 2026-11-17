import * as assert from 'assert';
import * as vscode from 'vscode';
import { snapshotTree } from '../core/discovery/testing/snapshotTree';
import { waitFor } from '../core/discovery/testing/waitFor';
import type { StudioApi } from '../extension';

async function activateStudio(): Promise<StudioApi> {
    const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
    assert.ok(extension, 'extension is installed in the test host');
    return (await extension.activate()) as StudioApi;
}

suite('FeatherSpec Studio runtime store smoke', function () {
    this.timeout(60_000);

    test('0004 AC-025: the store of the active project is writable, and the run commands are gone', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        await waitFor('the runtime store of the active project to be writable', () => api.runtimeState(), (state) => state.kind === 'writable', { timeoutMs: 30_000 });
        assert.deepStrictEqual(api.runtimeState(), { kind: 'writable', reason: undefined });
        const commands = await vscode.commands.getCommands(true);
        for (const removed of ['clearRunHistory', 'stopRun', 'resumeRun']) {
            assert.ok(!commands.includes(`featherspec-studio.${removed}`));
        }
    });

    test('0004 AC-016: appending a status history entry leaves the workspace fixture unchanged', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        await waitFor('the runtime store of the active project to be writable', () => api.runtimeState(), (state) => state.kind === 'writable', { timeoutMs: 30_000 });
        const folder = (vscode.workspace.workspaceFolders ?? []).find((candidate) => candidate.name === 'fs110-de-active-review');
        assert.ok(folder, 'fixture folder is part of the workspace');
        const before = await snapshotTree(folder.uri.fsPath);
        const store = api.runtimeStore();
        assert.ok(store, 'a store is open for the active project');
        await store.appendSpecStatusEntry('0001-smoke', { to: 'smoke' });
        const history = await store.readSpecStatusHistory('0001-smoke');
        assert.ok(history.available && history.value.length >= 1);
        assert.deepStrictEqual(await snapshotTree(folder.uri.fsPath), before);
    });
});
