import type { McHeader } from '../../../shared/protocol/missionControl';
import { formatTime } from './format';
import { mcDiagnostics, mcFolder, mcUpdated, mcVersion } from './texts';

export function Header(props: { header: McHeader }) {
    const { header } = props;
    return (
        <section data-header className="mc-header" aria-label="Project">
            <span className="mc-folder">{mcFolder(header.name)}</span>
            <span className="mc-version">{mcVersion(header.version)}</span>
            <span className="mc-updated">{mcUpdated(formatTime(header.updatedAt))}</span>
            <span className="mc-diagnostics">{mcDiagnostics(header.projectDiagnostics)}</span>
        </section>
    );
}
