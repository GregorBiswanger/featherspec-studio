import type { PlanStepView } from '../../shared/protocol/planMap';
import { chipName, stepLook } from '../../shared/protocol/planMapTexts';
import { FileLink, type FileResult } from './FileLink';

export function StepChip(props: { step: PlanStepView; fileResult: FileResult | undefined; onOpen(key: string, line: number): void }) {
    const { step } = props;
    const look = stepLook(step);
    const name = chipName(step.id, step.title, look.word);
    const label = step.state === 'dropped' ? <s>{step.id}</s> : <>{step.id}</>;
    const symbol = look.symbol === undefined ? null : <span className="chip-symbol" aria-hidden="true">{look.symbol} </span>;
    if (step.open === undefined) {
        return (
            <span className="step-chip" data-step-chip data-state={step.state} title={name}>
                {symbol}
                {label}
                <span className="visually-hidden">, {look.word}</span>
            </span>
        );
    }
    return (
        <span className="step-chip" data-step-chip data-state={step.state}>
            <FileLink target={step.open} fileResult={props.fileResult} onOpen={props.onOpen} label={name} reason={name}>
                {symbol}
                {label}
            </FileLink>
        </span>
    );
}
