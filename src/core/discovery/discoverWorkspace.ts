import type { WorkspaceFolderInfo } from '../ports/host';
import type { ReadOnlyFileSystem } from '../ports/readOnlyFileSystem';
import { classifyFolder, FolderReadError, type FolderVerdict } from './classifyFolder';
import { readSetupSign, type SetupRun } from './setupSign';
import { readVersionLine } from './versionLine';

export interface DiscoveredFolder {
    root: string;
    name: string;
    displayPath?: string;
    verdict: FolderVerdict;
    legacy: boolean;
    version: string;
    setupRun?: SetupRun;
    missingMarkers: readonly string[];
    setupPending?: true;
    diagnostics: readonly string[];
    readError: string | undefined;
}

export interface DiscoveryResult {
    folders: readonly DiscoveredFolder[];
}

export interface DiscoveryOptions {
    sameRoot: (first: string, second: string) => boolean;
}

export const SETUP_PENDING_DIAGNOSTIC = 'FeatherSpec setup not finished: merge the files in .featherspec-setup/, then delete that folder';

const LEGACY_DIAGNOSTIC =
    'AGENTS.md has no FeatherSpecVersion: line (legacy project); run /sdd-featherspec-update to stamp the version.';

function describeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

async function discoverFolder(fileSystem: ReadOnlyFileSystem, folder: WorkspaceFolderInfo): Promise<DiscoveredFolder> {
    try {
        const classification = await classifyFolder(fileSystem, folder.root);
        const reading =
            classification.agentsText === undefined
                ? { version: 'unknown', diagnostics: [] as readonly string[] }
                : readVersionLine(classification.agentsText);
        const diagnostics = [...reading.diagnostics];
        if (classification.legacy) {
            diagnostics.push(LEGACY_DIAGNOSTIC);
        }
        if (classification.setupPending) {
            diagnostics.push(SETUP_PENDING_DIAGNOSTIC);
        }
        return {
            root: folder.root,
            name: folder.name,
            ...(folder.displayPath === undefined ? {} : { displayPath: folder.displayPath }),
            verdict: classification.verdict,
            legacy: classification.legacy,
            version: reading.version,
            setupRun: readSetupSign(classification.agentsText, classification.briefText),
            missingMarkers: classification.missingMarkers,
            ...(classification.setupPending ? { setupPending: true as const } : {}),
            diagnostics,
            readError: undefined,
        };
    } catch (error) {
        const failedPath = error instanceof FolderReadError ? error.path : 'the folder';
        const reason = error instanceof FolderReadError ? error.reason : describeError(error);
        return {
            root: folder.root,
            name: folder.name,
            ...(folder.displayPath === undefined ? {} : { displayPath: folder.displayPath }),
            verdict: 'not-a-project',
            legacy: false,
            version: 'unknown',
            setupRun: 'run or unknown',
            missingMarkers: [],
            diagnostics: [`Cannot read ${failedPath}: ${reason}`],
            readError: reason,
        };
    }
}

export async function discoverWorkspace(
    fileSystem: ReadOnlyFileSystem,
    folders: readonly WorkspaceFolderInfo[],
    options: DiscoveryOptions,
): Promise<DiscoveryResult> {
    const unique: WorkspaceFolderInfo[] = [];
    for (const folder of folders) {
        if (!unique.some((kept) => options.sameRoot(kept.root, folder.root))) {
            unique.push(folder);
        }
    }
    const discovered = await Promise.all(unique.map((folder) => discoverFolder(fileSystem, folder)));
    return { folders: discovered };
}
