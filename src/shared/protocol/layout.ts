export const NARROW_QUERY = '(max-width: 899px)';
export const SIDE_MIN = 320;
export const AREA_MIN = 360;
export const SIDE_STEP = 16;
export const SIDE_STEP_LARGE = 64;
const SIDE_DEFAULT_MIN = 400;
const SIDE_DEFAULT_SHARE = 0.4;

export function isSideFraction(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 1;
}

export function maxSideWidth(frame: number): number {
    return Math.max(SIDE_MIN, frame - AREA_MIN);
}

export function clampSideWidth(width: number, frame: number): number {
    return Math.max(SIDE_MIN, Math.min(width, frame - AREA_MIN));
}

export function defaultSideWidth(frame: number): number {
    return clampSideWidth(Math.max(SIDE_DEFAULT_MIN, Math.round(SIDE_DEFAULT_SHARE * frame)), frame);
}

export function sideWidthOf(fraction: number | undefined, frame: number): number {
    return isSideFraction(fraction) ? clampSideWidth(Math.round(fraction * frame), frame) : defaultSideWidth(frame);
}
