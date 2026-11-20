import * as assert from 'assert';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { snapshotTree } from '../core/discovery/testing/snapshotTree';
import { waitFor } from '../core/discovery/testing/waitFor';
import type { StudioApi } from '../extension';
import type { OverviewView } from '../shared/protocol/overview';

async function activateStudio(): Promise<StudioApi> {
    const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
    assert.ok(extension, 'extension is installed in the test host');
    return (await extension.activate()) as StudioApi;
}

function totalOf(view: OverviewView | undefined): number | undefined {
    return view?.figures.kind === 'counts' ? view.figures.total : undefined;
}

function figures(view: OverviewView | undefined): { specs: number | undefined } {
    return { specs: totalOf(view) };
}

suite('FeatherSpec Studio Overview smoke', function () {
    this.timeout(90_000);


    test('AC-015, AC-023: the view follows a spec file without a reopen, and only the test\'s own file is written', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const folder = (vscode.workspace.workspaceFolders ?? []).find((candidate) => candidate.name === 'fs110-de-active-review');
        assert.ok(folder, 'fixture folder is part of the workspace');
        const root = folder.uri.fsPath;
        const mission = api.overview();
        const seen: OverviewView[] = [];
        const listening = mission.listen((view) => {
            if (view !== undefined) {
                seen.push(view);
            }
        });
        const extra = path.join(root, '.specs', 'backlog', '0002-extra-thing.md');
        try {
            await waitFor('Overview to show spec counts', () => figures(mission.view()), (state) => state.specs !== undefined, { timeoutMs: 20_000 });
            const first = mission.view();
            assert.strictEqual(totalOf(first), 1);
            assert.strictEqual(first?.now.rows[0]?.spec.stem, '0001-tip-splitter');
            assert.strictEqual(first?.now.rows[0]?.state, 'Review');
            const before = await snapshotTree(root);

            await fs.writeFile(extra, '# Extra thing\n\n**Status:** Draft\n**Plan:** _none yet_\n');
            await waitFor('Overview to count the added spec (2)', () => figures(mission.view()), (state) => state.specs === 2, { timeoutMs: 20_000 });

            assert.strictEqual(totalOf(mission.view()), 2);
            assert.ok(seen.length >= 2, 'the change produced a new view');

            const during = await snapshotTree(root);
            const added = during.filter((line) => !before.includes(line)).map((line) => line.split('|')[0]);
            assert.ok(added.every((entry) => entry === path.join('.specs', 'backlog', '0002-extra-thing.md') || entry === path.join('.specs', 'backlog')), `only the test's own file was added: ${added.join(', ')}`);
        } finally {
            listening.dispose();
            await fs.rm(extra, { force: true });
        }
    });

    test('0016 AC-007, AC-008 (0018 AC-007): the fixture project has no Problem, so Problems lists nothing', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const mission = api.overview();
        const listening = mission.listen(() => undefined);
        try {
            await waitFor('Overview to have a view', () => figures(mission.view()), (state) => state.specs !== undefined, { timeoutMs: 20_000 });
            const view = mission.view();
            assert.deepStrictEqual(view?.problems, { rows: [], lines: [] });
            assert.ok(view?.now.rows.every((row) => row.problems === 0));
        } finally {
            listening.dispose();
        }
    });

    test('AC-006: the view of the fixture project has the six states and no run section', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const mission = api.overview();
        const listening = mission.listen(() => undefined);
        try {
            await waitFor('Overview to have a view', () => figures(mission.view()), (state) => state.specs !== undefined, { timeoutMs: 20_000 });
            const view = mission.view();
            assert.deepStrictEqual(
                view?.figures.kind === 'counts' ? view.figures.states.map((entry) => entry.state) : [],
                ['Backlog', 'Ready', 'Active', 'Review', 'Done', 'Blocked'],
            );
            assert.deepStrictEqual(Object.keys(view ?? {}).sort(), ['activity', 'figures', 'now', 'problems', 'upNext']);
        } finally {
            listening.dispose();
        }
    });
});
