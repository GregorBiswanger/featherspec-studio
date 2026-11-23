import type { AssistantId, AssistantTarget } from './assistant';

export const ASSISTANT_NAMES: Record<AssistantId, string> = {
    'copilot': 'Copilot',
    claudeCode: 'Claude Code',
    junie: 'Junie',
};

export function sendOpenedText(name: string): string {
    return `The prompt is in ${name}'s chat. Check it, then send it there.`;
}

export function sendOpenedWithoutText(name: string, file: string): string {
    return `The prompt is in ${name}'s chat, without ${file}: the file was not found. Check it, then send it there.`;
}

export function attachMissingOutputText(name: string, path: string): string {
    return `Send to ${name}: ${path} was not found, so it was not attached.`;
}

export function pasteKeyOf(platform: string): string {
    return platform === 'darwin' ? 'Cmd+V' : 'Ctrl+V';
}

export function sendWarnCopiedText(name: string, pasteKey: string): string {
    return `Could not open ${name}'s chat. The prompt is copied: paste it there with ${pasteKey}.`;
}

export function sendWarnNotCopiedText(name: string): string {
    return `Could not open ${name}'s chat, and the prompt could not be copied.`;
}

export function sendOutputCopiedText(name: string, cause: string): string {
    return `Send to ${name} failed (${cause}); the prompt was copied instead.`;
}

export function sendOutputNotCopiedText(name: string, cause: string): string {
    return `Send to ${name} failed (${cause}); the prompt could not be copied either.`;
}

export function extensionNotFoundCause(extensionId: string): string {
    return `extension ${extensionId} not found`;
}

export function activatingFailedCause(extensionId: string, message: string): string {
    return `activating ${extensionId} failed: ${message}`;
}

export function commandNotFoundCause(command: string): string {
    return `command ${command} not found`;
}

export function commandFailedCause(command: string, message: string): string {
    return `${command} failed: ${message}`;
}

export function noResultCause(milliseconds: number): string {
    return `no result within ${milliseconds} ms`;
}

export function sendTipText(name: string): string {
    return `Send to ${name} puts the prompt into its chat and sends nothing: choose the model there, check the prompt, then send it.`;
}

export const SEND_TARGET_TEXT: Record<AssistantTarget, string> = { new: 'new chat', current: 'current chat' };

export const SEND_ITEM_TEXT: Record<AssistantTarget, string> = { new: 'Send to a new chat', current: 'Send to the current chat' };

export const MORE_ACTIONS_TITLE = 'More actions';

export function sendMainLabel(name: string): string {
    return `Send to ${name}`;
}

export function sendMainName(name: string, target: AssistantTarget, line: string, attachName?: string): string {
    const plain = `Send to ${name} (${SEND_TARGET_TEXT[target]}): ${line}`;
    return attachName === undefined ? plain : `${plain}. Attaches ${attachName}.`;
}

export function sendOpenedLabel(name: string): string {
    return `Opened in ${name}`;
}

export function sendOpenedName(name: string, line: string): string {
    return `Opened in ${name}: ${line}`;
}

export function sendStartingLabel(name: string): string {
    return `Starting ${name}…`;
}

export function sendStartingName(name: string, line: string): string {
    return `Starting ${name}: ${line}`;
}

export function moreActionsName(line: string): string {
    return `More actions: ${line}`;
}

export const COPY_FOR_PLACES: Record<'copilot' | 'junie', string> = {
    'copilot': 'GitHub Copilot Chat',
    junie: 'Junie in AI Chat',
};

export const JUNIE_WINDOW_PLACE = 'the Junie tool window';

function handoverHint(place: string, pasteKey: string): string {
    return place === COPY_FOR_PLACES.junie ? `In AI Chat, choose Junie and paste it with ${pasteKey}.` : `Paste it into ${place} with ${pasteKey}.`;
}

export function copyForDoneText(place: string, pasteKey: string): string {
    const hint = handoverHint(place, pasteKey);
    return `Copied. ${hint}`;
}

export function copyForOpenText(place: string, pasteKey: string): string {
    return `Copied. Open ${place} and paste it with ${pasteKey}.`;
}

export function copyForWithoutText(files: string, place: string, pasteKey: string, opened: boolean): string {
    const hint = opened ? handoverHint(place, pasteKey) : `Open ${place} and paste it with ${pasteKey}.`;
    return `Copied without ${files}: the file was not found. ${hint}`;
}

export function copyForMissingOutputText(name: string, path: string): string {
    return `Copy for ${name}: ${path} was not found, so its path was left out.`;
}

export function copyForMainLabel(name: string): string {
    return `Copy for ${name}`;
}

export function copyForMainName(name: string, line: string, files?: string): string {
    const plain = `Copy for ${name}: ${line}`;
    return files === undefined ? plain : `${plain}. Adds the paths of ${files}.`;
}

export function copyForTipText(name: string, place: string): string {
    const target = place === COPY_FOR_PLACES.junie ? 'AI Chat with Junie as the agent' : place;
    return `Copy for ${name} copies the prompt with the file paths and sends nothing: paste it into ${target}, choose the model there, check the prompt, then send it.`;
}

export const CLAUDE_WAITING_TEXT = 'Claude Code is waiting for you in the terminal. Answer it there, then send again. The prompt is copied.';

export const CLAUDE_NOT_READY_NOW_CAUSE = 'Claude Code was not ready for input';

export const CLAUDE_NOT_INSTALLED_TEXT = 'Claude Code did not start. Is the claude command installed? The prompt is copied.';

export const CLAUDE_NOT_INSTALLED_CAUSE = 'the claude command was not found on the PATH';

export const TERMINAL_UNAVAILABLE_CAUSE = 'the Terminal plugin is not available';

export function claudeNotReadyCause(milliseconds: number): string {
    return `Claude Code was not ready within ${milliseconds} ms`;
}

export function terminalCallFailedCause(message: string): string {
    return `terminal call failed: ${message}`;
}
