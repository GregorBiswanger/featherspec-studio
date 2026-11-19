import type { CriteriaProgress, ProgressView, StepsProgress } from '../../shared/protocol/detail';
import {
    BUILT_MARK,
    CRITERIA_LABEL,
    CRITERIA_NO_TABLE_TEXT,
    criteriaVerifiedText,
    needTooltip,
    NEXT_OPEN_STEP_LABEL,
    NO_PLAN_TEXT,
    NO_STEPS_TEXT,
    NOT_VERIFIED_YET_LABEL,
    PLAN_UNREADABLE_TEXT,
    PROGRESS_HEADING,
    STEPS_LABEL,
    stepsDoneText,
} from '../../shared/protocol/texts';
import { FileLink, type FileResult } from '../ui/FileLink';
import { ProgressBar } from '../ui/ProgressBar';
import { PlainSection } from './DetailSection';
import { identityKeys } from './identityKeys';

type OpenAt = (key: string, line: number) => void;

function Steps(props: { steps: StepsProgress; fileResult: FileResult | undefined; onOpen: OpenAt }) {
    const { steps } = props;
    return (
        <div className="progress-row">
            <span className="progress-label">{STEPS_LABEL}</span>
            {steps.kind === 'steps' ? (
                <>
                    <ProgressBar label={STEPS_LABEL} done={steps.done} total={steps.total} text={stepsDoneText(steps.done, steps.total)} />
                    {steps.returned === undefined ? null : <p className="progress-returned">{steps.returned}</p>}
                    {steps.next === undefined ? null : (
                        <p className="progress-next">
                            {NEXT_OPEN_STEP_LABEL}{' '}
                            <FileLink target={steps.next.open} fileResult={props.fileResult} onOpen={props.onOpen}>
                                {steps.next.id}
                            </FileLink>{' '}
                            {steps.next.title}
                        </p>
                    )}
                </>
            ) : (
                <p className="progress-absent">{steps.kind === 'none' ? NO_STEPS_TEXT : PLAN_UNREADABLE_TEXT}</p>
            )}
        </div>
    );
}

function Criteria(props: { criteria: CriteriaProgress; fileResult: FileResult | undefined; onOpen: OpenAt }) {
    const { criteria } = props;
    const keys = criteria.kind === 'criteria' ? identityKeys(criteria.open, (item) => `${item.id ?? item.text}|${item.open.key}|${item.open.line}`) : [];
    return (
        <div className="progress-row">
            <span className="progress-label">{CRITERIA_LABEL}</span>
            {criteria.kind === 'criteria' ? (
                <>
                    <ProgressBar label={CRITERIA_LABEL} done={criteria.verified} total={criteria.total} text={criteriaVerifiedText(criteria.verified, criteria.total)} />
                    {criteria.open.length === 0 ? null : (
                        <>
                            <p className="progress-open-label">{NOT_VERIFIED_YET_LABEL}</p>
                            <ul className="criteria-open">
                                {criteria.open.map((item, index) => (
                                    <li key={keys[index]}>
                                        {item.id === undefined ? (
                                            <FileLink target={item.open} fileResult={props.fileResult} onOpen={props.onOpen}>
                                                {item.text}
                                            </FileLink>
                                        ) : (
                                            <>
                                                <FileLink target={item.open} fileResult={props.fileResult} onOpen={props.onOpen}>
                                                    {item.id}
                                                </FileLink>{' '}
                                                {item.text}
                                            </>
                                        )}
                                        {item.built ? BUILT_MARK : null}
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </>
            ) : (
                <p className="progress-absent">{criteria.reason === 'no-table' ? CRITERIA_NO_TABLE_TEXT : PLAN_UNREADABLE_TEXT}</p>
            )}
        </div>
    );
}

export function Progress(props: { progress: ProgressView; fileResult: FileResult | undefined; onOpen: OpenAt; withSteps?: boolean }) {
    const { progress } = props;
    return (
        <PlainSection title={PROGRESS_HEADING}>
            {progress.needs.length === 0 ? null : (
                <ul className="detail-needs">
                    {progress.needs.map((need) => (
                        <li key={need.rule} title={needTooltip(need.rule)}>
                            {need.text}
                        </li>
                    ))}
                </ul>
            )}
            {progress.noPlan ? <p>{NO_PLAN_TEXT}</p> : null}
            {progress.steps === undefined || props.withSteps === false ? null : <Steps steps={progress.steps} fileResult={props.fileResult} onOpen={props.onOpen} />}
            {progress.criteria === undefined ? null : <Criteria criteria={progress.criteria} fileResult={props.fileResult} onOpen={props.onOpen} />}
        </PlainSection>
    );
}
