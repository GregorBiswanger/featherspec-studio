import type { ReadOnlyFileSystem } from '../ports/readOnlyFileSystem';
import { classifyFolder, type FolderVerdict } from './classifyFolder';
import { readVersionLine } from './versionLine';

export interface WorkspaceFolderInfo {
    root: string;
    name: string;
}

export interface DiscoveredFolder {
    root: string;
    name: string;
    verdict: FolderVerdict;
    legacy: boolean;
    version: string;
    missingMarkers: readonly string[];
    diagnostics: readonly string[];
    readError: string | undefined;
}

export interface DiscoveryResult {
    folders: readonly DiscoveredFolder[];
}

export interface DiscoveryOptions {
    sameRoot: (first: string, second: string) => boolean;
}

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
        return {
            root: folder.root,
            name: folder.name,
            verdict: classification.verdict,
            legacy: classification.legacy,
            version: reading.version,
            missingMarkers: classification.missingMarkers,
            diagnostics,
            readError: undefined,
        };
    } catch (error) {
        const reason = describeError(error);
        return {
            root: folder.root,
            name: folder.name,
            verdict: 'not-a-project',
            legacy: false,
            version: 'unknown',
            missingMarkers: [],
            diagnostics: [`Cannot read AGENTS.md: ${reason}`],
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
