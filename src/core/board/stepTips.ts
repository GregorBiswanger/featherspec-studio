import { INTEGRATE_SEND_THEN, MODEL_REASONS, COACH_TIP_PREFIX, MODEL_PHRASES, UPDATE_ATTACH_TEXT, SAME_OR_NEW_REASON_LEVELLED, SESSION_PHRASES, SESSION_REASONS, STEP_GUIDES, TIP_CLOSING, type StepCase } from '../../shared/protocol/nextStepTexts';
import type { StepTipsView } from '../../shared/protocol/stepView';
import type { StepTipSettings } from '../settings/stepTipSettings';
import { levelsOnImplement } from '../specs/version';

export interface StepTipContext {
    version?: string;
    reason?: string;
    send?: true;
    attaches?: true;
}

export function stepTips(stepCase: StepCase, settings: StepTipSettings, closing: readonly [string, string] = TIP_CLOSING, context: StepTipContext = {}): StepTipsView {
    const guide = STEP_GUIDES[stepCase];
    const words = MODEL_PHRASES[guide.model];
    const hint = words.base === 'a strong model' ? settings.hints.strong : settings.hints.fast;
    const model = `${words.base}${hint === undefined ? '' : ` (${hint})`}${words.suffix}`;
    const levelled = guide.session === 'sameOrNew' && context.version !== undefined && levelsOnImplement(context.version);
    const session = levelled ? SAME_OR_NEW_REASON_LEVELLED : SESSION_REASONS[guide.session];
    const then = stepCase === 'NS-6-returned' && context.send === true ? INTEGRATE_SEND_THEN : guide.then;
    const update = context.attaches === true && (context.version === undefined || !levelsOnImplement(context.version)) ? ` ${UPDATE_ATTACH_TEXT}` : '';
    const effect = `${guide.effect}${update} ${then}`;
    return {
        coach: `${COACH_TIP_PREFIX} Use ${SESSION_PHRASES[guide.session]} with ${model}.`,
        about: [context.reason === undefined ? effect : `${context.reason} ${effect}`, `${session} ${MODEL_REASONS[guide.model]}`, closing[0], closing[1]],
    };
}
