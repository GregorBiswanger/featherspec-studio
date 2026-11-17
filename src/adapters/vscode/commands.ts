import type { AreaId } from '../../shared/protocol/areas';

export const OPEN_COMMAND = 'featherspec-studio.open';
export const RESCAN_COMMAND = 'featherspec-studio.rescan';
export const MOVE_COMMAND = 'featherspec-studio.moveSpec';
export const SHELL_ACTION_COMMAND = 'featherspec-studio.shellAction';
export const NAVIGATOR_VIEW = 'featherspec-studio.navigator';

export const AREA_COMMANDS: Record<AreaId, string> = {
    missionControl: 'featherspec-studio.openMissionControl',
    specBoard: 'featherspec-studio.openSpecBoard',
    specExplorer: 'featherspec-studio.openSpecExplorer',
};
