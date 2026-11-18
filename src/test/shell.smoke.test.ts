import * as assert from 'assert';
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

    test('AC-003, AC-029: the tree shows the project name and the five entries; every shell command is registered', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        await waitFor('the tree to show five items', () => api.shell().tree().items.map((item) => item.label), (labels) => labels.length === 5, { timeoutMs: WAIT_MS });
        assert.deepStrictEqual(
            api.shell().tree().items.map((item) => item.label),
            ['fs110-de-active-review', 'Open Studio', 'Overview', 'Board', 'Spec Explorer'],
        );
        assert.deepStrictEqual(
            api.shell().tree().items.map((item) => item.icon),
            ['folder', 'window', 'dashboard', 'layout', 'list-tree'],
            'PD-048: every entry has an icon of its own',
        );
        const registered = await vscode.commands.getCommands(true);
        for (const command of [
            'featherspec-studio.open',
            'featherspec-studio.openOverview',
            'featherspec-studio.openBoard',
            'featherspec-studio.openSpecExplorer',
            'featherspec-studio.refresh',
            'featherspec-studio.shellAction',
            'featherspec-studio.selectProject',
            'workbench.trust.manage',
            'vscode.openFolder',
        ]) {
            assert.ok(registered.includes(command), `${command} is registered`);
        }
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
