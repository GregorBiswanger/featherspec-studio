import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { AreaId } from '../shared/protocol/areas';
import type { ActionId, NavigationRequest, NavigationTarget, PanelState, ShellFocus, ShellView } from '../shared/protocol/messages';
import type { ClientSnapshot, ShellClient, SpecReference } from './client';

export interface Shell {
    view: ShellView | undefined;
    state: PanelState | undefined;
    area: AreaId;
    target: NavigationTarget | undefined;
    focus: ShellFocus | undefined;
    navigate(request: NavigationRequest): void;
    select(reference: SpecReference): void;
    clearSelection(): void;
    setSideWidth(fraction: number): void;
    resetSideWidth(): void;
    runAction(action: ActionId): void;
    dismissNotice(): void;
}

export const ClientContext = createContext<ShellClient | undefined>(undefined);

export function ShellProvider(props: { client: ShellClient; children: ReactNode }) {
    return <ClientContext.Provider value={props.client}>{props.children}</ClientContext.Provider>;
}

export function useShell(): Shell {
    const client = useContext(ClientContext);
    if (client === undefined) {
        throw new Error('useShell needs a ShellProvider');
    }
    const snapshot: ClientSnapshot = useSyncExternalStore(client.subscribe, client.getSnapshot);
    return {
        view: snapshot.view,
        state: snapshot.state,
        area: snapshot.area,
        target: snapshot.view?.target,
        focus: snapshot.focus,
        navigate: client.navigate,
        select: client.select,
        clearSelection: client.clearSelection,
        setSideWidth: client.setSideWidth,
        resetSideWidth: client.resetSideWidth,
        runAction: client.runAction,
        dismissNotice: client.dismissNotice,
    };
}
