import type { NavigationRequest } from '../../../shared/protocol/messages';
import type { OverviewFigures } from '../../../shared/protocol/overview';
import { Drill } from './Drill';
import { stateRequest, totalRequest } from './requests';
import { deprecatedText, FIGURES_LABEL, PROGRESS_UNAVAILABLE_TEXT, progressText, stateFigureText, totalText } from './texts';

export function Figures(props: { figures: Extract<OverviewFigures, { kind: 'counts' }>; navigate: (request: NavigationRequest) => void }) {
    const { figures, navigate } = props;
    const { progress } = figures;
    const progressLine = progress.kind === 'value' ? progressText(progress.percent, progress.done, progress.divisor) : PROGRESS_UNAVAILABLE_TEXT;
    return (
        <section data-figures className="ov-figures" aria-label={FIGURES_LABEL} title={progressLine}>
            <span id="ov-progress-text" hidden>
                {progressLine}
            </span>
            <ul className="ov-figure-list">
                <li data-total className="ov-figure">
                    <Drill id="total" describedBy="ov-progress-text" title={progressLine} onActivate={() => navigate(totalRequest())}>
                        {totalText(figures.total)}
                    </Drill>
                </li>
                {figures.states.map((entry) => {
                    const deprecated = entry.deprecated !== undefined && entry.deprecated > 0 ? deprecatedText(entry.deprecated) : undefined;
                    return (
                        <li key={entry.state} data-state-count={entry.state} className="ov-figure">
                            {deprecated === undefined ? null : (
                                <span id="ov-deprecated-text" hidden>
                                    {deprecated}
                                </span>
                            )}
                            <Drill
                                id={`state:${entry.state}`}
                                state={entry.state}
                                {...(deprecated === undefined ? {} : { describedBy: 'ov-deprecated-text', title: deprecated })}
                                onActivate={() => navigate(stateRequest(entry.state))}
                            >
                                {stateFigureText(entry.state, entry.count)}
                            </Drill>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
