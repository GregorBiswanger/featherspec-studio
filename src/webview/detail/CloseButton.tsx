import { CLOSE_DETAIL_LABEL, CLOSE_DETAIL_TOOLTIP } from '../../shared/protocol/texts';

export function CloseButton(props: { onClose(): void }) {
    return (
        <button type="button" className="detail-close" aria-label={CLOSE_DETAIL_LABEL} title={CLOSE_DETAIL_TOOLTIP} onClick={props.onClose}>
            <span aria-hidden="true">✕</span>
        </button>
    );
}
