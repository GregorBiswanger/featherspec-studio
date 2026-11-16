import { afterEach, describe, expect, it } from 'vitest';
import { mount, type Mounted } from '../testing/dom';
import { ProgressBar } from './ProgressBar';

let mounted: Mounted | undefined;
afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
});

describe('0013 AC-009 ProgressBar', () => {
    it('AC-009: a progressbar with accessible name, min, max, now and the figure text', async () => {
        mounted = await mount(<ProgressBar label="Tasks" done={3} total={7} text="Tasks: 3 of 7" />);
        const bar = mounted.container.querySelector('[role="progressbar"]')!;
        expect(bar.getAttribute('aria-label')).toBe('Tasks');
        expect(bar.getAttribute('aria-valuemin')).toBe('0');
        expect(bar.getAttribute('aria-valuemax')).toBe('7');
        expect(bar.getAttribute('aria-valuenow')).toBe('3');
        expect(bar.getAttribute('aria-valuetext')).toBe('Tasks: 3 of 7');
        expect(mounted.container.textContent).toBe('Tasks: 3 of 7');
        const fill = mounted.container.querySelector<HTMLElement>('.progress-fill')!;
        expect(Number.parseFloat(fill.style.width)).toBeCloseTo(42.9, 0);
        expect(fill.getAttribute('style')).toMatch(/^width: [\d.]+%;?$/);
    });

    it('a total of 0 draws an empty bar, never NaN', async () => {
        mounted = await mount(<ProgressBar label="Tasks" done={0} total={0} text="Tasks: 0 of 0" />);
        expect(mounted.container.querySelector<HTMLElement>('.progress-fill')!.style.width).toBe('0%');
    });
});
