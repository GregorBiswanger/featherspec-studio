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

suite('FeatherSpec Studio discovery smoke', () => {
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
        assert.ok(commands.includes('featherspec-studio.refreshDiscovery'));
        await vscode.commands.executeCommand('featherspec-studio.refreshDiscovery');
    });

    test('AC-013: creating the missing .specs directory reruns discovery through the real watcher', async () => {
        const api = await activateStudio();
        const folder = (vscode.workspace.workspaceFolders ?? []).find((candidate) => candidate.name === 'incomplete-agents-only');
        assert.ok(folder, 'fixture folder is part of the workspace');
        await fs.mkdir(path.join(folder.uri.fsPath, '.specs'));
        await fs.writeFile(path.join(folder.uri.fsPath, '.specs', 'README.md'), '# Specs\n');
        await waitFor(
            () =>
                (api.snapshot().result?.folders ?? []).find((entry) => entry.name === 'incomplete-agents-only')?.verdict ===
                'project',
            10000,
        );
        await api.whenIdle();
        assert.strictEqual(api.snapshot().active?.name, 'fs110-de-active-review');
    });
});
