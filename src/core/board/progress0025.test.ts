import { describe, expect, it } from 'vitest';
import { criteriaShortText, criteriaVerifiedText, stepsDoneText, stepsText } from '../../shared/protocol/texts';
import { progressText } from '../../webview/areas/overview/texts';

describe('0025 AC-013 progress texts', () => {
    it('0025 AC-013: U-04 literally, with the percentage after the figures', () => {
        expect(stepsDoneText(0, 1)).toBe('0 of 1 done · 0%');
        expect(criteriaVerifiedText(0, 1)).toBe('0 of 1 verified · 0%');
        expect(criteriaVerifiedText(28, 30)).toBe('28 of 30 verified · 93%');
        expect(stepsText({ done: 3, total: 7 })).toBe('Steps 3/7 · 43%');
        expect(criteriaShortText({ done: 1, total: 4 })).toBe('Criteria 1/4 · 25%');
        expect(stepsDoneText(3, 7)).toBe('3 of 7 done · 43%');
        expect(stepsDoneText(6, 6)).toBe('6 of 6 done · 100%');
        expect(stepsDoneText(199, 200)).toBe('199 of 200 done · 99%');
    });

    it('0025 AC-013: a total of 0 carries no number', () => {
        expect(stepsDoneText(0, 0)).toBe('0 of 0 done');
        expect(stepsText({ done: 0, total: 0 })).toBe('Steps 0/0');
    });

    it('0025 AC-013: the Overview tooltip uses the same rounding and U-04 formula, no space before %', () => {
        expect(progressText(67, 2, 3)).toBe('Progress 67% (2 of 3): Done specs with status Implemented or Baseline ÷ (all specs − Deprecated), rounded half up, at most 99% until all are done');
    });
});
