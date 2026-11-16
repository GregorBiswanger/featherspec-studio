import type { KeyboardEvent } from "react";
import { isBoardState } from "../../shared/protocol/boardFilter";
import type { SpecRow } from "../../shared/protocol/messages";
import {
  NO_SPECS_TEXT,
  SPEC_LIST_LABEL,
  TITLE_NOT_AVAILABLE,
} from "../../shared/protocol/texts";
import { useBoard } from "../board/boardStore";
import { SpecDetail } from "../detail/SpecDetail";
import { useShell } from "../shell";
import { StateChip } from "../ui/StateChip";

export function SpecExplorer() {
  const shell = useShell();
  const rows = shell.view?.rows ?? [];
  const { detail, fileResult, openFile } = useBoard();

  function choose(row: SpecRow): void {
    shell.select(
      row.showPath ? { stem: row.stem, path: row.path } : { stem: row.stem },
    );
  }

  function onKeyDown(event: KeyboardEvent, row: SpecRow): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(row);
    }
  }

  const list =
    rows.length === 0 ? (
      <p>{NO_SPECS_TEXT}</p>
    ) : (
      <ul role="listbox" aria-label={SPEC_LIST_LABEL} className="spec-list">
        {rows.map((row) => (
          <li
            key={`${row.stem}|${row.path}`}
            role="option"
            tabIndex={0}
            aria-selected={row.selected}
            className={row.selected ? "spec-row selected" : "spec-row"}
            onClick={() => choose(row)}
            onKeyDown={(event) => onKeyDown(event, row)}
          >
            {row.selected ? (
              <span data-marker aria-hidden="true">
                ▸
              </span>
            ) : null}
            <span className="spec-number">{row.number}</span>{" "}
            <span className="spec-title">
              {row.title ?? TITLE_NOT_AVAILABLE}
            </span>{" "}
            <span className="spec-meta">
              <span className="spec-state">
                {isBoardState(row.state) ? (
                  <StateChip state={row.state} />
                ) : (
                  row.state
                )}
              </span>
              {row.derivedLabel === undefined ? null : (
                <span className="spec-derived"> {row.derivedLabel}</span>
              )}
              {row.showPath ? (
                <span className="spec-path"> {row.path}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    );
  return (
    <div className="explorer">
      {list}
      <SpecDetail detail={detail} fileResult={fileResult} onOpen={openFile} />
    </div>
  );
}
