import { useContext, useSyncExternalStore } from 'react';
import type { MissionControlView } from '../../../shared/protocol/missionControl';
import type { ClientSnapshot } from '../../client';
import { ClientContext } from '../../shell';

export function useMissionControl(): MissionControlView | undefined {
    const client = useContext(ClientContext);
    if (client === undefined) {
        throw new Error('useMissionControl needs a ShellProvider');
    }
    const snapshot: ClientSnapshot = useSyncExternalStore(client.subscribe, client.getSnapshot);
    return snapshot.missionControl;
}
