import type { McActivity, ActivityEntry } from '../../../shared/protocol/overview';
import { whenText } from '../../../shared/protocol/texts';
import { Drill } from './Drill';
import { SpecLabel } from './SpecLabel';
import { ACTIVITY_HEADING, activityHeading, activityUnavailableText, changeText } from './texts';

export function Activity(props: { activity: McActivity; onActivate: (entry: ActivityEntry) => void; setOpen: (open: boolean) => void }) {
    const { activity, onActivate } = props;
    const now = new Date();
    if (!activity.available) {
        return (
            <section data-activity className="ov-activity ov-panel">
                <h2>{ACTIVITY_HEADING}</h2>
                <p className="ov-note">{activityUnavailableText(activity.reason)}</p>
            </section>
        );
    }
    if (activity.entries.length === 0) {
        return null;
    }
    return (
        <section data-activity className="ov-activity ov-panel">
            <h2>
                <button type="button" className="ov-drill ov-toggle" data-drill="activity" aria-expanded={activity.open} onClick={() => props.setOpen(!activity.open)}>
                    {activityHeading(activity.entries.length)}
                </button>
            </h2>
            {activity.open ? (
                <ul className="ov-list">
                    {activity.entries.map((entry, index) => (
                        <li key={`${entry.at}|${index}`} data-activity-entry>
                            <Drill id={`activity:${index}`} className="ov-row" onActivate={() => onActivate(entry)}>
                                <span className="ov-time">{whenText(entry.at, now)}</span>
                                <span className="ov-sep">{' · '}</span>
                                <SpecLabel spec={entry.spec} />
                                <span className="ov-sep">{' · '}</span>
                                <span className="ov-change">{changeText(entry.change)}</span>
                            </Drill>
                        </li>
                    ))}
                </ul>
            ) : null}
        </section>
    );
}
