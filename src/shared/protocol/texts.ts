export function ignoredMessageLine(type: string, reason: string): string {
    return `Ignored a message from the Studio panel: type ${type}, ${reason}.`;
}
