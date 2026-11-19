import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { BOARD_STATES, type BoardState } from '../../shared/protocol/boardFilter';
import { STATE_LOOK, type StateLook } from '../../shared/protocol/stateLook';
import { mount, type Mounted } from '../testing/dom';
import { Glyph, StateIcon } from './icons';

let mounted: Mounted | undefined;
const original: Record<BoardState, StateLook> = { ...STATE_LOOK };

afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
    for (const state of BOARD_STATES) {
        STATE_LOOK[state] = original[state];
    }
});

async function pathOf(element: ReactElement): Promise<string> {
    mounted = await mount(element);
    const path = mounted.container.querySelector('path')?.getAttribute('d') ?? '';
    mounted.unmount();
    mounted = undefined;
    return path;
}

describe('0022 AC-026: a state glyph follows the motif of the one table, not the state', () => {
    const motifs = [...new Set(BOARD_STATES.map((state) => STATE_LOOK[state].motif))];

    it('every motif of the table has a glyph of its own', async () => {
        const paths: string[] = [];
        for (const motif of motifs) {
            const owner = BOARD_STATES.find((state) => STATE_LOOK[state].motif === motif)!;
            paths.push(await pathOf(<StateIcon state={owner} />));
        }
        expect(motifs).toHaveLength(6);
        expect(paths.every((path) => path !== '')).toBe(true);
        expect(new Set(paths).size).toBe(6);
    });

    it.each(BOARD_STATES.map((state) => [state]))('%s: whatever motif the table names for it, StateIcon and the state Glyph draw that motif', async (state) => {
        for (const motif of motifs) {
            const owner = BOARD_STATES.find((candidate) => original[candidate].motif === motif)!;
            const reference = await pathOf(<StateIcon state={owner} />);
            STATE_LOOK[state] = { ...original[state], motif };
            expect(await pathOf(<StateIcon state={state} />), `${state} as ${motif}`).toBe(reference);
            expect(await pathOf(<Glyph kind={state} />), `${state} Glyph as ${motif}`).toBe(reference);
            STATE_LOOK[state] = original[state];
        }
    });

    it('control: a state keeps its own glyph while the table is unchanged, and the motif attribute names the table entry', async () => {
        mounted = await mount(<StateIcon state="Review" />);
        expect(mounted.container.querySelector('svg')?.getAttribute('data-motif')).toBe('eye');
        expect(mounted.container.querySelector('path')?.getAttribute('d')).toBe(await pathOf(<Glyph kind="Review" />));
    });
});
