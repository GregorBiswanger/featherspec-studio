import * as assert from 'assert';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { snapshotTree } from '../core/discovery/testing/snapshotTree';
import { waitFor } from '../core/discovery/testing/waitFor';
import type { StudioApi } from '../extension';
import type { MissionControlView } from '../shared/protocol/missionControl';

async function activateStudio(): Promise<StudioApi> {
    const extension = vscode.extensions.all.find((candidate) => candidate.packageJSON.name === 'featherspec-studio');
    assert.ok(extension, 'extension is installed in the test host');
    return (await extension.activate()) as StudioApi;
}

function totalOf(view: MissionControlView | undefined): number | undefined {
    return view?.specs.kind === 'counts' ? view.specs.total : undefined;
}

function figures(view: MissionControlView | undefined): { specs: number | undefined; running: number | undefined; runs: string } {
    return { specs: totalOf(view), running: runningOf(view), runs: view?.runs.available ? 'available' : 'unavailable' };
}

function runningOf(view: MissionControlView | undefined): number | undefined {
    return view?.runs.available ? view.runs.running : undefined;
}

suite('FeatherSpec Studio Mission Control smoke', function () {
    this.timeout(90_000);


    test('AC-015, AC-023: the view follows a spec file, a created run and a failed status without a reopen, and only the test\'s own file is written', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const folder = (vscode.workspace.workspaceFolders ?? []).find((candidate) => candidate.name === 'fs110-de-active-review');
        assert.ok(folder, 'fixture folder is part of the workspace');
        const root = folder.uri.fsPath;
        const mission = api.missionControl();
        const seen: MissionControlView[] = [];
        const listening = mission.listen((view) => {
            if (view !== undefined) {
                seen.push(view);
            }
        });
        const extra = path.join(root, '.specs', 'backlog', '0002-extra-thing.md');
        try {
            await waitFor('Mission Control to show spec counts', () => figures(mission.view()), (state) => state.specs !== undefined, { timeoutMs: 20_000 });
            const first = mission.view();
            assert.strictEqual(totalOf(first), 1);
            assert.strictEqual(first?.header.name, 'fs110-de-active-review');
            assert.strictEqual(first?.attention.rows[0]?.spec.stem, '0001-tip-splitter');
            assert.deepStrictEqual(first?.attention.rows[0]?.reasons, ['Review pending']);
            const before = await snapshotTree(root);

            await fs.writeFile(extra, '# Extra thing\n\n**Status:** Draft\n**Plan:** _none yet_\n');
            await waitFor('Mission Control to count the added spec (2)', () => figures(mission.view()), (state) => state.specs === 2, { timeoutMs: 20_000 });

            await waitFor('the runtime store to be writable', () => api.runtimeState(), (state) => state.kind === 'writable', { timeoutMs: 30_000 });
            const store = api.runtimeStore();
            assert.ok(store, 'the runtime store is open for the active project');
            const baseline = await waitFor('Mission Control to show run figures', () => figures(mission.view()), (state) => state.running !== undefined, { timeoutMs: 20_000 });
            const runningBefore = baseline.running ?? 0;
            const run = await store.createRun({ providerId: 'fake', spec: { stem: '0001-tip-splitter', path: '.specs/active/0001-tip-splitter.md' } });
            await waitFor(`Mission Control to show ${runningBefore + 1} running run(s)`, () => figures(mission.view()), (state) => state.running === runningBefore + 1, { timeoutMs: 20_000 });
            await store.reportStatus(run.runId, 'Failed');
            await waitFor(`Mission Control to show ${runningBefore} running run(s) again`, () => figures(mission.view()), (state) => state.running === runningBefore, { timeoutMs: 20_000 });
            const failed = mission.view();
            assert.ok(failed?.runs.available && failed.runs.highlighted.some((entry) => entry.runId === run.runId && entry.status === 'Failed'));
            assert.ok(failed?.attention.rows.some((row) => row.spec.stem === '0001-tip-splitter' && row.reasons.includes('Run failed')));
            assert.strictEqual(totalOf(failed), 2);
            assert.ok(seen.length >= 3, 'each change produced a new view');

            const during = await snapshotTree(root);
            const added = during.filter((line) => !before.includes(line)).map((line) => line.split('|')[0]);
            assert.ok(added.every((entry) => entry === path.join('.specs', 'backlog', '0002-extra-thing.md') || entry === path.join('.specs', 'backlog')), `only the test's own file was added: ${added.join(', ')}`);
        } finally {
            listening.dispose();
            await fs.rm(extra, { force: true });
        }
    });

    test('AC-006: the run notification does not move the spec counts, the view of the fixture project has the six states', async () => {
        const api = await activateStudio();
        await api.whenIdle();
        const mission = api.missionControl();
        const listening = mission.listen(() => undefined);
        try {
            await waitFor('Mission Control to have a view', () => figures(mission.view()), (state) => state.specs !== undefined, { timeoutMs: 20_000 });
            const view = mission.view();
            assert.deepStrictEqual(
                view?.specs.kind === 'counts' ? view.specs.states.map((entry) => entry.state) : [],
                ['Backlog', 'Ready', 'Active', 'Review', 'Done', 'Blocked'],
            );
        } finally {
            listening.dispose();
        }
    });
});
