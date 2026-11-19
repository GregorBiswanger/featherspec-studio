import { describe, expect, it } from 'vitest';
import { BOARD_STATES } from './boardFilter';
import { STATE_LOOK } from './stateLook';

describe('0022 AC-026: one table gives each state its motif and colour', () => {
    it('is the table of §4.8, literally', () => {
        expect(STATE_LOOK).toEqual({
            Backlog: { motif: 'list-flat', colour: 'descriptionForeground' },
            Ready: { motif: 'pass', colour: 'charts.blue' },
            Active: { motif: 'play', colour: 'charts.green' },
            Review: { motif: 'eye', colour: 'charts.orange' },
            Blocked: { motif: 'circle-slash', colour: 'charts.red' },
            Done: { motif: 'check', colour: 'descriptionForeground' },
        });
    });

    it('covers every board state exactly, each with its own shape, and no shape is the Problem warning', () => {
        expect(Object.keys(STATE_LOOK).sort()).toEqual([...BOARD_STATES].sort());
        const motifs = BOARD_STATES.map((state) => STATE_LOOK[state].motif);
        expect(new Set(motifs).size).toBe(BOARD_STATES.length);
        expect(motifs).not.toContain('warning');
    });

    it('colour is never the only cue: states that share a colour differ by motif', () => {
        expect(STATE_LOOK.Backlog.colour).toBe(STATE_LOOK.Done.colour);
        expect(STATE_LOOK.Backlog.motif).not.toBe(STATE_LOOK.Done.motif);
    });

    it('the Review orange differs from the Problem warning colour name used by the tree', () => {
        for (const state of BOARD_STATES) {
            expect(STATE_LOOK[state].colour).not.toBe('problemsWarningIcon.foreground');
        }
    });
});
