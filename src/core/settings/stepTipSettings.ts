export interface ModelHints {
    strong?: string;
    fast?: string;
}

export interface StepTipSettings {
    show: boolean;
    hints: ModelHints;
}

export const SHOW_STEP_TIPS_KEY = 'showStepTips';

export const MODEL_HINTS_KEY = 'modelHints';

const MAX_HINT = 40;

function hintOf(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const text = value.replace(/\s+/g, ' ').trim();
    if (text === '') {
        return undefined;
    }
    const points = Array.from(text);
    return points.length > MAX_HINT ? `${points.slice(0, MAX_HINT - 1).join('').trimEnd()}…` : text;
}

export function parseStepTipSettings(show: unknown, hints: unknown): StepTipSettings {
    const source = typeof hints === 'object' && hints !== null && !Array.isArray(hints) ? (hints as Record<string, unknown>) : {};
    const strong = hintOf(source.strong);
    const fast = hintOf(source.fast);
    return {
        show: typeof show === 'boolean' ? show : true,
        hints: { ...(strong === undefined ? {} : { strong }), ...(fast === undefined ? {} : { fast }) },
    };
}
