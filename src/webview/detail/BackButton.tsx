import type { AreaId } from '../../shared/protocol/areas';
import { BACK_LABELS } from '../../shared/protocol/texts';

export function BackButton(props: { area: AreaId; onBack(): void }) {
    return (
        <button type="button" className="detail-back" onClick={props.onBack}>
            {BACK_LABELS[props.area]}
        </button>
    );
}
