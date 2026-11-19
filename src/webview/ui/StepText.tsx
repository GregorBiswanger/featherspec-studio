import { NEXT_STEP_SHORT_LABEL, STEP_SHORT_SEPARATOR, stepTooltip } from '../../shared/protocol/nextStepTexts';
import type { StepView } from '../../shared/protocol/stepView';

export function StepText(props: { step: StepView }) {
    const { step } = props;
    return (
        <span className="step-text" title={stepTooltip(step.lines)}>
            <span className="step-label">{NEXT_STEP_SHORT_LABEL}</span> <span className="step-intent">{step.intent}</span>{STEP_SHORT_SEPARATOR}<code className="step-short">{step.short}</code>
        </span>
    );
}
