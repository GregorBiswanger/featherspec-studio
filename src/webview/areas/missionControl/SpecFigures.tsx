import type { McSpecs } from '../../../shared/protocol/missionControl';
import { MC_FORMULA, MC_PROGRESS_UNAVAILABLE, MC_SPECS_HEADING, mcDeprecated, mcDerived, mcProgress, mcTotal } from './texts';

export function SpecFigures(props: { specs: Extract<McSpecs, { kind: 'counts' }> }) {
    const { specs } = props;
    const { progress } = specs;
    return (
        <section data-specs className="mc-specs">
            <h2>{MC_SPECS_HEADING}</h2>
            <p data-total className="mc-total">
                {mcTotal(specs.total)}
            </p>
            <ul className="mc-states">
                {specs.states.map((entry) => (
                    <li key={entry.state} data-state-count={entry.state}>
                        <span className="mc-state-name">{entry.state}</span> <span className="mc-state-count">{entry.count}</span>
                        {entry.derivedRule === undefined ? null : <span className="mc-derived">{mcDerived(entry.derivedRule)}</span>}
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
