import { afterEach, describe, expect, it } from 'vitest';
import { BOARD_STATES } from '../../shared/protocol/boardFilter';
import { STATE_LOOK } from '../../shared/protocol/stateLook';
import { StateIcon } from '../board/icons';
import { mount, type Mounted } from '../testing/dom';
import { StateChip } from './StateChip';

let mounted: Mounted | undefined;
afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
});

describe('0013 §3.1 StateChip', () => {
    it.each(BOARD_STATES.map((state) => [state]))('AC-009/AC-010: %s shows its icon (hidden from assistive technology) and its name, with the state colour hook', async (state) => {
        mounted = await mount(<StateChip state={state} />);
        const chip = mounted.container.querySelector('.state-chip');
        expect(chip?.getAttribute('data-board-state')).toBe(state);
        expect(chip?.textContent?.trim()).toBe(state);
        const icon = chip?.querySelector('svg');
        expect(icon?.getAttribute('aria-hidden')).toBe('true');
        expect(icon?.getAttribute('data-icon')).toBe(state);
    });

    it('control: the chip sets no inline colour', async () => {
        mounted = await mount(<StateChip state="Review" />);
        expect(mounted.container.querySelector('.state-chip')?.getAttribute('style')).toBeNull();
    });
});

describe('0022 AC-026: the chip takes motif and colour from the one table', () => {
    it.each(BOARD_STATES.map((state) => [state]))('%s: the chip, its icon carry the colour ID and the motif of STATE_LOOK', async (state) => {
        mounted = await mount(<StateChip state={state} />);
        const chip = mounted.container.querySelector('.state-chip');
        expect(chip?.getAttribute('data-tint')).toBe(STATE_LOOK[state].colour);
        const icon = chip?.querySelector('svg');
        expect(icon?.getAttribute('data-tint')).toBe(STATE_LOOK[state].colour);
        expect(icon?.getAttribute('data-motif')).toBe(STATE_LOOK[state].motif);
    });

    it('the six state icons are six distinct shapes, and Blocked is a circle with a slash, not with a bar', async () => {
        const shapes: string[] = [];
        for (const state of BOARD_STATES) {
            mounted = await mount(<StateIcon state={state} />);
            shapes.push(mounted.container.querySelector('path')?.getAttribute('d') ?? '');
            mounted.unmount();
        }
        mounted = undefined;
        expect(new Set(shapes).size).toBe(6);
        expect(shapes.every((shape) => shape !== '')).toBe(true);
        expect(shapes[BOARD_STATES.indexOf('Blocked')]).not.toContain('M4 7h8v2H4z');
    });
});
