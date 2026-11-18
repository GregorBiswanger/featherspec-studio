import * as assert from 'assert';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { snapshotTree } from '../core/discovery/testing/snapshotTree';
import { waitFor } from '../core/discovery/testing/waitFor';
import type { StudioApi } from '../extension';

const VIEW_TYPE = 'featherspecStudio.main';
const WAIT_MS = 20_000;

function panelState(api: StudioApi): { panels: number; tabs: number; area: string; rows: number; helloAt: number | undefined } {
    const view = api.shell().view();
    return { panels: api.shell().panelCount(), tabs: studioTabs().length, area: view.area, rows: view.rows.length, helloAt: api.shell().lastHelloAt() };
}

async function activateStudio(): Promise<StudioApi> {
    const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
    assert.ok(extension, 'extension is installed in the test host');
    return (await extension.activate()) as StudioApi;
}

function studioTabs(): vscode.Tab[] {
    return vscode.window.tabGroups.all
        .flatMap((group) => group.tabs)
        .filter((tab) => tab.input instanceof vscode.TabInputWebview && tab.input.viewType.endsWith(VIEW_TYPE));
}

const CLOSE_FALLBACK_MS = 5_000;

async function closeStudio(api: StudioApi): Promise<void> {
    const started = Date.now();
    await waitFor(
        'the Studio panel to close',
        () => {
            const state = panelState(api);
            if (state.panels > 0 || state.tabs > 0) {
                if (Date.now() - started >= CLOSE_FALLBACK_MS) {
                    api.shell().closePanel();
                }
                void Promise.all(studioTabs().map((tab) => vscode.window.tabGroups.close(tab))).catch(() => undefined);
            }
            return state;
        },
        (state) => state.panels === 0 && state.tabs === 0,
        { timeoutMs: WAIT_MS },
    );
}

