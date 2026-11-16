import * as assert from 'assert';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { waitFor } from '../core/discovery/testing/waitFor';
import type { StudioApi } from '../extension';

async function activateStudio(): Promise<StudioApi> {
    const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
    assert.ok(extension, 'extension is installed in the test host');
    return (await extension.activate()) as StudioApi;
}

suite('FeatherSpec Studio spec repository smoke', function () {
    this.timeout(60_000);


    test('AC-012, AC-022: the active project is read and a file written into it reaches the model through the real watcher', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const repository = api.specs();
        await waitFor('the repository to list 0001-tip-splitter', () => repository.snapshot()?.specs.map((entry) => entry.reference), (references) => (references?.includes('0001-tip-splitter') === true) === true, { timeoutMs: 20_000 });
        const folder = (vscode.workspace.workspaceFolders ?? []).find((candidate) => candidate.name === 'fs110-de-active-review');
        assert.ok(folder, 'fixture folder is part of the workspace');
        const added = path.join(folder.uri.fsPath, '.specs', 'backlog', '0002-smoke-added.md');
        await fs.writeFile(added, '# Added by the smoke test\n\n**Status:** Draft\n**Plan:** _none yet_\n');
        try {
            await waitFor('the repository to list 0002-smoke-added', () => repository.snapshot()?.specs.map((entry) => entry.reference), (references) => (references?.includes('0002-smoke-added') === true) === true, { timeoutMs: 20_000 });
            assert.strictEqual(
                repository.snapshot()?.specs.find((entry) => entry.reference === '0002-smoke-added')?.parsed?.title.value.state,
                'value',
            );
        } finally {
            await fs.rm(added, { force: true });
        }
        await waitFor('the repository to drop 0002-smoke-added', () => repository.snapshot()?.specs.map((entry) => entry.reference), (references) => (references?.includes('0002-smoke-added') === true) === false, { timeoutMs: 20_000 });
    });
});
