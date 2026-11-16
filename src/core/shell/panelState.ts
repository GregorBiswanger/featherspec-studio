import type { DiscoveredFolder } from '../discovery/discoverWorkspace';
import type { DiscoverySnapshot } from '../discovery/discoveryController';
import type { PanelState } from '../../shared/protocol/messages';
import type { ProjectRead } from '../specs/readProject';

export interface ListingFailure {
    folder: string;
    reason: string;
}

export interface PanelStateInput {
    folderCount: number;
    discovery: DiscoverySnapshot | undefined;
    modelLoaded: boolean;
    listingFailure: ListingFailure | undefined;
    sameRoot: (first: string, second: string) => boolean;
}

const LIFECYCLE_FOLDER_KEYS: readonly string[] = ['.specs', '.specs/backlog', '.specs/active', '.specs/done'];
const LISTING_PREFIX = 'could not be listed: ';

function lastSegment(root: string): string {
    const segment = root.split(/[\\/]/).filter((part) => part.length > 0).pop() ?? root;
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

function missingProjectName(root: string, folders: readonly DiscoveredFolder[], sameRoot: PanelStateInput['sameRoot']): string {
    return folders.find((folder) => sameRoot(folder.root, root))?.name ?? lastSegment(root);
}

export function derivePanelState(input: PanelStateInput): PanelState | undefined {
    if (input.folderCount === 0) {
        return { id: 'S1' };
    }
    const discovery = input.discovery;
    const result = discovery?.result;
    if (discovery !== undefined && result !== undefined) {
        const folders = result.folders;
        const projects = folders.filter((folder) => folder.verdict === 'project');
        const incomplete = folders.filter((folder) => folder.verdict === 'incomplete');
        if (discovery.remembered !== undefined) {
            const remembered = discovery.remembered;
            if (!projects.some((project) => input.sameRoot(project.root, remembered))) {
                return { id: 'S8', name: missingProjectName(remembered, folders, input.sameRoot), canSelect: projects.length > 0 };
            }
        } else if (discovery.active === undefined) {
            if (projects.length === 0 && incomplete.length === 0) {
                return { id: 'S2' };
            }
            if (projects.length === 0) {
                return { id: 'S9', folders: incomplete.map((folder) => ({ folder: folder.name, markers: [...folder.missingMarkers] })) };
            }
            if (projects.length > 1) {
                return { id: 'S3' };
            }
        }
    }
    if (discovery?.failure !== undefined) {
        return { id: 'S5', reason: { cause: 'discovery', message: discovery.failure } };
    }
    if (input.listingFailure !== undefined) {
        return { id: 'S5', reason: { cause: 'listing', folder: input.listingFailure.folder, reason: input.listingFailure.reason } };
    }
    if (result === undefined || (discovery?.active !== undefined && !input.modelLoaded)) {
        return { id: 'S4' };
    }
    return undefined;
}

export function listingFailure(project: ProjectRead): ListingFailure | undefined {
    for (const diagnostic of project.diagnostics) {
        if (diagnostic.kind !== 'unreadable-file' || diagnostic.scope === 'project') {
            continue;
        }
        if (LIFECYCLE_FOLDER_KEYS.includes(diagnostic.scope.file) && diagnostic.reason.startsWith(LISTING_PREFIX)) {
            return { folder: diagnostic.scope.file, reason: diagnostic.reason.slice(LISTING_PREFIX.length) };
        }
    }
    return undefined;
}
