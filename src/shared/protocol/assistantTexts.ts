import type { AssistantId, AssistantTarget } from './assistant';

export const ASSISTANT_NAMES: Record<AssistantId, string> = {
    'copilot': 'Copilot',
    claudeCode: 'Claude Code',
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

export const ATTACH_UPDATE_TEXT = 'With FeatherSpec 1.11.0 or later, Send also attaches the spec; update with /sdd-featherspec-update.';

export const SEND_TARGET_TEXT: Record<AssistantTarget, string> = { new: 'new chat', current: 'current chat' };

export const SEND_ITEM_TEXT: Record<AssistantTarget, string> = { new: 'Send to a new chat', current: 'Send to the current chat' };

export const MORE_ACTIONS_TITLE = 'More actions';

export function sendMainLabel(name: string): string {
    return `Send to ${name}`;
}

export function sendMainName(name: string, target: AssistantTarget, line: string): string {
    return `Send to ${name} (${SEND_TARGET_TEXT[target]}): ${line}`;
}

export function sendOpenedLabel(name: string): string {
    return `Opened in ${name}`;
}

export function sendOpenedName(name: string, line: string): string {
    return `Opened in ${name}: ${line}`;
}

export function moreActionsName(line: string): string {
    return `More actions: ${line}`;
}
