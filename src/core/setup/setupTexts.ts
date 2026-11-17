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

export const SETUP_TEXTS = {
    trustRequired: 'Setting up FeatherSpec needs a trusted workspace.',
    noFolder: 'Open a folder to use FeatherSpec Studio.',
    everyFolderIsProject: 'Every folder of this workspace is already a FeatherSpec project.',
    noEligibleFolder: 'No folder of this workspace can be set up.',
    alreadyRunning: 'A FeatherSpec setup is already running.',
    downloading: 'Downloading FeatherSpec…',
    pickPlaceholder: 'Choose the folder to set up FeatherSpec in',
    confirmLabel: 'Set up',
    cancelLabel: 'Cancel',
    verdict: { notAProject: 'not a project', incomplete: 'incomplete', setupPending: 'setup not finished' },
};

function plural(count: number, one: string, many: string): string {
    return count === 1 ? one : many;
}

export function confirmTitle(version: string, folder: string): string {
    return `Set up FeatherSpec ${version} in ${folder}?`;
}

export function countSentence(created: number, completed: number, kept: number): string {
    const parts: string[] = [];
    if (created > 0) {
        parts.push(`${created} ${plural(created, 'file', 'files')} will be created`);
    }
    if (completed > 0) {
        parts.push(`${completed} completed`);
    }
    if (kept > 0) {
        parts.push(`${kept} existing ${plural(kept, 'file', 'files')} kept unchanged`);
    }
    return parts.length === 0 ? '' : `${parts.join(', ')}.`;
}

export function confirmDetail(path: string, created: number, completed: number, kept: number): string {
    const sentence = countSentence(created, completed, kept);
    return sentence === '' ? path : `${path}\n\n${sentence}`;
}

export const FINISH_TEXTS = {
    copySetup: '/sdd-setup',
    nothingToMerge: (folder: string): string => `There are no files to merge in ${folder}.`,
    noPendingFolder: 'No folder of this workspace has files to merge.',
    pickMergePlaceholder: 'Choose the folder whose merge prompt to copy',
    mergeCopied: 'The merge prompt was copied to the clipboard.',
};

export function nextStepWithoutKept(): string {
    return 'Open the AI assistant of your choice and run /sdd-setup.';
}

export function nextStepWithKept(kept: number): string {
    return `${kept} existing ${kept === 1 ? 'file was' : 'files were'} kept: merge them with your AI assistant, then run /sdd-setup.`;
}

export function setUpMessage(version: string, folder: string, kept: number): string {
    return kept === 0 ? `FeatherSpec ${version} is set up in ${folder}. ${nextStepWithoutKept()}` : `FeatherSpec ${version} files were added to ${folder}. ${nextStepWithKept(kept)}`;
}

export function stoppedMessage(path: string, reason: string): string {
    return `FeatherSpec setup stopped: ${path} could not be written (${reason}).`;
}

export function mergePromptText(folderPath: string, files: readonly string[]): string {
    const lines = [
        `FeatherSpec was added to the folder ${folderPath}.`,
        "These files already existed there, so FeatherSpec's own copies were put in .featherspec-setup/ and nothing was replaced.",
        '',
        'Merge each pair into the existing file:',
        ...files.map((file) => `- ${file} (existing file) and .featherspec-setup/${file} (FeatherSpec copy)`),
        '',
        'How to merge:',
        "- Keep all of the existing content. Add the sections that FeatherSpec's copy has and the existing file lacks.",
        ...(files.includes('AGENTS.md') ? ['- In AGENTS.md, use the FeatherSpecVersion: line of the FeatherSpec copy.'] : []),
        '- When every file is merged, delete the folder .featherspec-setup/.',
        '- Then tell the user to run /sdd-setup themselves. You cannot start it.',
    ];
    return `${lines.join('\n')}\n`;
}

export const OUTPUT_TEXTS = {
    title: (when: string): string => `FeatherSpec Studio setup - ${when}`,
    outcomeSetUp: 'set up',
    outcomeCancelled: 'cancelled',
    outcomeDownloadFailed: (reason: string): string => `download failed: ${reason}`,
    outcomeArchiveRefused: (reason: string): string => `archive refused: ${reason}`,
    outcomeStopped: (path: string, reason: string): string => `stopped: ${path} could not be written (${reason})`,
    tagNote: (tag: string, version: string): string => `note: the release tag ${tag} names another version than AGENTS.md (${version})`,
};
