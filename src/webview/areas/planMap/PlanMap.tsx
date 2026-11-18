import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { SpecDetailView } from '../../../shared/protocol/detail';
import type { PlanSpecView, PlanView } from '../../../shared/protocol/planMap';
import { NOT_IN_A_STAGE_TEXT, NO_SPEC_SELECTED_TEXT, noPlanText, OPEN_PLAN_LABEL, planSaysText, specDoneText, SPECS_WITH_PLAN_HEADING } from '../../../shared/protocol/planMapTexts';
import { NO_STEPS_TEXT, PLAN_UNREADABLE_SENTENCE, problemsBadgeText, STEPS_LABEL, stepsDoneText } from '../../../shared/protocol/texts';
import { BadgeIcon } from '../../board/icons';
import { useBoard } from '../../board/boardStore';
import { useShell } from '../../shell';
import { FileLink, type FileResult } from '../../ui/FileLink';
import { InlineText } from '../../ui/InlineText';
import { ProgressBar } from '../../ui/ProgressBar';
import { moveFocus, type Direction, type Grid } from '../../board/focusModel';
import { requestMapFocus, takePendingMapFocus } from './focus';
import { StageRow } from './StageRow';
import { StepCard, type CardLinks } from './StepCard';

const ARROWS: Record<string, Direction> = { ArrowUp: 'left', ArrowDown: 'right', ArrowLeft: 'up', ArrowRight: 'down' };

function gridOf(plan: PlanView): Grid {
    const rows: string[][] = [];
    for (const stage of plan.stages) {
        if (!stage.finished) {
            stage.groups.forEach((group) => rows.push(group.steps.map((step) => step.id)));
        }
    }
    if (plan.staged) {
        if (plan.loose.length > 0) {
            rows.push(plan.loose.map((step) => step.id));
        }
    } else {
        plan.loose.forEach((step) => rows.push([step.id]));
    }
    return rows.filter((row) => row.length > 0);
}

