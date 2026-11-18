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

suite('FeatherSpec Studio discovery smoke', function () {
    this.timeout(60_000);


    test('AC-019: activates on the fixture workspace and reports its folders without any command', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const folders = api.snapshot().result?.folders ?? [];
        const verdicts = new Map(folders.map((folder) => [folder.name, folder.verdict]));
        assert.strictEqual(verdicts.get('fs110-de-active-review'), 'project');
        assert.strictEqual(verdicts.get('incomplete-agents-only'), 'incomplete');
        assert.strictEqual(verdicts.get('not-fs-speckit'), 'not-a-project');
        assert.strictEqual(api.snapshot().active?.name, 'fs110-de-active-review');
    });

    test('AC-014, AC-016: registers both commands and the refresh command runs', async () => {
        await activateStudio();
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('featherspec-studio.selectProject'));
        assert.ok(commands.includes('featherspec-studio.refresh'));
        await vscode.commands.executeCommand('featherspec-studio.refresh');
    });

    test('AC-013: creating the missing .specs directory reruns discovery through the real watcher', async () => {
        const api = await activateStudio();
        const folder = (vscode.workspace.workspaceFolders ?? []).find((candidate) => candidate.name === 'incomplete-agents-only');
        assert.ok(folder, 'fixture folder is part of the workspace');
        await fs.mkdir(path.join(folder.uri.fsPath, '.specs'));
        await fs.writeFile(path.join(folder.uri.fsPath, '.specs', 'README.md'), '# Specs\n');
        await waitFor(
            'incomplete-agents-only to be recognised as a project',
            () => (api.snapshot().result?.folders ?? []).map((entry) => `${entry.name}: ${entry.verdict}`),
            (folders) => folders.includes('incomplete-agents-only: project'),
            { timeoutMs: 20_000 },
        );
        await api.whenIdle();
        assert.strictEqual(api.snapshot().active?.name, 'fs110-de-active-review');
    });
});
