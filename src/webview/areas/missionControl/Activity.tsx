import type { McActivity, ActivityEntry } from '../../../shared/protocol/missionControl';
import { Drill } from './Drill';
import { formatTime } from './format';
import { MC_ACTIVITY_HEADING, MC_NO_ACTIVITY, mcActivityUnavailable, mcChange, mcSpecLabel } from './texts';

export function Activity(props: { activity: McActivity; onActivate: (entry: ActivityEntry) => void }) {
    const { activity, onActivate } = props;
    return (
        <section data-activity className="mc-activity">
            <h2>{MC_ACTIVITY_HEADING}</h2>
            {!activity.available ? (
                <p>{mcActivityUnavailable(activity.reason)}</p>
            ) : activity.entries.length === 0 ? (
                <p>{MC_NO_ACTIVITY}</p>
            ) : (
                <ul className="mc-list">
                    {activity.entries.map((entry, index) => (
                        <li key={`${entry.at}|${index}`} data-activity-entry>
                            <Drill id={`activity:${index}`} onActivate={() => onActivate(entry)}>
                                <span className="mc-time">{formatTime(entry.at)}</span>
                                {' · '}
                                <span>{mcSpecLabel(entry.spec)}</span>
                                {' · '}
                                <span>{mcChange(entry.change)}</span>
                            </Drill>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
