import * as assert from 'assert';
import * as vscode from 'vscode';
import { waitFor } from '../../core/discovery/testing/waitFor';
import { panelStateActions } from '../../shared/protocol/texts';
import type { StudioApi } from '../../extension';

const WAIT_MS = 30_000;

suite('FeatherSpec Studio setup: a marker-free workspace only observes the offer, runs no setup, downloads and writes nothing', function () {
    this.timeout(90_000);

    test('AC-001, AC-002: the tree shows the S2 welcome and the first panel action is Set up FeatherSpec', async function () {
        const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
        assert.ok(extension, 'extension is installed in the test host');
        const api = (await extension.activate()) as StudioApi;
        await api.whenIdle();
        const observed = await waitFor(
            'the shell to show S2',
            () => ({ welcome: api.shell().tree().welcome, state: api.shell().view().state?.id }),
            (value) => value.welcome === 'S2' && value.state === 'S2',
            { timeoutMs: WAIT_MS },
        );
        assert.strictEqual(observed.welcome, 'S2');
        const state = api.shell().view().state;
        assert.ok(state, 'the panel state is known');
        assert.strictEqual(panelStateActions(state)[0], 'setUp');
        assert.deepStrictEqual(api.shell().tree().items, []);
    });
});
