import type { DetailAreaId } from '../../shared/protocol/areas';
import { BACK_LABELS } from '../../shared/protocol/texts';

export function BackButton(props: { area: DetailAreaId; onBack(): void }) {
    return (
        <button type="button" className="detail-back" onClick={props.onBack}>
            {BACK_LABELS[props.area]}
        </button>
    );
}
