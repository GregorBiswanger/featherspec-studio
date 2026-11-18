import { describe, expect, it } from 'vitest';
import type { PanelState } from './messages';
import { ACTION_LABELS, FILTERS_LABEL, PANEL_TITLE, panelStateActions, panelStateLines, S2_WELCOME, SELECT_PROJECT_PLACEHOLDER } from './texts';

const pending = { folder: 'api', markers: [], setupPending: true as const };
const missing = { folder: 'web', markers: ['.specs/ directory'] };

function labels(state: PanelState): string[] {
    return panelStateActions(state).map((action) => ACTION_LABELS[action]);
}

describe('AC-001: the setup actions of S2 and S9', () => {
    it('S2 offers Set up FeatherSpec first, then Open setup guide and Refresh', () => {
        expect(labels({ id: 'S2' })).toEqual(['Set up FeatherSpec', 'Open setup guide', 'Refresh']);
    });

    it('S9 without a setup-pending folder offers Set up FeatherSpec first and no Copy merge prompt', () => {
        expect(labels({ id: 'S9', folders: [missing] })).toEqual(['Set up FeatherSpec', 'Open setup guide', 'Refresh']);
    });

    it('S9 with a setup-pending folder next to another one offers Set up FeatherSpec first, then Copy merge prompt', () => {
        expect(labels({ id: 'S9', folders: [pending, missing] })).toEqual(['Set up FeatherSpec', 'Copy merge prompt', 'Open setup guide', 'Refresh']);
    });

    it('PD-053: S9 whose folders are all setup-pending offers Copy merge prompt first, Set up FeatherSpec second', () => {
        expect(labels({ id: 'S9', folders: [pending] })).toEqual(['Copy merge prompt', 'Set up FeatherSpec', 'Open setup guide', 'Refresh']);
        expect(labels({ id: 'S9', folders: [pending, { ...pending, folder: 'other' }] })[0]).toBe('Copy merge prompt');
    });

    it('the other states keep their actions', () => {
        expect(labels({ id: 'S1' })).toEqual(['Open Folder']);
        expect(labels({ id: 'S3' })).toEqual(['Select project']);
        expect(labels({ id: 'S8', name: 'x', canSelect: false })).toEqual(['Refresh']);
    });
});

describe('AC-015: the S9 lines', () => {
    it('a setup-pending folder gets its own line in place of marker lines, the others keep theirs', () => {
        expect(panelStateLines({ id: 'S9', folders: [pending, missing] })).toEqual([
            'FeatherSpec setup not finished: api has files to merge.',
            'FeatherSpec project incomplete: web has no .specs/ directory.',
        ]);
    });

    it('negative control, a folder without the flag shows its marker line even with no marker listed elsewhere', () => {
        expect(panelStateLines({ id: 'S9', folders: [missing] })).toEqual(['FeatherSpec project incomplete: web has no .specs/ directory.']);
    });

    it('a setup-pending folder that also lists markers shows only the setup line', () => {
        expect(panelStateLines({ id: 'S9', folders: [{ folder: 'api', markers: ['.specs/ directory'], setupPending: true }] })).toEqual([
            'FeatherSpec setup not finished: api has files to merge.',
        ]);
    });
});

describe('AC-001: the S2 welcome text of the navigator', () => {
    it('is the S2 line, the setup button alone on its line, then the two links on one line', () => {
        expect(S2_WELCOME).toBe(
            [
                'No FeatherSpec project found in this workspace.',
                'Set up FeatherSpec downloads the latest FeatherSpec release from GitHub and adds its files; existing files are never overwritten.',
                '[Set up FeatherSpec](command:featherspec-studio.setup)',
                '[Open setup guide](command:featherspec-studio.shellAction?%5B%22openSetupGuide%22%5D) · [Refresh](command:featherspec-studio.shellAction?%5B%22refresh%22%5D)',
            ].join('\n'),
        );
        expect(S2_WELCOME.split('\n')[0]).toBe(panelStateLines({ id: 'S2' })[0]);
    });
});

describe('final check 7: the literals that were written in the adapters and the filter bar', () => {
    it('are one constant each, asserted literally', () => {
        expect(FILTERS_LABEL).toBe('Filters');
        expect(SELECT_PROJECT_PLACEHOLDER).toBe('Select the FeatherSpec project');
        expect(PANEL_TITLE).toBe('FeatherSpec Studio');
    });
});
