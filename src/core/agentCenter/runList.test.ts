import { describe, expect, it } from 'vitest';
import { run } from '../board/testing/boardWorld';
import { createFakeProvider } from '../../adapters/providers/fake/fakeProvider';
import { createProviderSetup } from '../providers/providerSetup';
import { createFakeRuntimeClock } from '../runtime/testing/fakes';
import { modelFor } from '../missionControl/testing/projects';
import { projectRunRows, providerName, specRefOf } from './runList';

const clock = createFakeRuntimeClock();
const registry = createProviderSetup({ clock, adapters: [createFakeProvider({ clock })] }).registry;

describe('AC-001: the run list', () => {
    it('lists every run, open runs first, then by created time newest first; each row shows spec, provider, status, times and the flags', async () => {
        const model = await modelFor([
            { number: '0007', slug: 'board', kind: 'Active', title: 'Spec Board' },
            { number: '0003', slug: 'lifecycle', kind: 'Done', title: 'Lifecycle' },
        ]);
        const runs = [
            run('old-done', '0003-lifecycle', { providerId: 'fake', status: 'Completed', created: '2026-11-15T10:00:00.000Z', started: '2026-11-15T10:00:01.000Z', ended: '2026-11-15T10:05:00.000Z' }),
            run('new-done', '0007-board', { providerId: 'fake', status: 'Failed', created: '2026-11-17T10:00:00.000Z', historyIncomplete: true }),
            run('open-old', '0007-board', { providerId: 'fake', status: 'WaitingForApproval', created: '2026-11-14T10:00:00.000Z' }),
            run('open-new', '0007-board', { providerId: 'fake', status: 'Running', created: '2026-11-16T10:00:00.000Z', historyUnreadable: true }),
        ];
        const rows = projectRunRows(runs, { model, providers: registry, selectedRunId: 'new-done' });
        expect(rows.map((row) => row.runId)).toEqual(['open-new', 'open-old', 'new-done', 'old-done']);
        expect(rows[0]).toMatchObject({
            spec: { stem: '0007-board', number: '0007', title: 'Spec Board', found: true },
            provider: 'Fake provider (no agent, no network)',
            status: 'Running',
            historyUnreadable: true,
            historyIncomplete: false,
            selected: false,
        });
        expect(rows[2]).toMatchObject({ runId: 'new-done', selected: true, historyIncomplete: true, status: 'Failed' });
        expect(rows[3]).toMatchObject({ started: '2026-11-15T10:00:01.000Z', ended: '2026-11-15T10:05:00.000Z' });
    });

    it('equal created times keep a stable order (run ID, descending); an empty list gives no rows', async () => {
        const model = await modelFor([{ number: '0007', slug: 'board', kind: 'Active' }]);
        const same = '2026-11-17T10:00:00.000Z';
        const rows = projectRunRows([run('a', '0007-board', { status: 'Completed', created: same }), run('b', '0007-board', { status: 'Completed', created: same })], { model, providers: registry, selectedRunId: undefined });
        expect(rows.map((row) => row.runId)).toEqual(['b', 'a']);
        expect(projectRunRows([], { model, providers: registry, selectedRunId: undefined })).toEqual([]);
    });

    it('a provider that is not registered shows by ID; a registered one by display name', () => {
        expect(providerName(registry, 'fake')).toBe('Fake provider (no agent, no network)');
        expect(providerName(registry, 'ghost')).toBe('ghost');
    });
});

describe('AC-004: spec label and "spec not found"', () => {
    it('no spec carries the stem: not found, stem as the number part, no title', async () => {
        const model = await modelFor([{ number: '0007', slug: 'board', kind: 'Active' }]);
        expect(specRefOf(run('r', '0099-gone'), model)).toEqual({ stem: '0099-gone', number: '0099', title: null, found: false });
    });

    it('of several specs with the stem, the one at the run\'s stored path; else the stem alone', async () => {
        const stem = '0007-thing';
        const model = await modelFor([{ number: '0007', kind: 'Active', title: 'Active copy' }], {
            '.specs/backlog/0007-thing.md': '# Backlog copy\n\n**Status:** Draft\n**Plan:** _none yet_\n',
        });
        const active = specRefOf(run('r', stem, { spec: { stem, path: '.specs/active/0007-thing.md' } }), model);
        expect(active).toMatchObject({ stem, found: true, title: 'Active copy', path: '.specs/active/0007-thing.md' });
        const other = specRefOf(run('r', stem, { spec: { stem, path: '.specs/done/0007-thing.md' } }), model);
        expect(other).toEqual({ stem, number: stem, title: null, found: true });
    });

    it('without a model the run is not judged: the stem is kept and found stays true', () => {
        expect(specRefOf(run('r', '0007-board'), undefined)).toEqual({ stem: '0007-board', number: '0007', title: null, found: true });
    });
});
