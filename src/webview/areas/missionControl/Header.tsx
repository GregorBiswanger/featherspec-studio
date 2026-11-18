import type { NavigationRequest } from '../../../shared/protocol/messages';
import { updatedText } from '../../../shared/protocol/texts';
import type { McHeader } from '../../../shared/protocol/missionControl';
import { Drill } from './Drill';
import { problemsRequest } from './requests';
import { mcFolder, mcProblems, mcVersion } from './texts';

export function Header(props: { header: McHeader; navigate: (request: NavigationRequest) => void }) {
    const { header, navigate } = props;
    return (
        <section data-header className="mc-header" aria-label="Project">
            <span className="mc-folder">{mcFolder(header.name)}</span>
            <span className="mc-version">{mcVersion(header.version)}</span>
            <span className="mc-updated">{updatedText(header.updatedAt, new Date())}</span>
            {header.problems > 0 ? (
                <Drill id="problems" onActivate={() => navigate(problemsRequest(header))}>
                    {mcProblems(header.problems)}
                </Drill>
            ) : null}
        </section>
    );
}
