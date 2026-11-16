import * as assert from 'assert';
import * as vscode from 'vscode';
import type { StudioApi } from '../extension';

const VIEW_TYPE = 'featherspecStudio.main';

async function waitFor(condition: () => boolean, timeoutMs: number): Promise<void> {
    const started = Date.now();
    while (!condition()) {
        if (Date.now() - started > timeoutMs) {
            throw new Error('Timed out waiting for the condition');
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
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

async function closeStudio(api: StudioApi): Promise<void> {
    await Promise.all(studioTabs().map((tab) => vscode.window.tabGroups.close(tab)));
    await waitFor(() => api.shell().panelCount() === 0, 5000);
}

suite('FeatherSpec Studio shell smoke', () => {
    teardown(async () => {
        const api = await activateStudio();
        await closeStudio(api);
    });

    test('AC-001: the Open command shows the Studio panel in the editor area', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        await vscode.commands.executeCommand('featherspec-studio.open');
        await waitFor(() => studioTabs().length === 1, 10000);
        assert.strictEqual(api.shell().panelCount(), 1);
    });

    test('AC-002: running Open twice leaves one Studio tab', async () => {
        const api = await activateStudio();
        await vscode.commands.executeCommand('featherspec-studio.open');
        await vscode.commands.executeCommand('featherspec-studio.open');
        await waitFor(() => studioTabs().length >= 1, 10000);
        assert.strictEqual(studioTabs().length, 1);
        assert.strictEqual(api.shell().panelCount(), 1);
    });

    test('AC-005: a per-area command opens the closed panel on that area', async () => {
        const api = await activateStudio();
        await closeStudio(api);
        await vscode.commands.executeCommand('featherspec-studio.openSpecBoard');
        await waitFor(() => studioTabs().length === 1, 10000);
        assert.strictEqual(api.shell().view().area, 'specBoard');
        await vscode.commands.executeCommand('featherspec-studio.openAgentCenter');
        assert.strictEqual(api.shell().view().area, 'agentCenter');
        assert.strictEqual(studioTabs().length, 1);
    });

    test('AC-009: the serializer adopts a fresh panel on the remembered area and selection', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        await vscode.commands.executeCommand('featherspec-studio.openSpecExplorer');
        await waitFor(() => api.shell().view().rows.length > 0, 10000);
        const stem = api.shell().view().rows[0]?.stem;
        assert.ok(stem, 'the fixture project has a spec');
        await api.shell().select(stem);
        await closeStudio(api);
        const before = api.shell().lastHelloAt() ?? 0;
        const restored = vscode.window.createWebviewPanel(VIEW_TYPE, 'FeatherSpec Studio', vscode.ViewColumn.Active, { enableScripts: true });
        await api.shell().restore(restored);
        await waitFor(() => (api.shell().lastHelloAt() ?? 0) > before, 10000);
        assert.strictEqual(api.shell().panelCount(), 1);
        assert.strictEqual(api.shell().view().area, 'specExplorer');
        assert.strictEqual(api.shell().view().selection?.stem, stem);
    });

    test('AC-020: the panel is limited to dist/webview, ships the CSP, and a workspace file cannot be loaded by path', async () => {
        const api = await activateStudio();
        await vscode.commands.executeCommand('featherspec-studio.open');
        await waitFor(() => api.shell().lastHelloAt() !== undefined && studioTabs().length === 1, 10000);
        const inspected = api.shell().inspect();
        assert.ok(inspected);
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
        await closeStudio(api);
        const started = Date.now();
        await vscode.commands.executeCommand('featherspec-studio.open');
        await waitFor(() => (api.shell().lastHelloAt() ?? 0) >= started, 10000);
        const elapsed = (api.shell().lastHelloAt() ?? Date.now()) - started;
        assert.ok(elapsed < 1000, `the first message arrived after ${elapsed} ms`);
    });
});
