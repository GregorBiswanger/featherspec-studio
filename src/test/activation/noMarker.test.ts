import * as assert from 'assert';
import * as vscode from 'vscode';

suite('FeatherSpec Studio activation: a workspace without any marker', function () {
    this.timeout(60_000);

    test('AC-019 negative control: stays inactive while no folder has AGENTS.md or .specs/ and no Studio command runs', async () => {
        const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
        assert.ok(extension, 'extension is installed in the test host');
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        assert.strictEqual(extension.isActive, false);
    });
});
