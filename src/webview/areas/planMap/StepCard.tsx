import { useId } from 'react';
import type { PlanStepView } from '../../../shared/protocol/planMap';
import { COVERS_LABEL, DO_LABEL, FILES_LABEL, OPEN_IN_PLAN_LABEL, REPORTED_LABEL, returnedText, stepLook, VERIFIED_LABEL, VERIFY_LABEL } from '../../../shared/protocol/planMapTexts';
import { StepIcon } from '../../board/icons';
import { CopyButton, type CopyResult } from '../../ui/CopyButton';
import { FileLink, type FileResult } from '../../ui/FileLink';
import { PathText } from '../../ui/PathText';

export interface CardLinks {
    fileResult: FileResult | undefined;
    onOpen(key: string, line: number): void;
    copyResult?: CopyResult | undefined;
    onCopy?(text: string): void;
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
                title={step.title === '' ? step.id : `${step.id} ${step.title}`}
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
            {step.verified === undefined ? null : (
                <p className="step-card-line step-card-verified" title={step.verified.full}>
                    <span className="step-card-label">{VERIFIED_LABEL}</span> {step.verified.short}
                </p>
            )}
            {step.returned === undefined ? null : (
                <p className="step-card-returned" data-returned={step.returned.status} {...(step.returned.reasonFull === undefined ? {} : { title: step.returned.reasonFull })}>
                    {returnedText(step.returned)}
                </p>
            )}
            {step.reported === undefined ? null : (
                <p className="step-card-line step-card-reported" title={step.reported.full}>
                    <span className="step-card-label">{REPORTED_LABEL}</span> {step.reported.short}
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
                            {cover.state === undefined ? null : <span className="step-card-cover-state"> {cover.state}</span>}
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
                {step.copy === undefined || links.onCopy === undefined ? null : (
                    <p className="step-card-line step-card-copy">
                        <CopyButton look="secondary" line={step.copy} copyResult={links.copyResult} onCopy={links.onCopy} tabIndex={linkTab} />
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
