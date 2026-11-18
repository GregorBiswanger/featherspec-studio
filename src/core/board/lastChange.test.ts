import { describe, expect, it } from 'vitest';
import { cardLastChange, localDay, planDay } from './lastChange';

const at = (year: number, month: number, day: number, hour = 12): number => new Date(year, month - 1, day, hour, 30).getTime();

describe('AC-021: the date of a card (L-1)', () => {
    it('the plan\'s Last updated line wins when it starts with a real calendar date', () => {
        expect(cardLastChange({ state: 'value', raw: '2026-11-10' }, at(2026, 11, 16), at(2026, 11, 17))).toEqual({ day: '2026-11-10', source: 'plan' });
        expect(cardLastChange({ state: 'value', raw: '2026-11-10 (stage 2)' }, at(2026, 11, 16), undefined)).toEqual({ day: '2026-11-10', source: 'plan' });
        expect(cardLastChange({ state: 'value', raw: '2024-02-29' }, undefined, undefined)).toEqual({ day: '2024-02-29', source: 'plan' });
    });

    it('anything else falls back to the newer file time of spec and plan as a local day', () => {
        for (const field of [undefined, { state: 'absent' as const }, { state: 'empty' as const, raw: '' }, { state: 'placeholder' as const, raw: '—' }, { state: 'value' as const, raw: '<date>' }, { state: 'value' as const, raw: '2026-13-40' }, { state: 'value' as const, raw: '2026-02-30' }, { state: 'value' as const, raw: 'yesterday' }, { state: 'value' as const, raw: '2026-11-10T09:00' }, { state: 'value' as const, raw: '2026-11-100' }]) {
            expect(cardLastChange(field, at(2026, 11, 16), at(2026, 11, 17)), JSON.stringify(field)).toEqual({ day: '2026-11-17', source: 'file' });
        }
    });

    it('uses the spec file time alone when there is no plan, and nothing when no time is known', () => {
        expect(cardLastChange(undefined, at(2026, 1, 5), undefined)).toEqual({ day: '2026-01-05', source: 'file' });
        expect(cardLastChange(undefined, undefined, undefined)).toBeUndefined();
    });

    it('the file day is the local calendar day with two digits (the same in every time zone)', () => {
        expect(localDay(at(2026, 3, 4, 0))).toBe('2026-03-04');
        expect(localDay(at(2026, 12, 31, 23))).toBe('2026-12-31');
    });

    it('planDay accepts a date only at the start of the value', () => {
        expect(planDay({ state: 'value', raw: '2026-11-10' })).toBe('2026-11-10');
        expect(planDay({ state: 'value', raw: 'on 2026-11-10' })).toBeUndefined();
        expect(planDay(undefined)).toBeUndefined();
    });
});
