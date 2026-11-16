import { afterEach, describe, expect, it } from 'vitest';
import { BOARD_STATES } from '../../shared/protocol/boardFilter';
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
