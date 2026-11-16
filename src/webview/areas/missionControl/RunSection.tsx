import type { NavigationRequest } from '../../../shared/protocol/messages';
import type { McRuns } from '../../../shared/protocol/missionControl';
import { Glyph } from '../../board/icons';
import { Drill } from './Drill';
import { runRequest, runningRequest } from './requests';
import { SpecLabel } from './SpecLabel';
import { MC_NO_HIGHLIGHTED, MC_RUNS_HEADING, mcRunning, mcRunsUnavailable, mcStatusWord, mcUnreadable } from './texts';

export function RunSection(props: { runs: McRuns; navigate: (request: NavigationRequest) => void }) {
    const { runs, navigate } = props;
    return (
        <section data-runs className="mc-runs mc-panel">
            <h2>{MC_RUNS_HEADING}</h2>
            {runs.available ? (
                <>
                    <p data-running className="mc-running">
                        <Drill id="running" onActivate={() => navigate(runningRequest(runs))}>
                            {mcRunning(runs.running)}
                        </Drill>
                    </p>
                    {runs.unreadable > 0 ? <p data-unreadable className="mc-note">{mcUnreadable(runs.unreadable)}</p> : null}
                    {runs.highlighted.length === 0 ? (
                        <p className="mc-empty">
                            <Glyph kind="empty" />
                            {MC_NO_HIGHLIGHTED}
                        </p>
                    ) : (
                        <ul className="mc-list">
                            {runs.highlighted.map((run) => (
                                <li key={run.runId} data-highlighted={run.runId}>
                                    <Drill id={`run:${run.runId}`} className="mc-row" onActivate={() => navigate(runRequest(run))}>
                                        <SpecLabel spec={run.spec} />
                                        <span className="mc-sep">{' — '}</span>
                                        <span data-run-status className={`mc-status mc-status-${run.status.toLowerCase()}`}>
                                            <Glyph kind={run.status === 'Failed' ? 'failed' : 'interrupted'} />
                                            {mcStatusWord(run.status)}
                                        </span>
                                    </Drill>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            ) : (
                <p className="mc-note">{mcRunsUnavailable(runs.reason)}</p>
            )}
        </section>
    );
}
