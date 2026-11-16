import type { SpecRef } from '../../../shared/protocol/missionControl';
import { MC_NOT_AVAILABLE, mcSpecLabel } from './texts';

export function SpecLabel(props: { spec: SpecRef }) {
    const { spec } = props;
    if (!spec.found) {
        return <span className="mc-title">{mcSpecLabel(spec)}</span>;
    }
    return (
        <span className="mc-spec">
            <span className="mc-number">{spec.number}</span> <span className="mc-title">{spec.title ?? MC_NOT_AVAILABLE}</span>
        </span>
    );
}
