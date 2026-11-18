import type { AreaId } from '../../shared/protocol/areas';
import { OPEN_STUDIO_COMMAND_ID } from '../../shared/protocol/texts';

export const OPEN_COMMAND = OPEN_STUDIO_COMMAND_ID;
export const RESCAN_COMMAND = 'featherspec-studio.rescan';
export const SHELL_ACTION_COMMAND = 'featherspec-studio.shellAction';
export const NAVIGATOR_VIEW = 'featherspec-studio.navigator';

export const AREA_COMMANDS: Record<AreaId, string> = {
    missionControl: 'featherspec-studio.openMissionControl',
    specBoard: 'featherspec-studio.openSpecBoard',
    specExplorer: 'featherspec-studio.openSpecExplorer',
};
