import type { NavigationRequest } from '../../../shared/protocol/messages';
import type { McSpecs } from '../../../shared/protocol/overview';
import { StateIcon } from '../../board/icons';
import { derivedTooltip } from '../../../shared/protocol/texts';
import { RuleText } from '../../ui/RuleText';
import { Drill } from './Drill';
import { stateRequest, totalRequest } from './requests';
import { MC_DISTRIBUTION_LABEL, MC_FORMULA, MC_PROGRESS_UNAVAILABLE, MC_SPECS_HEADING, mcDeprecated, mcDerived, mcProgress, mcSegment, mcTotal } from './texts';

function share(count: number, total: number): string {
    return `${Math.round((count / total) * 1000) / 10}%`;
}

export function SpecFigures(props: { specs: Extract<McSpecs, { kind: 'counts' }>; navigate: (request: NavigationRequest) => void }) {
    const { specs, navigate } = props;
    const { progress } = specs;
    const present = specs.states.filter((entry) => entry.count > 0);
    return (
        <section data-specs className="ov-specs">
            <div className="ov-section-head">
                <h2>{MC_SPECS_HEADING}</h2>
                <p data-total className="ov-total">
                    <Drill id="total" onActivate={() => navigate(totalRequest())}>
                        {mcTotal(specs.total)}
                    </Drill>
                </p>
            </div>
            <ul className="ov-tiles">
                {specs.states.map((entry) => (
                    <li key={entry.state} data-state-count={entry.state}>
                        <Drill id={`state:${entry.state}`} className={entry.count === 0 ? 'ov-tile ov-tile-zero' : 'ov-tile'} state={entry.state} onActivate={() => navigate(stateRequest(entry.state))}>
                            <span className="ov-tile-name">{entry.state}</span> <span className="ov-tile-count">{entry.count}</span>
                            <StateIcon state={entry.state} />
                            {entry.derivedRule === undefined ? null : (
                                <span className="ov-tile-sub">
                                    <RuleText text={mcDerived(entry.derivedRule)} tooltip={derivedTooltip(entry.derivedRule)} />
                                </span>
                            )}
                            {entry.deprecated === undefined ? null : <span className="ov-tile-sub">{mcDeprecated(entry.deprecated)}</span>}
                        </Drill>
                    </li>
                ))}
            </ul>
            {specs.total > 0 && present.length > 0 ? (
                <div className="ov-distribution" role="group" aria-label={MC_DISTRIBUTION_LABEL}>
                    {present.map((entry) => (
                        <span key={entry.state} className="ov-segment" role="img" data-board-state={entry.state} aria-label={mcSegment(entry.state, entry.count, specs.total)} title={mcSegment(entry.state, entry.count, specs.total)} style={{ width: share(entry.count, specs.total) }} />
                    ))}
                </div>
            ) : null}
            <p data-progress className="ov-progress" title={progress.kind === 'value' ? MC_FORMULA : undefined}>
                {progress.kind === 'value' ? (
                    <>
                        <span className="ov-progress-figure">{mcProgress(progress.percent, progress.done, progress.divisor)}</span> <span className="ov-formula">{MC_FORMULA}</span>
                    </>
                ) : (
                    <span>{MC_PROGRESS_UNAVAILABLE}</span>
                )}
            </p>
        </section>
    );
}
