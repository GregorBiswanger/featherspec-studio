export const MAX_ARCHIVE_BYTES = 20 * 1024 * 1024;

export const ARCHIVE_REFUSAL = {
    unreadable: 'it could not be read as a .tar.gz archive',
    tooLarge: 'it is larger than 20 MB',
    noTopFolder: 'it does not have a single top folder',
    noAgents: 'it has no root AGENTS.md with a FeatherSpecVersion: line that has a value',
    noSpecsFile: 'it has no file below .specs/',
    otherEntry: (entryPath: string): string => `it holds an entry that is neither a file nor a folder: ${JSON.stringify(entryPath)}`,
    unsafePath: (entryPath: string): string => `it holds an entry with an unsafe path: ${JSON.stringify(entryPath)}`,
    caseCollision: (first: string, second: string): string =>
        `it holds two entries whose paths differ at most in letter case: ${JSON.stringify(first)} and ${JSON.stringify(second)}`,
};

export function archiveRefusedText(reason: string): string {
    return `The downloaded archive is not a FeatherSpec release: ${reason}.`;
}
