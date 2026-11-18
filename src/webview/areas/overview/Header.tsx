import type { NavigationRequest } from '../../../shared/protocol/messages';
import type { McHeader } from '../../../shared/protocol/overview';
import { Drill } from './Drill';
import { problemsRequest } from './requests';
import { mcProblems } from './texts';

export function Header(props: { header: McHeader; navigate: (request: NavigationRequest) => void }) {
    const { header, navigate } = props;
    return (
        <section data-header className="ov-header" aria-label="Project">
            {header.problems > 0 ? (
                <Drill id="problems" onActivate={() => navigate(problemsRequest(header))}>
                    {mcProblems(header.problems)}
                </Drill>
            ) : null}
        </section>
    );
}
