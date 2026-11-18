import type { NextStepView } from '../../shared/protocol/detail';
import { ABOUT_STEP_GLYPH, ABOUT_STEP_LABEL, NEXT_STEP_HEADING } from '../../shared/protocol/nextStepTexts';
import { PathText } from '../ui/PathText';
import type { SendPromptPayload, SendResultEventPayload } from '../../shared/protocol/assistant';
import { CopyButton } from '../ui/CopyButton';
import { SendButton } from '../ui/SendButton';
import { Toggletip } from '../ui/Toggletip';

export function NextStep(props: {
    nextStep: NextStepView;
    copyResult: { ok: boolean; text: string } | undefined;
    onCopy(text: string): void;
    sendResult: SendResultEventPayload | undefined;
    onSend(request: SendPromptPayload): void;
}) {
    const { nextStep, copyResult } = props;
    const send = 'send' in nextStep ? nextStep.send : undefined;
    const tips = 'tips' in nextStep ? nextStep.tips : undefined;
    return (
        <section className="detail-section next-step">
            <div className="section-head">
                <h3>{NEXT_STEP_HEADING}</h3>
                {tips === undefined ? null : <Toggletip label={ABOUT_STEP_LABEL} glyph={ABOUT_STEP_GLYPH} paragraphs={tips.about} />}
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
                                {index === 0 && send !== undefined ? (
                                    <SendButton send={send} line={line.text} sendResult={props.sendResult} onSend={props.onSend} copyResult={copyResult} onCopy={props.onCopy} />
                                ) : (
                                    <CopyButton look={index === 0 ? 'primary' : 'secondary'} line={line.text} copyResult={copyResult} onCopy={props.onCopy} />
                                )}
                                {index === 0 && tips !== undefined ? <p className="step-coach">{tips.coach}</p> : null}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
