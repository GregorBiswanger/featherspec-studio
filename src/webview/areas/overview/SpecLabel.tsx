import type { SpecRef } from '../../../shared/protocol/overview';
import { MC_NOT_AVAILABLE, mcSpecLabel } from './texts';

export function SpecLabel(props: { spec: SpecRef }) {
    const { spec } = props;
    if (!spec.found) {
        return <span className="ov-title">{mcSpecLabel(spec)}</span>;
    }
    return (
        <span className="ov-spec">
            <span className="ov-number">{spec.number}</span> <span className="ov-title">{spec.title ?? MC_NOT_AVAILABLE}</span>
        </span>
    );
}
