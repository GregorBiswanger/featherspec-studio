import { useId } from 'react';
import type { PlanStepView } from '../../../shared/protocol/planMap';
import { COVERS_LABEL, DO_LABEL, FILES_LABEL, OPEN_IN_PLAN_LABEL, returnedText, stepLook, VERIFY_LABEL } from '../../../shared/protocol/planMapTexts';
import { StepIcon } from '../../board/icons';
import { FileLink, type FileResult } from '../../ui/FileLink';
import { PathText } from '../../ui/PathText';

export interface CardLinks {
    fileResult: FileResult | undefined;
    onOpen(key: string, line: number): void;
}

export function StepCard(props: { cardKey: string; step: PlanStepView; expanded: boolean; tabStop: boolean; highlighted?: boolean; links: CardLinks; onToggle(key: string): void }) {
    const { step, links } = props;
    const panelId = useId();
    const look = stepLook(step);
    const linkTab = props.tabStop ? 0 : -1;
    const dropped = step.state === 'dropped';
    return (
        <div className="step-card" data-step-card={step.id} data-card-key={props.cardKey} data-state={step.state} {...(props.expanded ? { 'data-expanded': '' } : {})} {...(props.highlighted === true ? { 'data-highlight': '' } : {})}>
            <button
                type="button"
                className="step-card-toggle"
                data-card-toggle={step.id}
                aria-expanded={props.expanded}
                aria-controls={panelId}
                tabIndex={props.tabStop ? 0 : -1}
                onClick={() => props.onToggle(props.cardKey)}
            >
                <StepIcon look={look.key} />{' '}
                <span className="step-card-id">{dropped ? <s>{step.id}</s> : step.id}</span>
                {step.title === '' ? null : <span className="step-card-title"> {step.title}</span>}
                <span className="visually-hidden">, {look.word}</span>
            </button>
            {step.returned === undefined ? null : (
                <p className="step-card-returned" data-returned={step.returned.status} {...(step.returned.reasonFull === undefined ? {} : { title: step.returned.reasonFull })}>
                    {returnedText(step.returned)}
                </p>
            )}
            {step.files.length === 0 ? null : (
                <p className="step-card-line step-card-files">
                    <span className="step-card-label">{FILES_LABEL}</span>{' '}
                    {step.files.map((file, index) => (
                        <span key={file} className="step-card-file">
                            {index === 0 ? '' : ', '}
                            <PathText path={file} />
                        </span>
                    ))}
                </p>
            )}
            {step.covers.length === 0 ? null : (
                <p className="step-card-line step-card-covers">
                    <span className="step-card-label">{COVERS_LABEL}</span>{' '}
                    {step.covers.map((cover, index) => (
                        <span key={cover.id}>
                            {index === 0 ? '' : ', '}
                            {cover.open === undefined ? (
                                cover.id
                            ) : (
                                <FileLink target={cover.open} fileResult={links.fileResult} onOpen={links.onOpen} tabIndex={linkTab}>
                                    {cover.id}
                                </FileLink>
                            )}
                        </span>
                    ))}
                </p>
            )}
            <div id={panelId} className="step-card-more" hidden={!props.expanded}>
                {step.open === undefined ? null : (
                    <p className="step-card-line step-card-open">
                        <FileLink target={step.open} fileResult={links.fileResult} onOpen={links.onOpen} tabIndex={linkTab}>
                            {OPEN_IN_PLAN_LABEL}
                        </FileLink>
                    </p>
                )}
                {step.doText === undefined ? null : (
                    <p className="step-card-line">
                        <span className="step-card-label">{DO_LABEL}</span> {step.doText}
                    </p>
                )}
                {step.verify === undefined ? null : (
                    <p className="step-card-line">
                        <span className="step-card-label">{VERIFY_LABEL}</span> {step.verify}
                    </p>
                )}
            </div>
        </div>
    );
}
