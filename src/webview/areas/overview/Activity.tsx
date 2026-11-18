import type { McActivity, ActivityEntry } from '../../../shared/protocol/overview';
import { whenText } from '../../../shared/protocol/texts';
import { Glyph } from '../../board/icons';
import { Drill } from './Drill';
import { SpecLabel } from './SpecLabel';
import { MC_ACTIVITY_HEADING, MC_NO_ACTIVITY, mcActivityUnavailable, mcChange } from './texts';

export function Activity(props: { activity: McActivity; onActivate: (entry: ActivityEntry) => void }) {
    const { activity, onActivate } = props;
    const now = new Date();
    return (
        <section data-activity className="ov-activity ov-panel">
            <h2>{MC_ACTIVITY_HEADING}</h2>
            {!activity.available ? (
                <p className="ov-note">{mcActivityUnavailable(activity.reason)}</p>
            ) : activity.entries.length === 0 ? (
                <p className="ov-empty">
                    <Glyph kind="empty" />
                    {MC_NO_ACTIVITY}
                </p>
            ) : (
                <ul className="ov-list">
                    {activity.entries.map((entry, index) => (
                        <li key={`${entry.at}|${index}`} data-activity-entry>
                            <Drill id={`activity:${index}`} className="ov-row" onActivate={() => onActivate(entry)}>
                                <span className="ov-time">{whenText(entry.at, now)}</span>
                                <span className="ov-sep">{' · '}</span>
                                <SpecLabel spec={entry.spec} />
                                <span className="ov-sep">{' · '}</span>
                                <span className="ov-change">{mcChange(entry.change)}</span>
                            </Drill>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
