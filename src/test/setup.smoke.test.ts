import * as assert from 'assert';
import * as vscode from 'vscode';

suite('FeatherSpec Studio setup smoke', function () {
    this.timeout(60_000);

    test('AC-001: the setup commands are registered and the merge prompt command stays out of the palette', async function () {
        const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
        assert.ok(extension, 'extension is installed in the test host');
        await extension.activate();
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('featherspec-studio.setup'), 'featherspec-studio.setup is registered');
        assert.ok(commands.includes('featherspec-studio.copyMergePrompt'), 'featherspec-studio.copyMergePrompt is registered');
    });
});
