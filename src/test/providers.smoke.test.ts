import * as assert from 'assert';
import * as vscode from 'vscode';
import type { StudioApi } from '../extension';

async function activateStudio(): Promise<StudioApi> {
    const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
    assert.ok(extension, 'extension is installed in the test host');
    return (await extension.activate()) as StudioApi;
}

const ids = (api: StudioApi): string[] => api.providers().registry.list().map((entry) => entry.id);

suite('FeatherSpec Studio provider smoke', function () {
    this.timeout(60_000);

    teardown(async () => {
        await vscode.workspace.getConfiguration('featherspec-studio').update('fakeProvider.enabled', undefined, vscode.ConfigurationTarget.Global);
    });

    test('0009 AC-012: the fake provider is absent by default, present after switching on, gone after switching off, without a reload', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const configuration = vscode.workspace.getConfiguration('featherspec-studio');
        assert.deepStrictEqual(ids(api), ['copilot']);
        await configuration.update('fakeProvider.enabled', true, vscode.ConfigurationTarget.Global);
        await waitUntil(() => ids(api).includes('fake'));
        assert.strictEqual(api.providers().registry.list().find((entry) => entry.id === 'fake')?.displayName, 'Fake provider (no agent, no network)');
        await configuration.update('fakeProvider.enabled', false, vscode.ConfigurationTarget.Global);
        await waitUntil(() => !ids(api).includes('fake'));
    });
});

async function waitUntil(condition: () => boolean): Promise<void> {
    const deadline = Date.now() + 15_000;
    while (!condition()) {
        if (Date.now() > deadline) {
            assert.fail('the provider registry did not change in time');
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
}
