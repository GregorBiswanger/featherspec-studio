import type { McRuns } from '../../../shared/protocol/missionControl';
import { MC_NO_HIGHLIGHTED, MC_RUNS_HEADING, mcRunning, mcRunsUnavailable, mcSpecLabel, mcStatusWord, mcUnreadable } from './texts';

export function RunSection(props: { runs: McRuns }) {
    const { runs } = props;
    return (
        <section data-runs className="mc-runs">
            <h2>{MC_RUNS_HEADING}</h2>
            {runs.available ? (
                <>
                    <p data-running className="mc-running">
                        {mcRunning(runs.running)}
                    </p>
                    {runs.unreadable > 0 ? <p data-unreadable>{mcUnreadable(runs.unreadable)}</p> : null}
                    {runs.highlighted.length === 0 ? (
                        <p>{MC_NO_HIGHLIGHTED}</p>
                    ) : (
                        <ul className="mc-list">
                            {runs.highlighted.map((run) => (
                                <li key={run.runId} data-highlighted={run.runId}>
                                    <span>{mcSpecLabel(run.spec)}</span>
                                    {' — '}
                                    <span data-run-status className={`mc-status mc-status-${run.status.toLowerCase()}`}>
                                        {mcStatusWord(run.status)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            ) : (
                <p>{mcRunsUnavailable(runs.reason)}</p>
            )}
        </section>
    );
}
