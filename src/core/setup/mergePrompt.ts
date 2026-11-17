import { SETUP_FOLDER } from '../discovery/markerWatchPaths';
import type { SetupTargetPort } from '../ports/setupTarget';
import { mergePromptText } from './setupTexts';

const OWN_GITIGNORE = '.gitignore';

async function walk(target: SetupTargetPort, root: string, relative: string, found: string[]): Promise<void> {
    const names = await target.listDirectory(root, `${SETUP_FOLDER}${relative === '' ? '' : `/${relative}`}`);
    for (const name of names ?? []) {
        const path = relative === '' ? name : `${relative}/${name}`;
        const kind = await target.kind(root, `${SETUP_FOLDER}/${path}`);
        if (kind === 'directory') {
            await walk(target, root, path, found);
        } else if (kind === 'file' && path !== OWN_GITIGNORE) {
            found.push(path);
        }
    }
}

export async function gatherParkedFiles(target: SetupTargetPort, root: string): Promise<string[]> {
    const found: string[] = [];
    await walk(target, root, '', found);
    return found.sort();
}

export function buildMergePrompt(folderPath: string, files: readonly string[]): string {
    return mergePromptText(folderPath, files);
}
