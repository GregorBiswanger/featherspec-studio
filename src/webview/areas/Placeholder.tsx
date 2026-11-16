import type { AreaInfo } from '../../shared/protocol/areas';
import { PLACEHOLDER_TEXT } from '../../shared/protocol/texts';
import { Glyph } from '../board/icons';

export function Placeholder(props: { area: AreaInfo }) {
    return (
        <div data-placeholder className="placeholder">
            <span className="panel-state-icon">
                <Glyph kind="info" />
            </span>
            <p>{props.area.purpose}</p>
            <p className="placeholder-note">{PLACEHOLDER_TEXT}</p>
        </div>
    );
}
