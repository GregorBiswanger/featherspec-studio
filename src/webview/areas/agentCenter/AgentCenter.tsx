import { AC_NO_MATCH, AC_NO_RUNS, AC_PICK_A_RUN, acRunsUnavailable } from '../../../shared/protocol/agentCenterTexts';
import { useShell } from '../../shell';
import { EmptyState } from '../../ui/EmptyState';
import { RunDetail } from './RunDetail';
import { Timeline } from './Timeline';
import { RunList } from './RunList';
import { useAgentCenter } from './store';

export function AgentCenter() {
    const { view, timeline, client } = useAgentCenter();
    const shell = useShell();
    if (view === undefined) {
        return <div data-agent-center-empty className="agent-center" />;
    }
    if (view.kind === 'unavailable') {
        return (
            <div data-agent-center className="agent-center">
                <EmptyState icon="info" className="ac-empty" data-ac-unavailable>
                    {acRunsUnavailable(view.reason)}
                </EmptyState>
            </div>
        );
    }
    if (view.empty === 'no-runs') {
        return (
            <div data-agent-center className="agent-center">
                <EmptyState icon="Active" className="ac-empty">
                    {AC_NO_RUNS}
                </EmptyState>
            </div>
        );
    }
    const detail = view.detail;
    const runId = detail?.header.runId;
    return (
        <div data-agent-center className="agent-center ac">
            {view.notice === undefined ? null : (
                <div data-ac-notice role="status" className="notice">
                    <span>{view.notice}</span>
                </div>
            )}
            <div className="ac-panes">
                <RunList rows={view.rows} filter={view.filter} onSelect={client.acSelect} onClear={client.acClearFilter}>
                    {view.empty === 'no-match' ? (
                        <EmptyState icon="empty" className="ac-empty-list">
                            {AC_NO_MATCH}
                        </EmptyState>
                    ) : null}
                </RunList>
                {detail === undefined || runId === undefined ? (
                    <div className="ac-detail ac-detail-empty">
                        <EmptyState icon="info">{AC_PICK_A_RUN}</EmptyState>
                    </div>
                ) : (
                    <RunDetail
                        detail={detail}
                        controls={view.controls}
                        handlers={{
                            onAnswer: (requestId, answer) => client.acAnswer(runId, requestId, answer),
                            onCancel: () => client.acCancel(runId),
                            onResume: () => client.acResume(runId),
                            onOpenSpec: () => {
                                const { stem, path } = detail.header.spec;
                                shell.navigate({ area: 'specExplorer', target: path === undefined ? { kind: 'spec', stem } : { kind: 'spec', stem, path } });
                            },
                            onOpenFile: (path) => client.acOpenFile(runId, path),
                        }}
                    >
                        <Timeline runId={runId} timeline={timeline} client={client} />
                    </RunDetail>
                )}
            </div>
        </div>
    );
}
