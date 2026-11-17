import type { FilterView, RunRowView } from '../../../shared/protocol/agentCenter';
import { runDuration } from '../../../shared/protocol/agentCenterDuration';
import { AC_CLEAR_FILTER, AC_HEADING, AC_HISTORY_INCOMPLETE, AC_HISTORY_UNREADABLE, AC_NOT_AVAILABLE, AC_SPEC_NOT_FOUND, acFilterLabel } from '../../../shared/protocol/agentCenterTexts';
import { isOpenStatusKey } from '../../../shared/protocol/agentCenter';
import { RunStatusChip } from '../../ui/RunStatusChip';
import { formatTime } from '../missionControl/format';
import { useNow } from './store';

export function SpecText(props: { spec: RunRowView['spec'] }) {
    const { spec } = props;
    if (!spec.found) {
        return (
            <span className="ac-spec">
                <span className="ac-spec-missing">{AC_SPEC_NOT_FOUND}</span> <span className="ac-number">{spec.stem}</span>
            </span>
        );
    }
    return (
        <span className="ac-spec">
            <span className="ac-number">{spec.number}</span> {spec.title === null ? null : <span className="ac-title">{spec.title}</span>}
        </span>
    );
}

export function FilterBar(props: { filter: FilterView; onClear: () => void }) {
    return (
        <div className="ac-filter" data-filter>
            <span className="ac-filter-label">{acFilterLabel(props.filter.label)}</span>
            <button type="button" className="ac-button" onClick={props.onClear}>
                {AC_CLEAR_FILTER}
            </button>
        </div>
    );
}

export function RunList(props: { rows: readonly RunRowView[]; filter: FilterView | undefined; onSelect: (runId: string) => void; onClear: () => void; children?: React.ReactNode }) {
    const now = useNow(props.rows.some((row) => isOpenStatusKey(row.status)));
    return (
        <section className="ac-list" aria-label={AC_HEADING}>
            <h2 className="ac-heading">{AC_HEADING}</h2>
            {props.filter === undefined ? null : <FilterBar filter={props.filter} onClear={props.onClear} />}
            {props.children}
            {props.rows.length === 0 ? null : (
                <ul className="ac-runs">
                    {props.rows.map((row) => (
                        <li key={row.runId}>
                            <button type="button" className="ac-row" data-run-row={row.runId} aria-current={row.selected ? 'true' : undefined} onClick={() => props.onSelect(row.runId)}>
                                <span className="ac-row-top">
                                    <SpecText spec={row.spec} />
                                    <RunStatusChip status={row.status} />
                                </span>
                                <span className="ac-row-meta">
                                    <span>{row.provider}</span>
                                    <span>{row.started === undefined ? AC_NOT_AVAILABLE : formatTime(row.started)}</span>
                                    <span>{runDuration(row, now)}</span>
                                    {row.historyIncomplete ? <span className="ac-flag">{AC_HISTORY_INCOMPLETE}</span> : null}
                                    {row.historyUnreadable ? <span className="ac-flag">{AC_HISTORY_UNREADABLE}</span> : null}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
