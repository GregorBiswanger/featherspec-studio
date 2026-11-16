import type { KeyboardEvent } from 'react';
import type { SpecRow } from '../../shared/protocol/messages';
import { NO_SPECS_TEXT, SPEC_LIST_LABEL, TITLE_NOT_AVAILABLE } from '../../shared/protocol/texts';
import { useShell } from '../shell';

export function SpecExplorer() {
    const shell = useShell();
    const rows = shell.view?.rows ?? [];

    function choose(row: SpecRow): void {
        shell.select(row.showPath ? { stem: row.stem, path: row.path } : { stem: row.stem });
    }

    function onKeyDown(event: KeyboardEvent, row: SpecRow): void {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            choose(row);
        }
    }

    if (rows.length === 0) {
        return <p>{NO_SPECS_TEXT}</p>;
    }
    return (
        <ul role="listbox" aria-label={SPEC_LIST_LABEL} className="spec-list">
            {rows.map((row) => (
                <li
                    key={`${row.stem}|${row.path}`}
                    role="option"
                    tabIndex={0}
                    aria-selected={row.selected}
                    className={row.selected ? 'spec-row selected' : 'spec-row'}
                    onClick={() => choose(row)}
                    onKeyDown={(event) => onKeyDown(event, row)}
                >
                    {row.selected ? <span data-marker aria-hidden="true">▸</span> : null}
                    <span className="spec-number">{row.number}</span> <span className="spec-title">{row.title ?? TITLE_NOT_AVAILABLE}</span>{' '}
                    <span className="spec-state">{row.state}</span>
                    {row.derivedLabel === undefined ? null : <span className="spec-derived"> {row.derivedLabel}</span>}
                    {row.showPath ? <span className="spec-path"> {row.path}</span> : null}
                </li>
            ))}
        </ul>
    );
}
