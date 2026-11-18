import type { NextStepView } from '../../shared/protocol/detail';
import { NEXT_STEP_HEADING } from '../../shared/protocol/nextStepTexts';
import { PathText } from '../ui/PathText';
import { CopyButton } from '../ui/CopyButton';

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
                        {nextStep.lines.map((line, index) => (
                            <li key={`${line.intent}|${line.text}`}>
                                <span className="next-step-intent">{line.intent}</span>
                                <code>
                                    <PathText command={line.text} />
                                </code>{' '}
                                <CopyButton look={index === 0 ? 'primary' : 'secondary'} line={line.text} copyResult={copyResult} onCopy={props.onCopy} />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
