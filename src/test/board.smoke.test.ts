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

const SPEC_KEY = '.specs/active/0001-tip-splitter.md';

suite('FeatherSpec Studio board smoke', function () {
    this.timeout(60_000);

    test('AC-014: the Move Spec command is registered', async () => {
        await activateStudio();
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('featherspec-studio.moveSpec'));
    });

    test('AC-001, AC-002: the board of the active project has six columns and the spec in Review', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        await waitFor(
            'the board to show 0001-tip-splitter on a card',
            () => api.board().view()?.columns.map((column) => `${column.state}: ${column.cards.map((card) => card.stem).join(', ')}`),
            (columns) => columns?.some((column) => column.includes('0001-tip-splitter')) === true,
            { timeoutMs: 20_000 },
        );
        const view = api.board().view();
        assert.deepStrictEqual(
            view?.columns.map((column) => column.state),
            ['Backlog', 'Ready', 'Active', 'Review', 'Done', 'Blocked'],
        );
        assert.strictEqual(view?.columns.find((column) => column.state === 'Review')?.cards[0]?.stem, '0001-tip-splitter');
    });

    test('AC-014, AC-016: a refused move says what the lifecycle says, and open, move and filter write nothing into the project', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const folder = (vscode.workspace.workspaceFolders ?? []).find((candidate) => candidate.name === 'fs110-de-active-review');
        assert.ok(folder, 'fixture folder is part of the workspace');
        const before = await snapshotTree(folder.uri.fsPath);
        const verdict = api.lifecycle().judgeTransition(SPEC_KEY, 'Active');
        assert.strictEqual(verdict.accepted, false);
        const result = await api.board().requestMove(SPEC_KEY, 'Active');
        assert.strictEqual(result.kind, 'refused');
        assert.strictEqual(result.kind === 'refused' ? result.text : '', verdict.accepted ? '' : verdict.text);
        api.board().setFilter({ states: ['Review'] });
        api.board().setFilter({});
        assert.deepStrictEqual(await snapshotTree(folder.uri.fsPath), before);
    });

    test('AC-010, AC-016: Open file opens the spec at the line, a key outside the model opens nothing', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const folder = (vscode.workspace.workspaceFolders ?? []).find((candidate) => candidate.name === 'fs110-de-active-review');
        assert.ok(folder, 'fixture folder is part of the workspace');
        const before = await snapshotTree(folder.uri.fsPath);
        assert.strictEqual(await api.board().openFile(SPEC_KEY, 5), 'opened');
        const editor = vscode.window.activeTextEditor;
        assert.ok(editor && editor.document.uri.fsPath.endsWith('0001-tip-splitter.md'));
        assert.strictEqual(editor.selection.active.line, 4);
        assert.strictEqual(await api.board().openFile('.specs/active/9999-none.md'), 'refused');
        assert.strictEqual(await api.board().openFile('../outside.md'), 'refused');
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        assert.deepStrictEqual(await snapshotTree(folder.uri.fsPath), before);
    });
});
