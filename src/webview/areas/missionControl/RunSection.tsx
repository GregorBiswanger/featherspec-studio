import type { NavigationRequest } from '../../../shared/protocol/messages';
import type { McRuns } from '../../../shared/protocol/missionControl';
import { Drill } from './Drill';
import { runRequest, runningRequest } from './requests';
import { MC_NO_HIGHLIGHTED, MC_RUNS_HEADING, mcRunning, mcRunsUnavailable, mcSpecLabel, mcStatusWord, mcUnreadable } from './texts';

export function RunSection(props: { runs: McRuns; navigate: (request: NavigationRequest) => void }) {
    const { runs, navigate } = props;
    return (
        <section data-runs className="mc-runs">
            <h2>{MC_RUNS_HEADING}</h2>
            {runs.available ? (
                <>
                    <p data-running className="mc-running">
                        <Drill id="running" onActivate={() => navigate(runningRequest(runs))}>
                            {mcRunning(runs.running)}
                        </Drill>
                    </p>
                    {runs.unreadable > 0 ? <p data-unreadable>{mcUnreadable(runs.unreadable)}</p> : null}
                    {runs.highlighted.length === 0 ? (
                        <p>{MC_NO_HIGHLIGHTED}</p>
                    ) : (
                        <ul className="mc-list">
                            {runs.highlighted.map((run) => (
                                <li key={run.runId} data-highlighted={run.runId}>
                                    <Drill id={`run:${run.runId}`} onActivate={() => navigate(runRequest(run))}>
                                        <span>{mcSpecLabel(run.spec)}</span>
                                        {' — '}
                                        <span data-run-status className={`mc-status mc-status-${run.status.toLowerCase()}`}>
                                            {mcStatusWord(run.status)}
                                        </span>
                                    </Drill>
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
