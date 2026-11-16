import * as assert from 'assert';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { StudioApi } from '../extension';

async function waitFor(condition: () => boolean, timeoutMs: number): Promise<void> {
    const started = Date.now();
    while (!condition()) {
        if (Date.now() - started > timeoutMs) {
            throw new Error('Timed out waiting for the condition');
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
}

async function activateStudio(): Promise<StudioApi> {
    const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
    assert.ok(extension, 'extension is installed in the test host');
    return (await extension.activate()) as StudioApi;
}

suite('FeatherSpec Studio spec repository smoke', () => {
    test('AC-012, AC-022: the active project is read and a file written into it reaches the model through the real watcher', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const repository = api.specs();
        await waitFor(() => repository.snapshot()?.specs.some((entry) => entry.reference === '0001-tip-splitter') === true, 10000);
        const folder = (vscode.workspace.workspaceFolders ?? []).find((candidate) => candidate.name === 'fs110-de-active-review');
        assert.ok(folder, 'fixture folder is part of the workspace');
        const added = path.join(folder.uri.fsPath, '.specs', 'backlog', '0002-smoke-added.md');
        await fs.writeFile(added, '# Added by the smoke test\n\n**Status:** Draft\n**Plan:** _none yet_\n');
        try {
            await waitFor(() => repository.snapshot()?.specs.some((entry) => entry.reference === '0002-smoke-added') === true, 10000);
            assert.strictEqual(
                repository.snapshot()?.specs.find((entry) => entry.reference === '0002-smoke-added')?.parsed?.title.value.state,
                'value',
            );
        } finally {
            await fs.rm(added, { force: true });
        }
        await waitFor(() => repository.snapshot()?.specs.some((entry) => entry.reference === '0002-smoke-added') === false, 10000);
    });
});
