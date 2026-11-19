import { Fragment } from 'react';
import type { PlanGroupView, PlanStageView, PlanStepView, PlanView } from '../../shared/protocol/planMap';
import { CAN_RUN_PARALLEL_TEXT, NOT_IN_A_STAGE_TEXT, OPEN_PLAN_MAP_LABEL, PLAN_HEADING, planSaysText } from '../../shared/protocol/planMapTexts';
import { NO_STEPS_TEXT, STEPS_LABEL, stepsDoneText } from '../../shared/protocol/texts';
import type { FileResult } from '../ui/FileLink';
import { ProgressBar } from '../ui/ProgressBar';
import { StepChip } from '../ui/StepChip';
import { PlainSection } from './DetailSection';

type OpenAt = (key: string, line: number) => void;

function Chips(props: { steps: PlanStepView[]; fileResult: FileResult | undefined; onOpen: OpenAt; separator: '‖' | undefined }) {
    return (
        <>
            {props.steps.map((step, index) => (
                <Fragment key={`${step.id}|${index}`}>
                    {index === 0 || props.separator === undefined ? null : (
                        <span className="plan-sep" aria-hidden="true">
                            {' '}
                            {props.separator}{' '}
                        </span>
                    )}
                    {index > 0 && props.separator === undefined ? ' ' : null}
                    <StepChip step={step} fileResult={props.fileResult} onOpen={props.onOpen} />
                </Fragment>
            ))}
        </>
    );
}

function Groups(props: { groups: PlanGroupView[]; fileResult: FileResult | undefined; onOpen: OpenAt }) {
    return (
        <>
            {props.groups.map((group, index) => (
                <Fragment key={index}>
                    {index === 0 ? null : (
                        <span className="plan-sep" aria-hidden="true">
                            {' '}
                            {group.sep ?? ''}{' '}
                        </span>
                    )}
                    <Chips steps={group.steps} fileResult={props.fileResult} onOpen={props.onOpen} separator="‖" />
                </Fragment>
            ))}
        </>
    );
}

function Stage(props: { stage: PlanStageView; fileResult: FileResult | undefined; onOpen: OpenAt }) {
    const { stage } = props;
    return (
        <li data-stage={stage.number} className="plan-stage">
            <span className="plan-stage-number">{stage.number}</span> <Groups groups={stage.groups} fileResult={props.fileResult} onOpen={props.onOpen} />
            {stage.parallel ? (
                <>
                    {' '}
                    <span className="plan-parallel">{CAN_RUN_PARALLEL_TEXT}</span>
                </>
            ) : null}
        </li>
    );
}

export function PlanSection(props: { plan: PlanView; fileResult: FileResult | undefined; onOpen: OpenAt; onOpenMap(): void }) {
    const { plan } = props;
    return (
        <PlainSection title={PLAN_HEADING}>
            {plan.count === undefined ? (
                <p className="progress-absent">{NO_STEPS_TEXT}</p>
            ) : (
                <ProgressBar label={STEPS_LABEL} done={plan.count.done} total={plan.count.total} text={stepsDoneText(plan.count.done, plan.count.total)} />
            )}
            {plan.returned === undefined ? null : <p className="plan-returned">{plan.returned}</p>}
            {plan.closing === undefined ? null : (
                <p className="plan-closing" title={planSaysText(plan.closing.full)}>
                    {planSaysText(plan.closing.short)}
                </p>
            )}
            {plan.staged ? (
                <ol className="plan-stages">
                    {plan.stages.map((stage) => (
                        <Stage key={stage.number} stage={stage} fileResult={props.fileResult} onOpen={props.onOpen} />
                    ))}
                    {plan.loose.length === 0 ? null : (
                        <li className="plan-stage plan-loose">
                            <span className="plan-loose-label">{NOT_IN_A_STAGE_TEXT}</span> <Chips steps={plan.loose} fileResult={props.fileResult} onOpen={props.onOpen} separator={undefined} />
                        </li>
                    )}
                </ol>
            ) : plan.loose.length === 0 ? null : (
                <p className="plan-chips">
                    <Chips steps={plan.loose} fileResult={props.fileResult} onOpen={props.onOpen} separator={undefined} />
                </p>
            )}
            <p className="plan-map-link">
                <button type="button" className="file-link" onClick={props.onOpenMap}>
                    {OPEN_PLAN_MAP_LABEL}
                </button>
            </p>
        </PlainSection>
    );
}
