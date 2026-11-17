import { SORT_KEYS, type BoardView, type SortKey } from '../../shared/protocol/board';
import { BOARD_STATES, type BoardFilter, type BoardState } from '../../shared/protocol/boardFilter';
import { CLEAR_FILTERS_LABEL, SORT_LABEL, SORT_LABELS, SPEC_SET_LABEL, STATE_FILTER_LABEL } from '../../shared/protocol/texts';

function toggle<T>(values: readonly T[] | undefined, value: T): T[] | undefined {
    const current = values ?? [];
    const next = current.includes(value) ? current.filter((candidate) => candidate !== value) : [...current, value];
    return next.length === 0 ? undefined : next;
}

function withKey<K extends keyof BoardFilter>(filter: BoardFilter, key: K, value: BoardFilter[K] | undefined): BoardFilter {
    const { [key]: _removed, ...rest } = filter;
    void _removed;
    return value === undefined ? rest : { ...rest, [key]: value };
}

export function FilterBar(props: { board: BoardView; setFilter(filter: BoardFilter): void; setSort(sort: SortKey): void; clearFilters(): void }) {
    const { board } = props;
    const { filter } = board;
    const isSet = filter.states !== undefined || filter.set !== undefined;
    return (
        <div className="filter-bar" role="group" aria-label="Filters">
            <fieldset>
                <legend>{STATE_FILTER_LABEL}</legend>
                {BOARD_STATES.map((state: BoardState) => (
                    <label key={state}>
                        <input type="checkbox" checked={filter.states?.includes(state) ?? false} onChange={() => props.setFilter(withKey(filter, 'states', toggle(filter.states, state)))} /> {state}
                    </label>
                ))}
            </fieldset>
            {filter.set === undefined ? null : (
                <span className="set-chip" data-set-chip>
                    {SPEC_SET_LABEL}: <strong>{filter.set.label}</strong>
                </span>
            )}
            <label className="sort">
                {SORT_LABEL}{' '}
                <select value={board.sort} onChange={(event) => props.setSort(event.target.value as SortKey)}>
                    {SORT_KEYS.map((key) => (
                        <option key={key} value={key}>
                            {SORT_LABELS[key]}
                        </option>
                    ))}
                </select>
            </label>
            {isSet ? (
                <button type="button" onClick={props.clearFilters}>
                    {CLEAR_FILTERS_LABEL}
                </button>
            ) : null}
        </div>
    );
}
