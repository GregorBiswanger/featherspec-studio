import type { NavigationRequest } from '../../../shared/protocol/messages';
import type { OverviewProblems } from '../../../shared/protocol/overview';
import { Drill } from './Drill';
import { problemsRequest } from './requests';
import { SpecRow } from './SpecRow';
import { problemLineText, problemsHeading } from './texts';

export function Problems(props: { problems: OverviewProblems; navigate: (request: NavigationRequest) => void }) {
    const { problems, navigate } = props;
    const count = problems.rows.length + problems.lines.length;
    if (count === 0) {
        return null;
    }
    return (
        <section data-problems className="ov-problems ov-panel">
            <h2>
                <Drill id="problems" onActivate={() => navigate(problemsRequest(problems.rows))}>
                    {problemsHeading(count)}
                </Drill>
            </h2>
            <ul className="ov-list">
                {problems.rows.map((row) => (
                    <SpecRow key={`${row.spec.stem}|${row.spec.path ?? ''}`} row={row} group="problems" />
                ))}
                {problems.lines.map((line, index) => (
                    <li key={`${line.where}|${index}`} className="ov-line" data-problem-line>
                        {problemLineText(line.where, line.reason)}
                    </li>
                ))}
            </ul>
        </section>
    );
}
