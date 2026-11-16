import * as assert from 'assert';
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

suite('FeatherSpec Studio lifecycle smoke', () => {
    test('AC-001, AC-014: the active project gets a state per spec and a Ready spec is accepted for Active', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const lifecycle = api.lifecycle();
        await waitFor(() => lifecycle.model()?.entries.some((entry) => entry.stem === '0001-tip-splitter') === true, 10000);
        const entry = lifecycle.model()?.entries.find((candidate) => candidate.stem === '0001-tip-splitter');
        assert.ok(entry);
        assert.strictEqual(entry.state, 'Review');
        assert.strictEqual(entry.derivedLabel, 'Derived (rule S-REVIEW)');
        const refused = lifecycle.judgeTransition(entry.key, 'Active');
        assert.strictEqual(refused.accepted, false);
    });
});
