import type { CommandPort } from '../ports/assistant';

export const OPEN_SETTINGS_TARGET_COMMAND = 'workbench.action.openSettings';

export const STUDIO_EXTENSION_QUERY = '@ext:GregorBiswanger.featherspec-studio';

export async function openSettings(commands: CommandPort): Promise<void> {
    await commands.execute(OPEN_SETTINGS_TARGET_COMMAND, [STUDIO_EXTENSION_QUERY]);
}
