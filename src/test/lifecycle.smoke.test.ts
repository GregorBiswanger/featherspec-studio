import * as assert from 'assert';
import * as vscode from 'vscode';
import { waitFor } from '../core/discovery/testing/waitFor';
import type { StudioApi } from '../extension';

async function activateStudio(): Promise<StudioApi> {
    const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
    assert.ok(extension, 'extension is installed in the test host');
    return (await extension.activate()) as StudioApi;
}

suite('FeatherSpec Studio lifecycle smoke', function () {
    this.timeout(60_000);


    test('AC-001: the active project gets a state per spec', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const lifecycle = api.lifecycle();
        await waitFor('the lifecycle model to list 0001-tip-splitter', () => lifecycle.model()?.entries.map((entry) => entry.stem), (stems) => stems?.includes('0001-tip-splitter') === true, { timeoutMs: 20_000 });
        const entry = lifecycle.model()?.entries.find((candidate) => candidate.stem === '0001-tip-splitter');
        assert.ok(entry);
        assert.strictEqual(entry.state, 'Review');
        assert.strictEqual(entry.derivedLabel, 'Derived (rule S-REVIEW)');
    });
});