function Stages(props: { plan: PlanView; links: CardLinks }) {
    const { plan, links } = props;
    const root = useRef<HTMLDivElement>(null);
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
    const [stop, setStop] = useState<string | undefined>(undefined);
    const grid = useMemo(() => gridOf(plan), [plan]);
    const tabStop = stop !== undefined && grid.some((row) => row.includes(stop)) ? stop : grid[0]?.[0];
    const toggle = useCallback((id: string) => {
        setExpanded((before) => {
            const next = new Set(before);
            if (!next.delete(id)) {
                next.add(id);
            }
            return next;
        });
    }, []);
    const cards = { expanded, tabStop, onToggle: toggle };
    const onFocus = (event: React.FocusEvent<HTMLElement>): void => {
        const id = (event.target as HTMLElement).closest<HTMLElement>('[data-step-card]')?.getAttribute('data-step-card');
        if (id !== null && id !== undefined && id !== stop) {
            setStop(id);
        }
    };
    const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
        const direction = ARROWS[event.key];
        const id = (event.target as HTMLElement).closest<HTMLElement>('[data-step-card]')?.getAttribute('data-step-card');
        if (direction === undefined || id === null || id === undefined || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
            return;
        }
        event.preventDefault();
        const target = moveFocus(grid, id, direction);
        if (target !== undefined) {
            setStop(target);
            root.current?.querySelector<HTMLElement>(`[data-card-toggle="${target}"]`)?.focus();
        }
    };
    return (
        <div className="plan-stages-map" ref={root} onFocus={onFocus} onKeyDown={onKeyDown}>
            {plan.stages.map((stage) => (
                <StageRow key={stage.number} stage={stage} links={links} cards={cards} />
            ))}
            {plan.loose.length === 0 ? null : plan.staged ? (
                <section className="plan-stage-row" data-stage-row="loose">
                    <h3 className="plan-stage-heading">{NOT_IN_A_STAGE_TEXT}</h3>
                    <div className="plan-stage-groups">
                        <div className="plan-group" data-card-row>
                            {plan.loose.map((step) => (
                                <StepCard key={step.id} step={step} expanded={expanded.has(step.id)} tabStop={tabStop === step.id} links={links} onToggle={toggle} />
                            ))}
                        </div>
                    </div>
                </section>
            ) : (
                <div className="plan-card-list">
                    {plan.loose.map((step) => (
                        <div key={step.id} className="plan-group" data-card-row>
                            <StepCard step={step} expanded={expanded.has(step.id)} tabStop={tabStop === step.id} links={links} onToggle={toggle} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ProblemMark(props: { sentences: string[]; id: string }) {
    const text = props.sentences.join('\n');
    return (
        <>
            <span className="marker card-problems" data-marker="problems" title={text} aria-describedby={props.id}>
                <BadgeIcon kind="diagnostic" /> {problemsBadgeText(props.sentences.length)}
            </span>
            <span id={props.id} className="visually-hidden">
                {text}
            </span>
        </>
    );
}

function SpecButton(props: { spec: PlanSpecView; onSelect(spec: PlanSpecView): void }) {
    const { spec } = props;
    const describedBy = useId();
    const sentences = spec.problems.map((problem) => problem.sentence);
    return (
        <li>
            <button
                type="button"
                className="plan-map-spec"
                data-spec-stem={spec.stem}
                {...(spec.path === undefined ? {} : { 'data-spec-path': spec.path })}
                {...(sentences.length === 0 ? {} : { title: sentences.join('\n'), 'aria-describedby': describedBy })}
                onClick={() => props.onSelect(spec)}
            >
                {sentences.length === 0 ? null : <BadgeIcon kind="diagnostic" />}
                {sentences.length === 0 ? null : ' '}
                {spec.number} {spec.title}
            </button>
            {sentences.length === 0 ? null : (
                <span id={describedBy} className="visually-hidden">
                    {sentences.join('\n')}
                </span>
            )}
        </li>
    );
}

function SpecList(props: { specs: PlanSpecView[]; onSelect(spec: PlanSpecView): void }) {
    if (props.specs.length === 0) {
        return null;
    }
    return (
        <section className="plan-map-specs">
            <h3>{SPECS_WITH_PLAN_HEADING}</h3>
            <ul>
                {props.specs.map((spec) => (
                    <SpecButton key={`${spec.stem}|${spec.path ?? ''}`} spec={spec} onSelect={props.onSelect} />
                ))}
            </ul>
        </section>
    );
}

function Header(props: { detail: SpecDetailView; plan: PlanView; fileResult: FileResult | undefined; onOpen(key: string, line: number): void }) {
    const { detail, plan } = props;
    const headingRef = useRef<HTMLHeadingElement>(null);
    const problemId = useId();
    useEffect(() => {
        if (takePendingMapFocus(detail.stem)) {
            headingRef.current?.focus();
        }
    }, [detail.stem]);
    const sentences = detail.problems.map((problem) => problem.sentence ?? problem.reason);
    return (
        <div className="plan-map-header">
            <div className="plan-map-title">
                <h2 ref={headingRef} tabIndex={-1} data-map-heading data-map-stem={detail.stem}>
                    {detail.number} {detail.title}
                </h2>
                {sentences.length === 0 ? null : <ProblemMark sentences={sentences} id={problemId} />}
            </div>
            {plan.count === undefined ? (
                <p className="progress-absent">{NO_STEPS_TEXT}</p>
            ) : (
                <ProgressBar label={STEPS_LABEL} done={plan.count.done} total={plan.count.total} text={stepsDoneText(plan.count.done, plan.count.total)} />
            )}
            <p className="plan-map-open">
                <FileLink target={plan.plan} fileResult={props.fileResult} onOpen={props.onOpen}>
                    {OPEN_PLAN_LABEL}
                </FileLink>
            </p>
            {plan.closing === undefined ? null : (
                <p className="plan-map-closing">
                    <InlineText text={planSaysText(plan.closing.text)} />
                </p>
            )}
        </div>
    );
}

export function PlanMap() {
    const shell = useShell();
    const { board, detail, fileResult, openFile } = useBoard();
    const selection = shell.view?.selection;
    const specs = board?.planSpecs ?? [];
    const shown: SpecDetailView | undefined =
        selection !== undefined && detail?.kind === 'spec' && detail.stem === selection.stem && (selection.path === undefined || detail.key === selection.path) ? detail : undefined;
    const choose = (spec: PlanSpecView): void => {
        requestMapFocus(spec.stem);
        shell.select(spec.path === undefined ? { stem: spec.stem } : { stem: spec.stem, path: spec.path });
    };
    if (shown !== undefined && shown.plan?.kind === 'plan' && shown.state !== 'Done') {
        return (
            <div className="plan-map" data-plan-map>
                <Header key={shown.key} detail={shown} plan={shown.plan} fileResult={fileResult} onOpen={openFile} />
                <Stages key={`stages|${shown.key}`} plan={shown.plan} links={{ fileResult, onOpen: openFile }} />
            </div>
        );
    }
    const state =
        selection === undefined
            ? NO_SPEC_SELECTED_TEXT
            : shown === undefined
              ? selection.number
              : shown.state === 'Done'
                ? specDoneText(shown.number)
                : shown.plan === undefined
                  ? noPlanText(shown.number)
                  : `${shown.number}: ${PLAN_UNREADABLE_SENTENCE}`;
    return (
        <div className="plan-map" data-plan-map>
            <p className="plan-map-state">{state}</p>
            <SpecList specs={specs} onSelect={choose} />
        </div>
    );
}
