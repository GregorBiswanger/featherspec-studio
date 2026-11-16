import { AREAS, type AreaId } from '../../shared/protocol/areas';
import type { ActionId, PanelState } from '../../shared/protocol/messages';
import { ACTION_LABELS, OPEN_STUDIO_LABEL, panelStateActions, panelStateLines } from '../../shared/protocol/texts';

export type TreeItemModel =
    | { kind: 'project'; label: string }
    | { kind: 'open'; label: string }
    | { kind: 'area'; label: string; area: AreaId }
    | { kind: 'action'; label: string; action: ActionId };

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
                { kind: 'project', label: input.projectName ?? '' },
                { kind: 'open', label: OPEN_STUDIO_LABEL },
                ...AREAS.map((area): TreeItemModel => ({ kind: 'area', label: area.title, area: area.id })),
            ],
        };
    }
    const state = input.state;
    if (state === undefined || state.id === 'S6') {
        return { message: undefined, items: [] };
    }
    return {
        message: panelStateLines(state).join(' '),
        items: panelStateActions(state).map((action): TreeItemModel => ({ kind: 'action', label: ACTION_LABELS[action], action })),
    };
}
