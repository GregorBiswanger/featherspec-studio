export function removedEarlierDataLine(names: readonly string[]): string {
    return `Removed run data of an earlier build: ${names.join(', ')}.`;
}

export function keptEarlierDataLine(path: string, reason: string): string {
    return `Could not remove ${path}: ${reason}. Studio tries again at the next activation.`;
}
