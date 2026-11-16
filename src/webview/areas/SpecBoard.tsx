import { useEffect } from 'react';
import type { CardView } from '../../shared/protocol/board';
import { BOARD_LABEL, NO_SPECS_BOARD_TEXT } from '../../shared/protocol/texts';
import { useShell } from '../shell';
import { Banner } from '../board/Banner';
import { useBoard } from '../board/boardStore';
import { Column } from '../board/Column';
import { FilterBar } from '../board/FilterBar';

export function SpecBoard() {
    const shell = useShell();
    const api = useBoard();
    const { board } = api;
    const { dismissMove } = api;
    useEffect(() => () => dismissMove(), [dismissMove]);

    function open(card: CardView): void {
        shell.navigate({ area: 'specExplorer', target: card.path === undefined ? { kind: 'spec', stem: card.stem } : { kind: 'spec', stem: card.stem, path: card.path } });
    }

    if (board === undefined) {
        return <div className="board" aria-label={BOARD_LABEL} />;
    }
    return (
        <div className="board" aria-label={BOARD_LABEL}>
            <Banner lines={board.banner} />
            {board.noSpecs ? <p className="board-empty">{NO_SPECS_BOARD_TEXT}</p> : null}
            <FilterBar board={board} setFilter={api.setFilter} setSort={api.setSort} clearFilters={api.clearFilters} />
            <div className="columns">
                {board.columns.map((column) => (
                    <Column key={column.state} column={column} onOpen={open} />
                ))}
            </div>
        </div>
    );
}
