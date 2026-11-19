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

describe('0025 AC-013 ProgressBar text', () => {
    it('0025 AC-013: the visible text is also the title and the aria-valuetext', async () => {
        mounted = await mount(<ProgressBar label="Steps" done={3} total={7} text="3 of 7 done · 43%" />);
        const bar = mounted.container.querySelector('[role="progressbar"]')!;
        expect(bar.getAttribute('title')).toBe('3 of 7 done · 43%');
        expect(bar.getAttribute('aria-valuetext')).toBe('3 of 7 done · 43%');
        expect(mounted.container.querySelector('.progress-text')!.textContent).toBe('3 of 7 done · 43%');
    });
});
