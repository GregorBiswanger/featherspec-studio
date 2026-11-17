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

export const DOWNLOAD_TIMEOUT_MS = 30_000;
export const MAX_REDIRECTS = 5;

export const DOWNLOAD_FAILURE = {
    noConnection: (detail: string): string => `there is no connection to GitHub (${detail})`,
    status: (status: number): string => `GitHub answered with status ${status}`,
    rateLimit: (resetAt: string | undefined): string => (resetAt === undefined ? "GitHub's rate limit is reached" : `GitHub's rate limit is reached; it resets at ${resetAt}`),
    noReleaseTag: 'GitHub names no latest release for this repository',
    answerTimeout: 'GitHub did not answer within 30 seconds',
    idleTimeout: 'GitHub sent no data for 30 seconds',
    redirectNotAllowed: 'GitHub redirected to an address that is not allowed',
    redirectWithoutTarget: 'GitHub redirected without saying where',
    tooManyRedirects: 'GitHub redirected more than 5 times',
};

export function downloadFailedText(reason: string): string {
    return `FeatherSpec could not be downloaded: ${reason}.`;
}
