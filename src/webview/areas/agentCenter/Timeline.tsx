import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { TimelinePayload } from '../../../shared/protocol/agentCenter';
import { AC_JUMP_TO_LATEST, AC_LOAD_EARLIER, AC_TIMELINE } from '../../../shared/protocol/agentCenterTexts';
import type { ShellClient } from '../../client';

const END_TOLERANCE_PX = 8;

function clockTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    return [date.getHours(), date.getMinutes(), date.getSeconds()].map((part) => String(part).padStart(2, '0')).join(':');
}

export function Timeline(props: { runId: string; timeline: TimelinePayload | undefined; client: ShellClient }) {
    const { runId, client } = props;
    const timeline = props.timeline?.runId === runId ? props.timeline : undefined;
    const scroller = useRef<HTMLDivElement>(null);
    const [following, setFollowing] = useState(true);
    const followingRef = useRef(true);

    function follow(on: boolean): void {
        followingRef.current = on;
        setFollowing(on);
        client.acFollow(runId, on);
    }

    useEffect(() => {
        followingRef.current = true;
        setFollowing(true);
    }, [runId]);

    const rowCount = timeline?.rows.length ?? 0;
    const lastKey = timeline?.rows[rowCount - 1]?.key;
    useLayoutEffect(() => {
        const element = scroller.current;
        if (followingRef.current && element !== null) {
            element.scrollTop = element.scrollHeight;
        }
    }, [rowCount, lastKey, runId]);

    function onScroll(): void {
        const element = scroller.current;
        if (element === null) {
            return;
        }
        const atEnd = element.scrollHeight - element.scrollTop - element.clientHeight <= END_TOLERANCE_PX;
        if (!atEnd && followingRef.current) {
            follow(false);
        } else if (atEnd && !followingRef.current) {
            follow(true);
        }
    }

    function jump(): void {
        const element = scroller.current;
        if (element !== null) {
            element.scrollTop = element.scrollHeight;
        }
        follow(true);
    }

    return (
        <section className="ac-section ac-timeline" data-timeline>
            <div className="ac-timeline-head">
                <h3>{AC_TIMELINE}</h3>
                {following ? null : (
                    <button type="button" className="ac-button" onClick={jump}>
                        {AC_JUMP_TO_LATEST}
                    </button>
                )}
            </div>
            <div className="ac-timeline-scroll" data-timeline-scroll ref={scroller} onScroll={onScroll} tabIndex={0} role="log" aria-label={AC_TIMELINE}>
                {timeline?.hasEarlier === true ? (
                    <button type="button" className="ac-button ac-load-earlier" onClick={() => client.acLoadEarlier(runId)}>
                        {AC_LOAD_EARLIER}
                    </button>
                ) : null}
                <ol className="ac-rows">
                    {timeline?.rows.map((row) => (
                        <li key={row.key} className="ac-trow" data-timeline-row>
                            <span className="ac-trow-time">{clockTime(row.time)}</span>
                            <span className="ac-trow-kind">{row.kind}</span>
                            <span className="ac-trow-source">{row.source}</span>
                            {row.fields.map((field) => (
                                <span key={field.label} className="ac-trow-field">
                                    <span className="ac-trow-label">{field.label}</span> {field.text}
                                </span>
                            ))}
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
