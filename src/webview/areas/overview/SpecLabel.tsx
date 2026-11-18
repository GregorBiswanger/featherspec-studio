import type { SpecRef } from '../../../shared/protocol/overview';
import { NOT_AVAILABLE_TEXT, specLabelText } from './texts';

export function SpecLabel(props: { spec: SpecRef }) {
    const { spec } = props;
    if (!spec.found) {
        return <span className="ov-title">{specLabelText(spec)}</span>;
    }
    return (
        <span className="ov-spec">
            <span className="ov-number">{spec.number}</span> <span className="ov-title">{spec.title ?? NOT_AVAILABLE_TEXT}</span>
        </span>
    );
}
