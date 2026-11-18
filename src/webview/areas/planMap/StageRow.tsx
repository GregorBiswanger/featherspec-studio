import type { ReactNode } from 'react';
import type { PlanStageView } from '../../../shared/protocol/planMap';
import { ALL_RETURNED_TEXT, stageHeading, STAGE_KIND_TEXTS, stageReturnedText } from '../../../shared/protocol/planMapTexts';
import { StepChip } from '../../ui/StepChip';
import { stageCardKeys } from './cardKeys';
import { StepCard, type CardLinks } from './StepCard';

export interface CardState {
    expanded: ReadonlySet<string>;
    tabStop: string | undefined;
    onToggle(key: string): void;
}

export function StageRow(props: { stage: PlanStageView; links: CardLinks; cards: CardState; ways?: ReactNode }) {
    const { stage, links, cards } = props;
    const kind = STAGE_KIND_TEXTS[stage.kind];
    const steps = stage.groups.flatMap((group) => group.steps);
    const keys = stageCardKeys(stage);
    const allReturned = stage.returned !== undefined && stage.returned.m > 0 && stage.returned.n === stage.returned.m;
    return (
        <section className="plan-stage-row" data-stage-row={stage.number} data-stage-kind={stage.kind} {...(stage.current ? { 'data-current': '' } : {})} {...(stage.finished ? { 'data-finished': '' } : {})}>
            <h3 className="plan-stage-heading">{stageHeading(stage.number, stage.description)}</h3>
            {kind === undefined ? null : <p className="plan-stage-kind">{kind}</p>}
            {stage.returned === undefined ? null : (
                <p className="plan-stage-returned">{allReturned ? ALL_RETURNED_TEXT : stageReturnedText(stage.returned.n, stage.returned.m)}</p>
            )}
            {stage.finished ? (
                <p className="plan-stage-chips">
                    {steps.map((step) => (
                        <span key={step.id}>
                            <StepChip step={step} fileResult={links.fileResult} onOpen={links.onOpen} />{' '}
                        </span>
                    ))}
                </p>
            ) : (
                <div className="plan-stage-groups">
                    {stage.groups.map((group, index) => (
                        <div key={group.steps.map((step) => step.id).join('|') || index} className="plan-group-wrap">
                            {group.sep === undefined ? null : (
                                <p className="plan-arrow" aria-hidden="true">
                                    {group.sep}
                                </p>
                            )}
                            <div className="plan-group" data-card-row>
                                {group.steps.map((step, position) => (
                                    <StepCard
                                        key={keys[index]![position]}
                                        cardKey={keys[index]![position]!}
                                        step={step}
                                        expanded={cards.expanded.has(keys[index]![position]!)}
                                        tabStop={cards.tabStop === keys[index]![position]}
                                        links={links}
                                        onToggle={cards.onToggle}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {props.ways}
        </section>
    );
}
