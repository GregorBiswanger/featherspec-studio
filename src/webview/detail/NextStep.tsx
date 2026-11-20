import type { ReactNode } from 'react';
import type { NextStepLineView, NextStepView } from '../../shared/protocol/detail';
import { ABOUT_STEP_GLYPH, ABOUT_STEP_LABEL, NEXT_STEP_HEADING } from '../../shared/protocol/nextStepTexts';
import { splitAtId } from '../../shared/protocol/stepView';
import { StepLink } from '../ui/StepLink';
import type { FileResult } from '../ui/FileLink';
import { ParallelHint } from './ParallelHint';
import { PathText } from '../ui/PathText';
import type { SendPromptPayload, SendResultEventPayload } from '../../shared/protocol/assistant';
import { CopyButton } from '../ui/CopyButton';
import { StepAction } from '../ui/StepAction';
import { Toggletip } from '../ui/Toggletip';

function intentOf(line: NextStepLineView, fileResult: FileResult | undefined, onOpen: ((key: string, line: number) => void) | undefined): ReactNode {
    const parts = line.step === undefined || onOpen === undefined ? undefined : splitAtId(line.intent, line.step.id);
    if (line.step === undefined || parts === undefined || onOpen === undefined) {
        return line.intent;
    }
    return (
        <>
            {parts.before}
            <StepLink id={line.step.id} target={line.step.open} fileResult={fileResult} onOpen={onOpen}>
                {line.step.id}
            </StepLink>
            {parts.after}
        </>
    );
}

export function NextStep(props: {
    nextStep: NextStepView;
    copyResult: { ok: boolean; text: string } | undefined;
    onCopy(text: string): void;
    sendResult: SendResultEventPayload | undefined;
    onSend(request: SendPromptPayload): void;
    fileResult?: FileResult | undefined;
    onOpen?(key: string, line: number): void;
    place?: 'detail' | 'map';
}) {
    const { nextStep, copyResult } = props;
    const send = 'send' in nextStep ? nextStep.send : undefined;
    const tips = 'tips' in nextStep ? nextStep.tips : undefined;
    const quiet = 'quiet' in nextStep && nextStep.quiet === true;
    const parallel = 'parallel' in nextStep ? nextStep.parallel : undefined;
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
                                <span className="next-step-intent">{intentOf(line, props.fileResult, props.onOpen)}</span>
                                <code>
                                    <PathText command={line.text} after="slash" />
                                </code>{' '}
                                {index === 0 ? (
                                    <StepAction send={send} look={quiet ? 'secondary' : 'primary'} line={line.text} sendResult={props.sendResult} onSend={props.onSend} copyResult={copyResult} onCopy={props.onCopy} />
                                ) : line.send === undefined ? (
                                    <CopyButton look="secondary" line={line.text} copyResult={copyResult} onCopy={props.onCopy} />
                                ) : (
                                    <StepAction send={line.send} look="secondary" line={line.text} sendResult={props.sendResult} onSend={props.onSend} copyResult={copyResult} onCopy={props.onCopy} />
                                )}
                                {index === 0 && tips !== undefined ? <p className="step-coach">{tips.coach}</p> : null}
                                {index > 0 && line.send !== undefined && line.coach !== undefined ? <p className="step-coach">{line.coach}</p> : null}
                                {index === 0 && parallel !== undefined && props.place !== 'map' ? <ParallelHint stage={parallel.stage} /> : null}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
