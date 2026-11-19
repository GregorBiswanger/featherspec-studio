import { describe, expect, it } from 'vitest';
import { AREA_MIN, SIDE_MIN, SIDE_STEP, SIDE_STEP_LARGE, clampSideWidth, defaultSideWidth, isSideFraction, maxSideWidth, sideWidthOf } from './layout';

describe('0022 AC-024: the side panel width arithmetic', () => {
    it('the default is 40 % of the frame, whole pixels, at least 400 px: 1428 gives 571, 900 gives 400', () => {
        expect(defaultSideWidth(1428)).toBe(571);
        expect(defaultSideWidth(900)).toBe(400);
        expect(defaultSideWidth(1000)).toBe(400);
        expect(defaultSideWidth(1250)).toBe(500);
        expect(defaultSideWidth(1251)).toBe(500);
        expect(defaultSideWidth(1252)).toBe(501);
    });

    it('the limits are 320 px for the side panel and 360 px for the area, the steps 16 and 64 px', () => {
        expect([SIDE_MIN, AREA_MIN, SIDE_STEP, SIDE_STEP_LARGE]).toEqual([320, 360, 16, 64]);
    });

    it('a width is clamped to 320 px below and to the frame minus 360 px above', () => {
        expect(clampSideWidth(100, 1428)).toBe(320);
        expect(clampSideWidth(320, 1428)).toBe(320);
        expect(clampSideWidth(700, 1428)).toBe(700);
        expect(clampSideWidth(1068, 1428)).toBe(1068);
        expect(clampSideWidth(1069, 1428)).toBe(1068);
        expect(clampSideWidth(5000, 1428)).toBe(1068);
        expect(clampSideWidth(600, 900)).toBe(540);
        expect(maxSideWidth(1428)).toBe(1068);
        expect(maxSideWidth(900)).toBe(540);
    });

    it('in a frame too small for both limits the side panel keeps its 320 px', () => {
        expect(maxSideWidth(600)).toBe(320);
        expect(clampSideWidth(500, 600)).toBe(320);
        expect(defaultSideWidth(600)).toBe(320);
    });

    it('a remembered fraction gives its width of the frame: 0.6 of 1428 is 857, 0.7 of 900 is clamped to 540', () => {
        expect(sideWidthOf(0.6, 1428)).toBe(857);
        expect(sideWidthOf(0.7, 900)).toBe(540);
        expect(sideWidthOf(0.1, 900)).toBe(320);
    });

    it('without a fraction, or with an invalid one, the default applies', () => {
        expect(sideWidthOf(undefined, 1428)).toBe(571);
        for (const value of [0, 1, -0.1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
            expect(sideWidthOf(value, 1428), String(value)).toBe(571);
        }
    });

    it('a fraction is valid exactly when it is a finite number above 0 and below 1', () => {
        for (const value of [0.01, 0.4, 0.5, 0.999]) {
            expect(isSideFraction(value), String(value)).toBe(true);
        }
        for (const value of [0, 1, -0.1, 1.2, Number.NaN, Number.POSITIVE_INFINITY, '0.5', null, undefined, {}, [0.5], true]) {
            expect(isSideFraction(value), String(value)).toBe(false);
        }
    });
});
