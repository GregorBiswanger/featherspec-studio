import type { ReactNode } from 'react';
import { NEXT_STEP_SHORT_LABEL, STEP_SHORT_SEPARATOR, stepTooltip } from '../../shared/protocol/nextStepTexts';
import { splitAtId, type StepView } from '../../shared/protocol/stepView';

export function StepText(props: { step: StepView; link?: { id: string; render(): ReactNode } }) {
    const { step, link } = props;
    const parts = link === undefined ? undefined : splitAtId(step.short, link.id);
    return (
        <span className="step-text" title={stepTooltip(step.lines)}>
            <span className="step-label">{NEXT_STEP_SHORT_LABEL}</span> <span className="step-intent">{step.intent}</span>{STEP_SHORT_SEPARATOR}
            <code className="step-short">
                {link === undefined || parts === undefined ? (
                    step.short
                ) : (
                    <>
                        {parts.before}
                        {link.render()}
                        {parts.after}
                    </>
                )}
            </code>
        </span>
    );
}
