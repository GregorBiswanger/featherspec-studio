import * as assert from 'assert';
import * as vscode from 'vscode';
import { waitFor } from '../../core/discovery/testing/waitFor';
import type { StudioApi } from '../../extension';

function studio(): vscode.Extension<StudioApi> {
    const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
    assert.ok(extension, 'extension is installed in the test host');
    return extension as vscode.Extension<StudioApi>;
}

suite('FeatherSpec Studio activation: a workspace whose only marker is .specs/', function () {
    this.timeout(60_000);

    test('AC-019: activates by workspaceContains:.specs without any command and reports the folder as incomplete', async () => {
        const extension = studio();
        await waitFor('the extension to activate on its own', () => extension.isActive, (active) => active, { timeoutMs: 20_000 });
        const api = extension.exports;
        await api.whenIdle();
        const folders = (api.snapshot().result?.folders ?? []).map((folder) => `${folder.name}: ${folder.verdict}`);
        assert.deepStrictEqual(folders, ['incomplete-specs-only: incomplete']);
        assert.strictEqual(api.snapshot().active, undefined);
    });
});
