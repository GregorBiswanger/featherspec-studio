import { AREAS, type AreaId } from '../../shared/protocol/areas';
import type { ActionId, PanelState } from '../../shared/protocol/messages';
import { ACTION_LABELS, OPEN_STUDIO_LABEL, panelStateActions, panelStateLines } from '../../shared/protocol/texts';

/** `icon` is the name of a VS Code product icon (codicon); the tree is drawn by VS Code. */
export type TreeItemModel =
    | { kind: 'project'; label: string; icon: string }
    | { kind: 'open'; label: string; icon: string }
    | { kind: 'area'; label: string; area: AreaId; icon: string }
    | { kind: 'action'; label: string; action: ActionId; icon: string };

/** One icon per area, none shared with another entry of the tree (PD-048). */
export const AREA_ICONS: Record<AreaId, string> = {
    missionControl: 'dashboard',
    specBoard: 'layout',
    specExplorer: 'list-tree',
    agentCenter: 'robot',
};
const PROJECT_ICON = 'folder';
const OPEN_ICON = 'window';
const ACTION_ICON = 'play';

export interface TreeModel {
    message: string | undefined;
    items: TreeItemModel[];
}

export interface TreeInput {
    projectActive: boolean;
    projectName: string | undefined;
    state: PanelState | undefined;
}

export function buildTreeModel(input: TreeInput): TreeModel {
    if (input.projectActive) {
        return {
            message: undefined,
            items: [
                { kind: 'project', label: input.projectName ?? '', icon: PROJECT_ICON },
                { kind: 'open', label: OPEN_STUDIO_LABEL, icon: OPEN_ICON },
                ...AREAS.map((area): TreeItemModel => ({ kind: 'area', label: area.title, area: area.id, icon: AREA_ICONS[area.id] })),
            ],
        };
    }
    const state = input.state;
    if (state === undefined || state.id === 'S6') {
        return { message: undefined, items: [] };
    }
    return {
        message: panelStateLines(state).join(' '),
        items: panelStateActions(state).map((action): TreeItemModel => ({ kind: 'action', label: ACTION_LABELS[action], action, icon: ACTION_ICON })),
    };
}
