import type { BoardState } from '../../shared/protocol/boardFilter';
import { StateIcon } from '../board/icons';

export function StateChip(props: { state: BoardState; tooltip?: string }) {
    return (
        <span className="state-chip" data-board-state={props.state} title={props.tooltip}>
            <StateIcon state={props.state} />
            <span className="state-chip-label">{props.state}</span>
        </span>
    );
}
