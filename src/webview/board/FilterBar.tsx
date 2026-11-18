import type { BoardView, SortKey } from '../../shared/protocol/board';
import { CLEAR_FILTERS_LABEL, FILTERS_LABEL, FILTER_CHIP_LABEL, SORT_LABEL, SORT_LABELS } from '../../shared/protocol/texts';

export function filterLabel(filter: BoardView['filter']): string | undefined {
    if (filter.set !== undefined) {
        return filter.set.label;
    }
    return filter.states === undefined ? undefined : filter.states.join(', ');
}

export function FilterBar(props: { board: BoardView; setSort(sort: SortKey): void; clearFilters(): void }) {
    const { board } = props;
    const label = filterLabel(board.filter);
    return (
        <div className="filter-bar" role="group" aria-label={FILTERS_LABEL}>
            {label === undefined ? null : (
                <>
                    <span className="set-chip" data-filter-chip>
                        {FILTER_CHIP_LABEL}: <strong>{label}</strong>
                    </span>
                    <button type="button" onClick={props.clearFilters}>
                        {CLEAR_FILTERS_LABEL}
                    </button>
                </>
            )}
            <label className="sort">
                {SORT_LABEL}{' '}
                <select value={board.sort} onChange={(event) => props.setSort(event.target.value as SortKey)}>
                    {board.sortKeys.map((key) => (
                        <option key={key} value={key}>
                            {SORT_LABELS[key]}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    );
}
