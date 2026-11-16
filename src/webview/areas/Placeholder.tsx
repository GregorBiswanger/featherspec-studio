import type { AreaInfo } from '../../shared/protocol/areas';
import { PLACEHOLDER_TEXT } from '../../shared/protocol/texts';

export function Placeholder(props: { area: AreaInfo }) {
    return (
        <div data-placeholder className="placeholder">
            <p>{props.area.purpose}</p>
            <p className="placeholder-note">{PLACEHOLDER_TEXT}</p>
        </div>
    );
}
