import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ShellFocus } from '../../../shared/protocol/messages';
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
import { fallbackFocus, moveFocus, type Direction, type Grid } from '../../board/focusModel';
import { cardRowsOf, looseCardKeys, stageCardKeys } from './cardKeys';
import { NextStep } from '../../detail/NextStep';
import { requestMapFocus, takePendingMapFocus } from './focus';
import { StageRow } from './StageRow';
import { StepCard, type CardLinks } from './StepCard';
import { Ways } from './Ways';
import { mapShows } from './shows';
import { focusFor, HIGHLIGHT_MS, markApplied } from './target';
import type { CopyResult } from '../../ui/CopyButton';

const ARROWS: Record<string, Direction> = { ArrowUp: 'left', ArrowDown: 'right', ArrowLeft: 'up', ArrowRight: 'down' };

function cardKeyOf(element: HTMLElement): string | undefined {
    return element.closest<HTMLElement>('[data-card-key]')?.getAttribute('data-card-key') ?? undefined;
}

function toggleOf(box: HTMLElement, key: string): HTMLElement | undefined {
    return [...box.querySelectorAll<HTMLElement>('[data-card-key]')].find((card) => card.getAttribute('data-card-key') === key)?.querySelector<HTMLElement>('[data-card-toggle]') ?? undefined;
}

function cardKeyForStep(plan: PlanView, id: string): { key: string; stage: number | undefined } | undefined {
    for (const stage of plan.stages) {
        const keys = stageCardKeys(stage);
        for (const [index, group] of stage.groups.entries()) {
            const position = group.steps.findIndex((candidate) => candidate.id === id && candidate.state !== 'notFound');
            if (position >= 0) {
                return { key: keys[index]![position]!, stage: stage.finished ? stage.number : undefined };
            }
        }
    }
    const loose = looseCardKeys(plan.loose);
    const index = plan.loose.findIndex((candidate) => candidate.id === id && candidate.state !== 'notFound');
    return index < 0 ? undefined : { key: loose[index]!, stage: undefined };
}

