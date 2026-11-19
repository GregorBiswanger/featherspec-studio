import { MODEL_REASONS, MODEL_WORDS, SESSION_REASONS, SESSION_WORDS, STEP_GUIDES, TIP_CLOSING, type StepCase } from '../../shared/protocol/nextStepTexts';
import type { StepTipsView } from '../../shared/protocol/stepView';
import type { StepTipSettings } from '../settings/stepTipSettings';

export function stepTips(stepCase: StepCase, settings: StepTipSettings, closing: readonly [string, string] = TIP_CLOSING): StepTipsView {
    const guide = STEP_GUIDES[stepCase];
    const words = MODEL_WORDS[guide.model];
    const hint = words.base === 'strong model' ? settings.hints.strong : settings.hints.fast;
    const model = `${words.base}${hint === undefined ? '' : ` (${hint})`}${words.suffix}`;
    return {
        coach: `${SESSION_WORDS[guide.session]} · ${model}`,
        about: [`${guide.effect} ${guide.then}`, `${SESSION_REASONS[guide.session]} ${MODEL_REASONS[guide.model]}`, closing[0], closing[1]],
    };
}
