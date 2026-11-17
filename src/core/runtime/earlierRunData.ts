import type { EarlierRunDataFilesPort, EarlierRunDataStatePort } from '../ports/earlierRunData';
import type { OutputPort } from '../ports/host';
import { keptEarlierDataLine, removedEarlierDataLine } from './earlierRunDataTexts';
import { FORMAT_VERSION } from './model';

export const COPILOT_HOME_PATH = 'copilot-home';
export const PROJECTS_PATH = 'featherspec-studio/projects';
export const AGENT_CENTER_STATE_KEY = 'featherspec-studio.agentCenter';

const INDEX_FILE = 'index.json';
const INDEX_TEMP_PREFIX = 'index.json.tmp-';
const RUNS_FOLDER = 'runs';

export interface EarlierRunDataDeps {
    files: EarlierRunDataFilesPort | undefined;
    state: EarlierRunDataStatePort;
    output: OutputPort;
}

export interface EarlierRunDataResult {
    removed: string[];
    kept: { path: string; reason: string }[];
}

function reasonOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

async function namesFormatVersionOtherThanOurs(files: EarlierRunDataFilesPort, folder: string): Promise<boolean> {
    const text = await files.read(`${folder}/store.json`);
    if (text === undefined) {
        return false;
    }
    try {
        const parsed: unknown = JSON.parse(text);
        const version = typeof parsed === 'object' && parsed !== null ? (parsed as { storeVersion?: unknown }).storeVersion : undefined;
        return typeof version === 'number' && version !== FORMAT_VERSION;
    } catch {
        return false;
    }
}

export async function removeEarlierRunData(deps: EarlierRunDataDeps): Promise<EarlierRunDataResult> {
    const result: EarlierRunDataResult = { removed: [], kept: [] };
    const { files } = deps;
    if (files === undefined) {
        return result;
    }

    async function removeIfPresent(path: string): Promise<void> {
        try {
            if (!(await files!.exists(path))) {
                return;
            }
            await files!.remove(path);
            result.removed.push(path);
        } catch (error) {
            result.kept.push({ path, reason: reasonOf(error) });
        }
    }

    await removeIfPresent(COPILOT_HOME_PATH);

    let folders: string[] = [];
    try {
        folders = await files.entries(PROJECTS_PATH);
    } catch (error) {
        result.kept.push({ path: PROJECTS_PATH, reason: reasonOf(error) });
    }
    for (const name of [...folders].sort()) {
        const folder = `${PROJECTS_PATH}/${name}`;
        try {
            if (await namesFormatVersionOtherThanOurs(files, folder)) {
                continue;
            }
            const inside = await files.entries(folder);
            const temporary = inside.filter((entry) => entry.startsWith(INDEX_TEMP_PREFIX)).sort();
            for (const entry of [INDEX_FILE, ...temporary, RUNS_FOLDER]) {
                await removeIfPresent(`${folder}/${entry}`);
            }
        } catch (error) {
            result.kept.push({ path: folder, reason: reasonOf(error) });
        }
    }

    if (deps.state.has(AGENT_CENTER_STATE_KEY)) {
        try {
            await deps.state.remove(AGENT_CENTER_STATE_KEY);
            result.removed.push(`workspace state ${AGENT_CENTER_STATE_KEY}`);
        } catch (error) {
            result.kept.push({ path: `workspace state ${AGENT_CENTER_STATE_KEY}`, reason: reasonOf(error) });
        }
    }

    if (result.removed.length > 0) {
        deps.output.appendBlock([removedEarlierDataLine(result.removed)]);
    }
    for (const kept of result.kept) {
        deps.output.appendBlock([keptEarlierDataLine(kept.path, kept.reason)]);
    }
    return result;
}
