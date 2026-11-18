import type { AreaId } from '../../shared/protocol/areas';
import { OPEN_STUDIO_COMMAND_ID } from '../../shared/protocol/texts';

export const OPEN_COMMAND = OPEN_STUDIO_COMMAND_ID;
export const REFRESH_COMMAND = 'featherspec-studio.refresh';
export const COPY_NEXT_STEP_COMMAND = 'featherspec-studio.copyNextStep';
export const SELECT_SPEC_COMMAND = 'featherspec-studio.selectSpec';
export const TREE_COPY_COMMAND = 'featherspec-studio.tree.copyNextStep';
export const TREE_OPEN_SPEC_COMMAND = 'featherspec-studio.tree.openSpec';
export const TREE_OPEN_PLAN_COMMAND = 'featherspec-studio.tree.openPlan';
export const SHELL_ACTION_COMMAND = 'featherspec-studio.shellAction';
export const NAVIGATOR_VIEW = 'featherspec-studio.navigator';

export const AREA_COMMANDS: Record<AreaId, string> = {
    overview: 'featherspec-studio.openOverview',
    board: 'featherspec-studio.openBoard',
    specExplorer: 'featherspec-studio.openSpecExplorer',
};
