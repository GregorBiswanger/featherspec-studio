import type { ActionId, PanelState } from './messages';

export function ignoredMessageLine(type: string, reason: string): string {
    return `Ignored a message from the Studio panel: type ${type}, ${reason}.`;
}

export const LOADING_TEXT = 'Loading project…';

export const OPEN_STUDIO_LABEL = 'Open Studio';

export const NAVIGATION_LABEL = 'Studio areas';

export type StateId = PanelState['id'] | 'S7';

export const ACTION_LABELS: Record<ActionId, string> = {
    openFolder: 'Open Folder',
    openSetupGuide: 'Open setup guide',
    refresh: 'Refresh',
    selectProject: 'Select project',
    showOutput: 'Show output',
    retry: 'Retry',
    manageTrust: 'Manage Workspace Trust',
    reload: 'Reload',
};

export const STATE_LABELS: Record<StateId, string> = {
    S1: 'No folder open',
    S2: 'No project found',
    S3: 'Several projects found',
    S4: 'Loading',
    S5: 'Project could not be loaded',
    S6: 'Reload needed',
    S7: 'Restricted Mode',
    S8: 'Project not found',
    S9: 'Project incomplete',
};

export const RESTRICTED_TEXT = 'This workspace is in Restricted Mode. Agent actions are unavailable.';

export function s5ReasonText(reason: Extract<PanelState, { id: 'S5' }>['reason']): string {
    switch (reason.cause) {
        case 'discovery':
            return `project discovery failed (${reason.message})`;
        case 'listing':
            return `the lifecycle folders of .specs/ could not be listed (${reason.folder}: ${reason.reason})`;
        case 'protocol':
            return 'the Studio panel and the extension could not exchange data';
    }
}

export function panelStateLines(state: PanelState): string[] {
    switch (state.id) {
        case 'S1':
            return ['Open a folder to use FeatherSpec Studio.'];
        case 'S2':
            return ['No FeatherSpec project found in this workspace.'];
        case 'S3':
            return ['Several FeatherSpec projects found. Select one to continue.'];
        case 'S4':
            return [LOADING_TEXT];
        case 'S5':
            return [`The project could not be loaded: ${s5ReasonText(state.reason)}.`];
        case 'S6':
            return ['FeatherSpec Studio was updated. Reload to continue.'];
        case 'S8':
            return [`FeatherSpec project ${state.name} was not found.`];
        case 'S9':
            return state.folders.flatMap((folder) =>
                folder.markers.map((marker) => `FeatherSpec project incomplete: ${folder.folder} has no ${marker}.`),
            );
    }
}

export function panelStateActions(state: PanelState): ActionId[] {
    switch (state.id) {
        case 'S1':
            return ['openFolder'];
        case 'S2':
            return ['openSetupGuide', 'refresh'];
        case 'S3':
            return ['selectProject'];
        case 'S4':
            return [];
        case 'S5':
            return ['showOutput', 'retry'];
        case 'S6':
            return ['reload'];
        case 'S8':
            return state.canSelect ? ['selectProject', 'refresh'] : ['refresh'];
        case 'S9':
            return ['openSetupGuide', 'refresh'];
    }
}

export const PLACEHOLDER_TEXT = 'Not available in this version of FeatherSpec Studio';

export const NO_SPECS_TEXT = 'This project has no specs yet.';

export const TITLE_NOT_AVAILABLE = 'not available';

export const SPEC_LIST_LABEL = 'Specs';

export const DISMISS_LABEL = 'Dismiss';

export function noticeText(number: string): string {
    return `Spec ${number} is no longer in the project`;
}
