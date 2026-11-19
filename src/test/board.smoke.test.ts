import * as assert from 'assert';
import * as vscode from 'vscode';
import { snapshotTree } from '../core/discovery/testing/snapshotTree';
import { waitFor } from '../core/discovery/testing/waitFor';
import { createAssistantHost } from '../adapters/vscode/assistantHost';
import type { StudioApi } from '../extension';

async function activateStudio(): Promise<StudioApi> {
    const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
    assert.ok(extension, 'extension is installed in the test host');
    return (await extension.activate()) as StudioApi;
}

const SPEC_KEY = '.specs/active/0001-tip-splitter.md';

suite('FeatherSpec Studio board smoke', function () {
    this.timeout(60_000);

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

    test('AC-016: filter changes write nothing into the project', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const folder = (vscode.workspace.workspaceFolders ?? []).find((candidate) => candidate.name === 'fs110-de-active-review');
        assert.ok(folder, 'fixture folder is part of the workspace');
        const before = await snapshotTree(folder.uri.fsPath);
        api.board().setFilter({ states: ['Review'] });
        api.board().setFilter({});
        assert.deepStrictEqual(await snapshotTree(folder.uri.fsPath), before);
    });

    test('0018 AC-016, AC-028: the Done choice writes nothing into the project and a collapsed Done holds no card', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const folder = (vscode.workspace.workspaceFolders ?? []).find((candidate) => candidate.name === 'fs110-de-active-review');
        assert.ok(folder, 'fixture folder is part of the workspace');
        const before = await snapshotTree(folder.uri.fsPath);
        api.board().setDone(true);
        api.board().setDone(false);
        const done = api.board().view()?.columns.find((column) => column.state === 'Done');
        assert.ok(done !== undefined && done.cards.length === 0);
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

    test('0019 AC-018: a file opens beside the Studio at the line; the Studio stays visible in its group', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        await vscode.commands.executeCommand('featherspec-studio.open');
        await waitFor('the Studio tab', () => studioTabs().length, (count) => count === 1, { timeoutMs: 30_000 });
        const before = studioTabs()[0];
        assert.ok(before, 'the Studio tab exists');
        const studioColumn = before.group.viewColumn;
        assert.strictEqual(await api.board().openFile(SPEC_KEY, 94), 'opened');
        const editor = vscode.window.activeTextEditor;
        assert.ok(editor && editor.document.uri.fsPath.endsWith('0001-tip-splitter.md'));
        assert.notStrictEqual(editor.viewColumn, studioColumn, 'the editor is in another group than the Studio');
        assert.strictEqual(editor.selection.active.line, 93);
        assert.strictEqual(editor.selection.active.character, 0);
        await waitFor('the line to be visible', () => editor.visibleRanges.map((range) => `${range.start.line}-${range.end.line}`), () => editor.visibleRanges.some((range) => range.start.line <= 93 && range.end.line >= 93), { timeoutMs: 10_000 });
        const after = studioTabs()[0];
        assert.ok(after, 'the Studio tab is still open');
        assert.strictEqual(after.group.viewColumn, studioColumn);
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    });

    test('0021 AC-016, AC-011: both settings are contributed with their defaults, and switching Show Step Tips off drops the coach line from the detail promptly, within 2 s including the settings write (the 500 ms budget is decided by the timing tests)', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const configuration = vscode.workspace.getConfiguration('featherspec-studio');
        assert.strictEqual(configuration.inspect('showStepTips')?.defaultValue, true);
        assert.deepStrictEqual(configuration.inspect('modelHints')?.defaultValue, {});
        await api.shell().select('0001-tip-splitter');
        const tipsOf = () => {
            const detail = api.board().detail();
            return detail.kind === 'spec' && 'tips' in detail.nextStep ? detail.nextStep.tips : undefined;
        };
        try {
            await configuration.update('showStepTips', true, vscode.ConfigurationTarget.Global);
            await waitFor('the coach line', tipsOf, (tips) => tips !== undefined, { timeoutMs: 5_000 });
            const started = Date.now();
            await configuration.update('showStepTips', false, vscode.ConfigurationTarget.Global);
            await waitFor('the coach line to go', tipsOf, (tips) => tips === undefined, { timeoutMs: 5_000 });
            assert.ok(Date.now() - started < 2_000, 'the change reaches the detail');
        } finally {
            await configuration.update('showStepTips', undefined, vscode.ConfigurationTarget.Global);
        }
    });

    test('0024 AC-001, AC-002, AC-013: the assistant setting is contributed with default none; choosing an assistant that is not installed offers no Send; Open Settings resolves; the real host sees its own extension and not another', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const configuration = vscode.workspace.getConfiguration('featherspec-studio');
        assert.strictEqual(configuration.inspect('assistant')?.defaultValue, 'none');
        assert.ok((await vscode.commands.getCommands(true)).includes('featherspec-studio.openSettings'));
        await vscode.commands.executeCommand('featherspec-studio.openSettings');
        await api.shell().select('0001-tip-splitter');
        const sendOf = () => {
            const detail = api.board().detail();
            return detail.kind === 'spec' && 'send' in detail.nextStep ? detail.nextStep.send : undefined;
        };
        const host = createAssistantHost();
        assert.strictEqual(host.extension('GitHub.copilot-chat'), undefined, 'the test host has no chat extension');
        assert.notStrictEqual(host.extension('GregorBiswanger.featherspec-studio'), undefined);
        try {
            await configuration.update('assistant', 'copilot', vscode.ConfigurationTarget.Global);
            await api.whenIdle();
            await new Promise((resolve) => setTimeout(resolve, 500));
            assert.strictEqual(sendOf(), undefined);
        } finally {
            await configuration.update('assistant', undefined, vscode.ConfigurationTarget.Global);
        }
        const received: unknown[][] = [];
        const registration = vscode.commands.registerCommand('featherspec-studio.test.assistantProbe', (...args: unknown[]) => void received.push(args));
        try {
            assert.ok((await host.commands()).includes('featherspec-studio.test.assistantProbe'));
            await host.execute('featherspec-studio.test.assistantProbe', [undefined, 'line']);
            assert.deepStrictEqual(received, [[undefined, 'line']]);
        } finally {
            registration.dispose();
        }
    });
});

function studioTabs(): vscode.Tab[] {
    return vscode.window.tabGroups.all
        .flatMap((group) => group.tabs)
        .filter((tab) => tab.input instanceof vscode.TabInputWebview && tab.input.viewType.endsWith('featherspecStudio.main'));
}
