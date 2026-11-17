import * as assert from 'assert';
import * as vscode from 'vscode';
import { snapshotTree } from '../core/discovery/testing/snapshotTree';
import { waitFor } from '../core/discovery/testing/waitFor';
import type { StudioApi } from '../extension';

async function activateStudio(): Promise<StudioApi> {
    const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
    assert.ok(extension, 'extension is installed in the test host');
    return (await extension.activate()) as StudioApi;
}

const STEM = '0001-tip-splitter';
const KEY = '.specs/active/0001-tip-splitter.md';

suite('FeatherSpec Studio agent start smoke', function () {
    this.timeout(120_000);

    test('0008: the default-provider setting is declared with the value copilot', async () => {
        await activateStudio();
        const inspected = vscode.workspace.getConfiguration('featherspec-studio').inspect<string>('defaultProvider');
        assert.strictEqual(inspected?.defaultValue, 'copilot');
    });

    test('0008 AC-001, AC-012: a hand-off for the fixture spec is refused with P-1 and P-2, no confirmation opens, no run is created and the project tree is unchanged', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const folder = (vscode.workspace.workspaceFolders ?? []).find((candidate) => candidate.name === 'fs110-de-active-review');
        assert.ok(folder, 'fixture folder is part of the workspace');
        await waitFor('the runtime store of the active project to be writable', () => api.runtimeState(), (state) => state.kind === 'writable', { timeoutMs: 30_000 });
        const before = await snapshotTree(folder.uri.fsPath);
        const runsBefore = await api.runtimeStore()?.listRuns();
        api.agentStart().handOff(STEM, KEY);
        const view = await waitFor(
            'the start flow to refuse the hand-off with P-1 and P-2',
            () => api.agentStart().view(),
            (observed) => observed.refusal !== undefined,
            { timeoutMs: 60_000 },
        );
        await api.agentStart().whenIdle();
        const ids = view.refusal?.items.map((item) => item.id) ?? [];
        assert.ok(ids.includes('P-1'), `P-1 in ${JSON.stringify(ids)}`);
        assert.ok(ids.includes('P-2'), `P-2 in ${JSON.stringify(ids)}`);
        assert.strictEqual(api.agentStart().view().confirmation, undefined);
        const runsAfter = await api.runtimeStore()?.listRuns();
        assert.deepStrictEqual(runsAfter?.available ? runsAfter.value.length : -1, runsBefore?.available ? runsBefore.value.length : -1);
        assert.deepStrictEqual(await snapshotTree(folder.uri.fsPath), before);
    });
});
