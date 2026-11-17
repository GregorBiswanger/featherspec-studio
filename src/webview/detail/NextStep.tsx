import type { NextStepView } from '../../shared/protocol/detail';
import { NEXT_STEP_COPY_LABEL, NEXT_STEP_HEADING } from '../../shared/protocol/nextStepTexts';

export function NextStep(props: { nextStep: NextStepView; copyResult: { ok: boolean; text: string } | undefined; onCopy(text: string): void }) {
    const { nextStep, copyResult } = props;
    return (
        <section className="detail-section next-step">
            <div className="section-head">
                <h3>{NEXT_STEP_HEADING}</h3>
            </div>
            <div className="section-body">
                {'text' in nextStep ? (
                    <p>{nextStep.text}</p>
                ) : (
                    <ul className="next-step-lines">
                        {nextStep.lines.map((line) => (
                            <li key={`${line.label ?? ''}|${line.text}`}>
                                {line.label === undefined ? null : <span className="next-step-label">{line.label} </span>}
                                <code>{line.text}</code>{' '}
                                <button type="button" className="open-file next-step-copy" aria-label={`${NEXT_STEP_COPY_LABEL}: ${line.text}`} onClick={() => props.onCopy(line.text)}>
                                    {NEXT_STEP_COPY_LABEL}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="detail-status" role="status" aria-live="polite" data-ok={copyResult === undefined ? undefined : String(copyResult.ok)}>
                {copyResult === undefined ? '' : copyResult.text}
            </div>
        </section>
    );
}
