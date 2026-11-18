import type { McActivity, ActivityEntry } from '../../../shared/protocol/missionControl';
import { whenText } from '../../../shared/protocol/texts';
import { Glyph } from '../../board/icons';
import { Drill } from './Drill';
import { SpecLabel } from './SpecLabel';
import { MC_ACTIVITY_HEADING, MC_NO_ACTIVITY, mcActivityUnavailable, mcChange } from './texts';

export function Activity(props: { activity: McActivity; onActivate: (entry: ActivityEntry) => void }) {
    const { activity, onActivate } = props;
    const now = new Date();
    return (
        <section data-activity className="mc-activity mc-panel">
            <h2>{MC_ACTIVITY_HEADING}</h2>
            {!activity.available ? (
                <p className="mc-note">{mcActivityUnavailable(activity.reason)}</p>
            ) : activity.entries.length === 0 ? (
                <p className="mc-empty">
                    <Glyph kind="empty" />
                    {MC_NO_ACTIVITY}
                </p>
            ) : (
                <ul className="mc-list">
                    {activity.entries.map((entry, index) => (
                        <li key={`${entry.at}|${index}`} data-activity-entry>
                            <Drill id={`activity:${index}`} className="mc-row" onActivate={() => onActivate(entry)}>
                                <span className="mc-time">{whenText(entry.at, now)}</span>
                                <span className="mc-sep">{' · '}</span>
                                <SpecLabel spec={entry.spec} />
                                <span className="mc-sep">{' · '}</span>
                                <span className="mc-change">{mcChange(entry.change)}</span>
                            </Drill>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
