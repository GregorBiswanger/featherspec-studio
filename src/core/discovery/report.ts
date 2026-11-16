import type { NotificationModel, SelectItem } from '../ports/host';
import type { DiscoveredFolder, DiscoveryResult } from './discoverWorkspace';

export const SETUP_GUIDE_URL = 'https://github.com/GregorBiswanger/featherspec/wiki';

function verdictText(folder: DiscoveredFolder): string {
    if (folder.verdict === 'project') {
        return folder.legacy ? 'project (legacy)' : 'project';
    }
    return folder.verdict === 'incomplete' ? 'incomplete' : 'not a project';
}

export function formatOutputBlock(result: DiscoveryResult, label: string): string[] {
    const lines = [`FeatherSpec Studio discovery - ${label}`];
    if (result.folders.length === 0) {
        lines.push('No workspace folder is open.');
        return lines;
    }
    for (const folder of result.folders) {
        lines.push(folder.root);
        lines.push(`  verdict: ${verdictText(folder)}`);
        lines.push(`  version: ${folder.version}`);
        for (const marker of folder.missingMarkers) {
            lines.push(`  missing: ${marker}`);
        }
        for (const diagnostic of folder.diagnostics) {
            lines.push(`  diagnostic: ${diagnostic}`);
        }
        if (folder.verdict === 'not-a-project' && folder.readError === undefined) {
            lines.push('  hint: open the project folder itself');
        }
    }
    return lines;
}

export function buildSelectItems(result: DiscoveryResult): SelectItem[] {
    return result.folders
        .filter((folder) => folder.verdict === 'project')
        .map((folder) => ({ label: folder.name, description: folder.version, detail: folder.root, root: folder.root }));
}

export function buildNoProjectNotification(folderCount: number): NotificationModel {
    if (folderCount === 0) {
        return { message: 'Open a folder to use FeatherSpec Studio', actions: [] };
    }
    return { message: 'No FeatherSpec project found in this workspace', actions: ['Open setup guide', 'Refresh'] };
}