suite('FeatherSpec Studio shell smoke', function () {
    this.timeout(60_000);

    // The first webview of a VS Code window loads its service worker. On a slow machine (windows-latest) a panel
    // that is closed before that first load ended left every later webview of the window without content, so the
    // suite lets the first one finish loading before the open/close tests start.
    suiteSetup(async function () {
        this.timeout(150_000);
        const api = await activateStudio();
        await api.whenIdle();
        await vscode.commands.executeCommand('featherspec-studio.open');
        await waitFor('the first Studio webview of this window to load and say hello (warm-up)', () => panelState(api), (state) => state.helloAt !== undefined, { timeoutMs: 120_000 });
        await closeStudio(api);
    });

    teardown(async () => {
        const api = await activateStudio();
        await closeStudio(api);
    });

    test('AC-001: the Open command shows the Studio panel in the editor area', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        await vscode.commands.executeCommand('featherspec-studio.open');
        await waitFor('exactly one Studio tab', () => panelState(api), (state) => state.tabs === 1, { timeoutMs: WAIT_MS });
        assert.strictEqual(api.shell().panelCount(), 1);
    });

    test('AC-002: running Open twice leaves one Studio tab', async () => {
        const api = await activateStudio();
        await vscode.commands.executeCommand('featherspec-studio.open');
        await vscode.commands.executeCommand('featherspec-studio.open');
        await waitFor('at least one Studio tab', () => panelState(api), (state) => state.tabs >= 1, { timeoutMs: WAIT_MS });
        assert.strictEqual(studioTabs().length, 1);
        assert.strictEqual(api.shell().panelCount(), 1);
    });

    test('AC-005: a per-area command opens the closed panel on that area', async () => {
        const api = await activateStudio();
        await closeStudio(api);
        await vscode.commands.executeCommand('featherspec-studio.openBoard');
        await waitFor('exactly one Studio tab', () => panelState(api), (state) => state.tabs === 1, { timeoutMs: WAIT_MS });
        assert.strictEqual(api.shell().view().area, 'board');
        await vscode.commands.executeCommand('featherspec-studio.openOverview');
        assert.strictEqual(api.shell().view().area, 'overview');
        assert.strictEqual(studioTabs().length, 1);
    });

    test('AC-009: the serializer adopts a fresh panel on the remembered area and selection', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        await vscode.commands.executeCommand('featherspec-studio.openSpecExplorer');
        await waitFor('the Spec Explorer to list a spec row', () => panelState(api), (state) => state.rows > 0, { timeoutMs: WAIT_MS });
        const stem = api.shell().view().rows[0]?.stem;
        assert.ok(stem, 'the fixture project has a spec');
        await api.shell().select(stem);
        await closeStudio(api);
        const before = api.shell().lastHelloAt() ?? 0;
        const restored = vscode.window.createWebviewPanel(VIEW_TYPE, 'FeatherSpec Studio', vscode.ViewColumn.Active, { enableScripts: true });
        await api.shell().restore(restored);
        await waitFor('the restored panel to say hello', () => ({ ...panelState(api), before }), (state) => (state.helloAt ?? 0) > before, { timeoutMs: WAIT_MS });
        assert.strictEqual(api.shell().panelCount(), 1);
        assert.strictEqual(api.shell().view().area, 'specExplorer');
        assert.strictEqual(api.shell().view().selection?.stem, stem);
    });

    test('AC-020: the panel is limited to dist/webview, ships the CSP, and a workspace file cannot be loaded by path', async () => {
        const api = await activateStudio();
        await vscode.commands.executeCommand('featherspec-studio.open');
        await waitFor('the Studio tab and its hello', () => panelState(api), (state) => state.helloAt !== undefined && state.tabs === 1, { timeoutMs: WAIT_MS });
        const inspected = api.shell().inspect();
        assert.ok(inspected);
        assert.deepStrictEqual(inspected.icon, { light: 'studio-light.svg', dark: 'studio-dark.svg' }, 'PD-054: the editor tab shows the logo mark');
        assert.strictEqual(inspected.options.enableScripts, true);
        assert.strictEqual(inspected.options.enableCommandUris, false);
        assert.strictEqual(inspected.panelOptions.retainContextWhenHidden ?? false, false);
        const roots = inspected.options.localResourceRoots ?? [];
        assert.strictEqual(roots.length, 1);
        assert.ok(roots[0]?.path.endsWith('/dist/webview'));
        assert.ok(inspected.html.includes("default-src 'none'"));
        assert.ok(!inspected.html.includes('connect-src'));
        const folder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(folder);
        const uri = api.shell().asWebviewUri(vscode.Uri.joinPath(folder.uri, 'AGENTS.md'));
        assert.ok(uri);
        assert.strictEqual(await api.shell().probe(uri), 'failed');
    });

    test('AC-024: the command reaches the panel UI within 1000 ms with the extension already active', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        // Best of three, like the unit timing tests: the budget is the decision, one stall of the machine is not.
        const measured: number[] = [];
        for (let attempt = 0; attempt < 3; attempt += 1) {
            await closeStudio(api);
            const started = Date.now();
            await vscode.commands.executeCommand('featherspec-studio.open');
            await waitFor('the reopened panel to say hello', () => ({ ...panelState(api), started }), (state) => (state.helloAt ?? 0) >= started, { timeoutMs: WAIT_MS });
            measured.push((api.shell().lastHelloAt() ?? Date.now()) - started);
        }
        assert.ok(Math.min(...measured) < 1000, `the first message arrived after ${measured.join(', ')} ms in three attempts`);
    });

    test('AC-019: the tree holds the group In progress with the one spec in Review, the badge 1 and no view description; every command of AC-011 is registered', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        await waitFor('the tree to show the group', () => api.shell().tree().items.map((item) => item.label), (labels) => labels.length === 1, { timeoutMs: WAIT_MS });
        const tree = api.shell().tree();
        const [group] = tree.items;
        assert.ok(group?.kind === 'group');
        assert.strictEqual(group.label, 'In progress');
        assert.strictEqual(group.description, '1');
        assert.deepStrictEqual(
            group.children.map((row) => [row.label, row.description]),
            [['0001 Restaurant-Rechnung mit…', 'Review · /sdd-compile']],
        );
        assert.deepStrictEqual(tree.badge, { value: 1, tooltip: '1 spec waits for you: 1 in Review' });
        assert.strictEqual(tree.description, undefined);
        assert.strictEqual(tree.message, undefined);
        const registered = await vscode.commands.getCommands(true);
        for (const command of [
            'featherspec-studio.open',
            'featherspec-studio.openOverview',
            'featherspec-studio.openBoard',
            'featherspec-studio.openSpecExplorer',
            'featherspec-studio.refresh',
            'featherspec-studio.shellAction',
            'featherspec-studio.selectProject',
            'featherspec-studio.selectSpec',
            'featherspec-studio.tree.copyNextStep',
            'featherspec-studio.tree.openSpec',
            'featherspec-studio.tree.openPlan',
            'workbench.trust.manage',
            'vscode.openFolder',
        ]) {
            assert.ok(registered.includes(command), `${command} is registered`);
        }
    });

    test('AC-009 (0020): the row command opens a closed panel with that spec selected', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        await closeStudio(api);
        await vscode.commands.executeCommand('featherspec-studio.selectSpec', { stem: '0001-tip-splitter' });
        await waitFor('one Studio tab with the spec selected', () => ({ ...panelState(api), stem: api.shell().view().selection?.stem }), (state) => state.tabs === 1 && state.stem === '0001-tip-splitter', { timeoutMs: WAIT_MS });
        assert.strictEqual(api.shell().panelCount(), 1);
    });

    test('AC-013 (0020): a backlog spec added to the project shows in the group Backlog and goes with its removal', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const folder = vscode.workspace.workspaceFolders?.find((candidate) => candidate.name === 'fs110-de-active-review');
        assert.ok(folder);
        const file = path.join(folder.uri.fsPath, '.specs', 'backlog', '0099-tree-smoke.md');
        const backlog = () => api.shell().tree().items.flatMap((item) => (item.kind === 'group' && item.label === 'Backlog' ? item.children.map((row) => row.label) : []));
        let failure: unknown;
        try {
            await fs.writeFile(file, '# Tree smoke\n\n**Status:** Draft\n', 'utf8');
            await waitFor('the new spec in the group Backlog', backlog, (labels) => labels.includes('0099 Tree smoke'), { timeoutMs: WAIT_MS });
        } catch (error) {
            failure = error;
        }
        await fs.rm(file, { force: true });
        try {
            await waitFor('the group Backlog to go with the file', backlog, (labels) => labels.length === 0, { timeoutMs: WAIT_MS });
        } catch (error) {
            failure ??= error;
        }
        if (failure !== undefined) {
            throw failure;
        }
    });

    test('0019 P-6: the internal command selects a spec, shows one panel and keeps the area', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        await closeStudio(api);
        await vscode.commands.executeCommand('featherspec-studio.openBoard');
        await waitFor('exactly one Studio tab', () => panelState(api), (state) => state.tabs === 1, { timeoutMs: WAIT_MS });
        assert.ok((await vscode.commands.getCommands(true)).includes('featherspec-studio.selectSpec'), 'the command is registered');
        await vscode.commands.executeCommand('featherspec-studio.selectSpec', { stem: '0001-tip-splitter' });
        assert.strictEqual(api.shell().view().selection?.stem, '0001-tip-splitter');
        assert.strictEqual(api.shell().view().area, 'board');
        assert.strictEqual(api.shell().panelCount(), 1);
        assert.strictEqual(studioTabs().length, 1);
        await vscode.commands.executeCommand('featherspec-studio.selectSpec', { stem: 4 });
        assert.strictEqual(api.shell().view().selection?.stem, '0001-tip-splitter');
    });

    test('0018 AC-027: the Refresh command runs while a project is active and changes no file', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const folder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(folder);
        const before = await snapshotTree(folder.uri.fsPath);
        await vscode.commands.executeCommand('featherspec-studio.refresh');
        assert.deepStrictEqual(await snapshotTree(folder.uri.fsPath), before);
    });

    test('AC-025: no file in any workspace folder changes while the Studio is opened, navigated, closed, reopened and restored', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const folders = vscode.workspace.workspaceFolders ?? [];
        assert.ok(folders.length > 0);
        const before = await Promise.all(folders.map((folder) => snapshotTree(folder.uri.fsPath)));
        await vscode.commands.executeCommand('featherspec-studio.open');
        await waitFor('the Studio tab and its hello', () => panelState(api), (state) => state.helloAt !== undefined && state.tabs === 1, { timeoutMs: WAIT_MS });
        await vscode.commands.executeCommand('featherspec-studio.openBoard');
        await vscode.commands.executeCommand('featherspec-studio.openSpecExplorer');
        await closeStudio(api);
        await vscode.commands.executeCommand('featherspec-studio.open');
        await waitFor('exactly one Studio tab', () => panelState(api), (state) => state.tabs === 1, { timeoutMs: WAIT_MS });
        await closeStudio(api);
        const restored = vscode.window.createWebviewPanel(VIEW_TYPE, 'FeatherSpec Studio', vscode.ViewColumn.Active, { enableScripts: true });
        await api.shell().restore(restored);
        await waitFor('the restored panel to be adopted', () => panelState(api), (state) => state.panels === 1, { timeoutMs: WAIT_MS });
        await new Promise((resolve) => setTimeout(resolve, 500));
        const after = await Promise.all(folders.map((folder) => snapshotTree(folder.uri.fsPath)));
        assert.deepStrictEqual(after, before);
    });
});
