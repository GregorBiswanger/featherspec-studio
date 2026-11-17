import { describe, expect, it } from 'vitest';
import type { PanelState } from '../../shared/protocol/messages';
import { buildTreeModel } from './treeModel';

describe('AC-003: the Activity Bar tree model', () => {
    it('with an active project: the project name, Open Studio and one entry per area, and no message', () => {
        const model = buildTreeModel({ projectActive: true, projectName: 'demo', state: undefined });
        expect(model.message).toBeUndefined();
        expect(model.items).toEqual([
            { kind: 'project', label: 'demo', icon: 'folder' },
            { kind: 'open', label: 'Open Studio', icon: 'window' },
            { kind: 'area', label: 'Mission Control', area: 'missionControl', icon: 'dashboard' },
            { kind: 'area', label: 'Spec Board', area: 'specBoard', icon: 'layout' },
            { kind: 'area', label: 'Spec Explorer', area: 'specExplorer', icon: 'list-tree' },
        ]);
    });

    it('PD-048: every entry of an active project has an icon of its own', () => {
        const icons = buildTreeModel({ projectActive: true, projectName: 'demo', state: undefined }).items.map((item) => item.icon);
        expect(new Set(icons).size).toBe(icons.length);
        expect(icons.every((icon) => /^[a-z][a-z-]*$/.test(icon))).toBe(true);
    });

    it('an active project keeps its entries while a state such as loading or a load error applies', () => {
        const state: PanelState = { id: 'S5', reason: { cause: 'discovery', message: 'x' } };
        expect(buildTreeModel({ projectActive: true, projectName: 'demo', state }).items).toHaveLength(5);
        expect(buildTreeModel({ projectActive: true, projectName: 'demo', state: { id: 'S4' } }).message).toBeUndefined();
    });

    const cases: [string, PanelState, string, string[]][] = [
        ['AC-011 S1', { id: 'S1' }, 'Open a folder to use FeatherSpec Studio.', ['Open Folder']],
                ['AC-013 S3', { id: 'S3' }, 'Several FeatherSpec projects found. Select one to continue.', ['Select project']],
        ['S4', { id: 'S4' }, 'Loading project…', []],
        ['S5', { id: 'S5', reason: { cause: 'listing', folder: '.specs', reason: 'denied' } }, 'The project could not be loaded: the lifecycle folders of .specs/ could not be listed (.specs: denied).', ['Show output', 'Retry']],
        ['AC-026 S8', { id: 'S8', name: 'demo', canSelect: true }, 'FeatherSpec project demo was not found.', ['Select project', 'Refresh']],
        [
            'AC-027 S9',
            { id: 'S9', folders: [{ folder: 'a', markers: ['.specs/ directory'] }, { folder: 'b', markers: ['AGENTS.md with a FeatherSpecVersion: line'] }] },
            'FeatherSpec project incomplete: a has no .specs/ directory. FeatherSpec project incomplete: b has no AGENTS.md with a FeatherSpecVersion: line.',
            ['Set up FeatherSpec', 'Open setup guide', 'Refresh'],
        ],
        [
            'AC-015 S9 setup-pending',
            { id: 'S9', folders: [{ folder: 'a', markers: [], setupPending: true }] },
            'FeatherSpec setup not finished: a has files to merge.',
            ['Copy merge prompt', 'Set up FeatherSpec', 'Open setup guide', 'Refresh'],
        ],
    ];

    it.each(cases)('without a project, %s shows the state text as the message and its actions as items', (_name, state, message, labels) => {
        const model = buildTreeModel({ projectActive: false, projectName: undefined, state });
        expect(model.message).toBe(message);
        expect(model.items.map((item) => item.label)).toEqual(labels);
        expect(model.items.every((item) => item.kind === 'action')).toBe(true);
    });

    it('AC-001: S2 shows no message and no items, so that VS Code draws the welcome content with the Set up FeatherSpec button', () => {
        const model = buildTreeModel({ projectActive: false, projectName: undefined, state: { id: 'S2' } });
        expect(model).toEqual({ message: undefined, items: [], welcome: 'S2' });
    });

    it('AC-001: negative control, no other state asks for the welcome content', () => {
        for (const state of [{ id: 'S1' }, { id: 'S3' }, { id: 'S4' }, { id: 'S9', folders: [] }] as PanelState[]) {
            expect(buildTreeModel({ projectActive: false, projectName: undefined, state }).welcome).toBeUndefined();
        }
        expect(buildTreeModel({ projectActive: true, projectName: 'demo', state: { id: 'S2' } }).welcome).toBeUndefined();
    });

    it('never shows S6 or the Restricted Mode note (they appear in the panel only)', () => {
        const model = buildTreeModel({ projectActive: false, projectName: undefined, state: { id: 'S6' } });
        expect(model).toEqual({ message: undefined, items: [] });
    });

    it('without a project and without a state there is nothing to show', () => {
        expect(buildTreeModel({ projectActive: false, projectName: undefined, state: undefined })).toEqual({ message: undefined, items: [] });
    });
});
