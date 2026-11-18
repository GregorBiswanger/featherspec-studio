import * as assert from 'assert';
import * as vscode from 'vscode';
import { waitFor } from '../core/discovery/testing/waitFor';
import type { StudioApi } from '../extension';

async function activateStudio(): Promise<StudioApi> {
    const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
    assert.ok(extension, 'extension is installed in the test host');
    return (await extension.activate()) as StudioApi;
}

suite('FeatherSpec Studio copy next step smoke', function () {
    this.timeout(60_000);

    test('0017 AC-009: the Copy Next Step command is registered and the move command is not', async () => {
        await activateStudio();
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('featherspec-studio.copyNextStep'));
        assert.ok(!commands.includes('featherspec-studio.moveSpec'));
    });

    test('0017 AC-014, AC-016: the status bar item of the active project names its current spec and a click runs Copy Next Step', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const item = await waitFor(
            'the status bar item to name 0001 in Review',
            () => api.statusEntry().inspect(),
            (current) => current.visible && current.text.includes('0001 · Review'),
            { timeoutMs: 20_000 },
        );
        assert.strictEqual(item.text, '$(checklist) 0001 · Review · /sdd-compile');
        assert.strictEqual(item.command, 'featherspec-studio.copyNextStep');
        assert.ok(item.tooltip.includes('Click to copy the next step'));
        assert.strictEqual(item.accessibleLabel, '0001, Review, /sdd-compile. Click to copy the next step.');
        await vscode.commands.executeCommand('featherspec-studio.copyNextStep');
        const feedback = api.statusEntry().inspect().text;
        assert.ok(feedback === '$(check) Copied' || feedback === '$(warning) Could not copy', `feedback was ${feedback}`);
    });
});
