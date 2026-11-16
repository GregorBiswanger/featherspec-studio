import type { NavigationRequest } from '../../../shared/protocol/messages';
import type { McSpecs } from '../../../shared/protocol/missionControl';
import { RuleText } from '../../ui/RuleText';
import { Drill } from './Drill';
import { stateRequest, totalRequest } from './requests';
import { MC_FORMULA, MC_PROGRESS_UNAVAILABLE, MC_SPECS_HEADING, mcDeprecated, mcDerived, mcProgress, mcTotal } from './texts';

export function SpecFigures(props: { specs: Extract<McSpecs, { kind: 'counts' }>; navigate: (request: NavigationRequest) => void }) {
    const { specs, navigate } = props;
    const { progress } = specs;
    return (
        <section data-specs className="mc-specs">
            <h2>{MC_SPECS_HEADING}</h2>
            <p data-total className="mc-total">
                <Drill id="total" onActivate={() => navigate(totalRequest())}>
                    {mcTotal(specs.total)}
                </Drill>
            </p>
            <ul className="mc-states">
                {specs.states.map((entry) => (
                    <li key={entry.state} data-state-count={entry.state}>
                        <Drill id={`state:${entry.state}`} onActivate={() => navigate(stateRequest(entry.state))}>
                            {entry.state} {entry.count}
                        </Drill>
                        {entry.derivedRule === undefined ? null : (
                            <span className="mc-derived">
                                <RuleText text={mcDerived(entry.derivedRule)} id={entry.derivedRule} />
                            </span>
                        )}
                        {entry.deprecated === undefined ? null : <span className="mc-deprecated">{mcDeprecated(entry.deprecated)}</span>}
                    </li>
                ))}
            </ul>
            <p data-progress className="mc-progress">
                {progress.kind === 'value' ? (
                    <>
                        <span>{mcProgress(progress.percent, progress.done, progress.divisor)}</span> <span className="mc-formula">{MC_FORMULA}</span>
                    </>
                ) : (
                    <span>{MC_PROGRESS_UNAVAILABLE}</span>
                )}
            </p>
        </section>
    );
}
