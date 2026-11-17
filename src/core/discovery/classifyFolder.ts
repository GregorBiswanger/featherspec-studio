import type { ReadOnlyFileSystem } from '../ports/readOnlyFileSystem';
import { SETUP_FOLDER } from './markerWatchPaths';

export type FolderVerdict = 'project' | 'incomplete' | 'not-a-project';

export interface FolderClassification {
    verdict: FolderVerdict;
    legacy: boolean;
    missingMarkers: readonly string[];
    setupPending: boolean;
    agentsText: string | undefined;
}

export const VERSION_LINE_PATTERN = /^[ \t]*FeatherSpecVersion:/m;

export class FolderReadError extends Error {
    constructor(
        readonly path: string,
        readonly reason: string,
    ) {
        super(reason);
        this.name = 'FolderReadError';
    }
}

async function reading<T>(path: string, read: () => Promise<T>): Promise<T> {
    try {
        return await read();
    } catch (error) {
        throw new FolderReadError(path, error instanceof Error ? error.message : String(error));
    }
}

const MISSING_M1 = 'AGENTS.md with a FeatherSpecVersion: line';
const MISSING_M2 = '.specs/ directory';

async function hasSddCommand(fileSystem: ReadOnlyFileSystem, root: string): Promise<boolean> {
    const names = await reading('.claude/commands', () => fileSystem.readDirectory(root, '.claude/commands'));
    return (names ?? []).some((name) => /^sdd-.+\.md$/.test(name));
}

export async function classifyFolder(fileSystem: ReadOnlyFileSystem, root: string): Promise<FolderClassification> {
    const agentsKind = await reading('AGENTS.md', () => fileSystem.stat(root, 'AGENTS.md'));
    const agentsText = agentsKind === 'file' ? await reading('AGENTS.md', () => fileSystem.readText(root, 'AGENTS.md')) : undefined;
    const hasM1 = agentsText !== undefined && VERSION_LINE_PATTERN.test(agentsText);
    const hasM2 = (await reading('.specs', () => fileSystem.stat(root, '.specs'))) === 'directory';
    const setupPending = (await reading(SETUP_FOLDER, () => fileSystem.stat(root, SETUP_FOLDER))) === 'directory';

    if (setupPending) {
        return { verdict: 'incomplete', legacy: false, missingMarkers: [], setupPending: true, agentsText };
    }
    if (hasM1 && hasM2) {
        return { verdict: 'project', legacy: false, missingMarkers: [], setupPending: false, agentsText };
    }
    if (agentsText !== undefined && hasM2 && (await hasSddCommand(fileSystem, root))) {
        return { verdict: 'project', legacy: true, missingMarkers: [], setupPending: false, agentsText };
    }
    if (hasM1) {
        return { verdict: 'incomplete', legacy: false, missingMarkers: [MISSING_M2], setupPending: false, agentsText };
    }
    if (hasM2) {
        return { verdict: 'incomplete', legacy: false, missingMarkers: [MISSING_M1], setupPending: false, agentsText };
    }
    return { verdict: 'not-a-project', legacy: false, missingMarkers: [], setupPending: false, agentsText };
}