function Stages(props: { plan: PlanView; links: CardLinks; copyResult: CopyResult | undefined; onCopy(text: string): void; stem: string; path: string | undefined; focus: ShellFocus | undefined }) {
    const { plan, links } = props;
    const root = useRef<HTMLDivElement>(null);
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
    const [stop, setStop] = useState<string | undefined>(undefined);
    const grid = useMemo(() => cardRowsOf(plan), [plan]);
    const looseKeys = useMemo(() => looseCardKeys(plan.loose), [plan]);
    const tabStop = stop !== undefined && grid.some((row) => row.includes(stop)) ? stop : grid[0]?.[0];
    const toggle = useCallback((key: string) => {
        setExpanded((before) => {
            const next = new Set(before);
            if (!next.delete(key)) {
                next.add(key);
            }
            return next;
        });
    }, []);
    const [openFinished, setOpenFinished] = useState<ReadonlySet<number>>(() => new Set());
    const [highlight, setHighlight] = useState<{ key: string; n: number } | undefined>(undefined);
    const [waysTarget, setWaysTarget] = useState<{ n: number } | undefined>(undefined);
    const aim = useRef<{ key: string } | undefined>(undefined);
    const pending = focusFor(props.focus, props.stem, props.path);
    useEffect(() => {
        if (pending === undefined) {
            return;
        }
        markApplied(pending);
        if (pending.ways === true) {
            aim.current = undefined;
            setHighlight(undefined);
            if (plan.stages.some((stage) => stage.ways !== undefined)) {
                setWaysTarget({ n: pending.n });
            } else {
                root.current?.closest<HTMLElement>('[data-plan-map]')?.querySelector<HTMLElement>('[data-map-heading]')?.focus();
            }
            return;
        }
        const found = pending.step === undefined ? undefined : cardKeyForStep(plan, pending.step);
        if (found === undefined) {
            aim.current = undefined;
            setHighlight(undefined);
            root.current?.closest<HTMLElement>('[data-plan-map]')?.querySelector<HTMLElement>('[data-map-heading]')?.focus();
            return;
        }
        aim.current = { key: found.key };
        setExpanded((before) => new Set(before).add(found.key));
        if (found.stage !== undefined) {
            setOpenFinished((before) => new Set(before).add(found.stage!));
        }
        setHighlight({ key: found.key, n: pending.n });
    }, [pending?.n]);
    useLayoutEffect(() => {
        const wanted = aim.current;
        const box = root.current;
        if (wanted === undefined || box === null) {
            return;
        }
        const element = toggleOf(box, wanted.key);
        if (element === undefined) {
            return;
        }
        aim.current = undefined;
        element.closest<HTMLElement>('[data-card-key]')?.scrollIntoView({ block: 'nearest' });
        setStop(wanted.key);
        hadFocus.current = { card: wanted.key };
        element.focus();
    });
    useEffect(() => {
        if (highlight === undefined) {
            return;
        }
        const timer = setTimeout(() => setHighlight(undefined), HIGHLIGHT_MS);
        return () => clearTimeout(timer);
    }, [highlight]);
    const cards = { expanded, tabStop, onToggle: toggle, highlighted: highlight?.key, openFinished };
    const hadFocus = useRef<{ card: string | undefined } | undefined>(undefined);
    const previous = useRef<Grid>(grid);
    useLayoutEffect(() => {
        const was = hadFocus.current;
        const before = previous.current;
        previous.current = grid;
        if (was === undefined || before === grid) {
            return;
        }
        const box = root.current;
        if (box === null || box.contains(document.activeElement)) {
            return;
        }
        const target = was.card === undefined ? undefined : fallbackFocus(before, was.card, grid);
        const element = target === undefined ? undefined : toggleOf(box, target);
        if (target !== undefined && element !== undefined) {
            setStop(target);
            hadFocus.current = { card: target };
            element.focus();
            return;
        }
        hadFocus.current = undefined;
        box.closest<HTMLElement>('[data-plan-map]')?.querySelector<HTMLElement>('[data-map-heading]')?.focus();
    }, [grid]);
    const onBlur = (event: React.FocusEvent<HTMLElement>): void => {
        if ((event.target as HTMLElement).isConnected) {
            hadFocus.current = undefined;
        }
    };
    const onFocus = (event: React.FocusEvent<HTMLElement>): void => {
        const key = cardKeyOf(event.target as HTMLElement);
        hadFocus.current = { card: key };
        if (key !== undefined && key !== stop) {
            setStop(key);
        }
    };
    const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
        const direction = ARROWS[event.key];
        const key = cardKeyOf(event.target as HTMLElement);
        if (direction === undefined || key === undefined || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
            return;
        }
        event.preventDefault();
        const target = moveFocus(grid, key, direction);
        if (target !== undefined) {
            setStop(target);
            hadFocus.current = { card: target };
            if (root.current !== null) {
                toggleOf(root.current, target)?.focus();
            }
        }
    };
    return (
        <div className="plan-stages-map" ref={root} onFocus={onFocus} onBlur={onBlur} onKeyDown={onKeyDown}>
            {plan.stages.map((stage) => (
                <StageRow
                    key={stage.number}
                    stage={stage}
                    links={links}
                    cards={cards}
                    {...(stage.ways === undefined ? {} : { ways: <Ways ways={stage.ways} {...(waysTarget === undefined ? {} : { target: waysTarget })} copyResult={props.copyResult} onCopy={props.onCopy} /> })}
                />
            ))}
            {plan.loose.length === 0 ? null : plan.staged ? (
                <section className="plan-stage-row" data-stage-row="loose">
                    <h3 className="plan-stage-heading">{NOT_IN_A_STAGE_TEXT}</h3>
                    <div className="plan-stage-groups">
                        <div className="plan-group" data-card-row>
                            {plan.loose.map((step, index) => (
                                <StepCard key={looseKeys[index]} cardKey={looseKeys[index]!} step={step} expanded={expanded.has(looseKeys[index]!)} tabStop={tabStop === looseKeys[index]} highlighted={highlight?.key === looseKeys[index]} links={links} onToggle={toggle} />
                            ))}
                        </div>
                    </div>
                </section>
            ) : (
                <div className="plan-card-list">
                    {plan.loose.map((step, index) => (
                        <div key={looseKeys[index]} className="plan-group" data-card-row>
                            <StepCard cardKey={looseKeys[index]!} step={step} expanded={expanded.has(looseKeys[index]!)} tabStop={tabStop === looseKeys[index]} highlighted={highlight?.key === looseKeys[index]} links={links} onToggle={toggle} />
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
    const { copyResult, copyText, sendResult, sendPrompt } = useBoard();
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
            <NextStep place="map" nextStep={detail.nextStep} fileResult={props.fileResult} onOpen={props.onOpen} copyResult={copyResult} onCopy={copyText} sendResult={sendResult} onSend={sendPrompt} />
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
    const { board, detail, fileResult, openFile, copyResult, copyText } = useBoard();
    const selection = shell.view?.selection;
    const specs = board?.planSpecs ?? [];
    const shown: SpecDetailView | undefined =
        selection !== undefined && detail?.kind === 'spec' && detail.stem === selection.stem && (selection.path === undefined || detail.key === selection.path) ? detail : undefined;
    const mapped = mapShows(detail, selection);
    const choose = (spec: PlanSpecView): void => {
        requestMapFocus(spec.stem);
        shell.select(spec.path === undefined ? { stem: spec.stem } : { stem: spec.stem, path: spec.path });
    };
    if (mapped !== undefined) {
        const shown = mapped;
        return (
            <div className="plan-map" data-plan-map>
                <Header key={shown.key} detail={shown} plan={shown.plan} fileResult={fileResult} onOpen={openFile} />
                <Stages key={`stages|${shown.key}`} plan={shown.plan} links={{ fileResult, onOpen: openFile }} copyResult={copyResult} onCopy={copyText} stem={shown.stem} path={shown.path} focus={shell.focus} />
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
