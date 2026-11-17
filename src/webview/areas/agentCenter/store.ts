import { useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type { AgentCenterView, TimelinePayload } from '../../../shared/protocol/agentCenter';
import { DURATION_TICK_MS } from '../../../shared/protocol/agentCenterDuration';
import type { ClientSnapshot, ShellClient } from '../../client';
import { ClientContext } from '../../shell';

export interface AgentCenterApi {
    view: AgentCenterView | undefined;
    timeline: TimelinePayload | undefined;
    client: ShellClient;
}

export function useAgentCenter(): AgentCenterApi {
    const client = useContext(ClientContext);
    if (client === undefined) {
        throw new Error('useAgentCenter needs a ShellProvider');
    }
    const snapshot: ClientSnapshot = useSyncExternalStore(client.subscribe, client.getSnapshot);
    return { view: snapshot.agentCenter, timeline: snapshot.agentCenterTimeline, client };
}

export function useNow(active: boolean): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!active) {
            return undefined;
        }
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), DURATION_TICK_MS);
        return () => clearInterval(timer);
    }, [active]);
    return active ? now : Date.now();
}
