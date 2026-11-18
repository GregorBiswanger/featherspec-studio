import { useContext, useSyncExternalStore } from 'react';
import type { OverviewView } from '../../../shared/protocol/overview';
import type { ClientSnapshot } from '../../client';
import { ClientContext } from '../../shell';

export function useOverview(): OverviewView | undefined {
    const client = useContext(ClientContext);
    if (client === undefined) {
        throw new Error('useOverview needs a ShellProvider');
    }
    const snapshot: ClientSnapshot = useSyncExternalStore(client.subscribe, client.getSnapshot);
    return snapshot.overview;
}
