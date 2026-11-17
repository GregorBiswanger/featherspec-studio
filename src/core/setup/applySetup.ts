import type { SetupTargetPort } from '../ports/setupTarget';
import { classifyExisting, GITIGNORE_PATH, type FileClass } from './fileClasses';
import type { ReleaseFile } from './releaseArchive';
import { SETUP_FOLDER } from '../discovery/markerWatchPaths';

export const PARKED_GITIGNORE = `${SETUP_FOLDER}/.gitignore`;
const AGENTS_PATH = 'AGENTS.md';
const MAX_RECLASSIFY = 3;

export interface SetupOutcome {
    created: string[];
    completed: string[];
    kept: string[];
    notWritten: string[];
    keptSettingKeys: string[];
    wroteAnything: boolean;
    stopped: { path: string; reason: string } | undefined;
}

class WriteStop extends Error {
    constructor(
        readonly path: string,
        readonly reason: string,
    ) {
        super(reason);
    }
}

function reasonOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function parkedPath(path: string): string {
    return `${SETUP_FOLDER}/${path}`;
}

export function plannedPaths(classes: readonly FileClass[]): string[] {
    const kept = classes.filter((entry) => entry.kind === 'kept');
    const missing = classes.filter((entry) => entry.kind === 'missing');
    const completed = classes.filter((entry) => entry.kind === 'completed');
    return [
        ...(kept.length > 0 ? [PARKED_GITIGNORE, ...kept.map((entry) => parkedPath(entry.file.path))] : []),
        ...missing.filter((entry) => entry.file.path !== AGENTS_PATH).map((entry) => entry.file.path),
        ...completed.map((entry) => entry.file.path),
        ...missing.filter((entry) => entry.file.path === AGENTS_PATH).map((entry) => entry.file.path),
    ];
}

export async function applySetup(target: SetupTargetPort, root: string, classes: readonly FileClass[]): Promise<SetupOutcome> {
    const outcome: SetupOutcome = { created: [], completed: [], kept: [], notWritten: [], keptSettingKeys: [], wroteAnything: false, stopped: undefined };
    const planned = plannedPaths(classes);
    const done = new Set<string>();
    const encoder = new TextEncoder();
    let setupFolderReady = false;

    async function guarded<T>(path: string, write: () => Promise<T>): Promise<T> {
        try {
            return await write();
        } catch (error) {
            throw new WriteStop(path, reasonOf(error));
        }
    }

    async function ensureSetupFolder(): Promise<void> {
        if (!setupFolderReady) {
            await guarded(PARKED_GITIGNORE, () => target.createExclusive(root, PARKED_GITIGNORE, encoder.encode('*\n')));
            outcome.wroteAnything = true;
            setupFolderReady = true;
            done.add(PARKED_GITIGNORE);
        }
    }

    async function park(file: ReleaseFile): Promise<void> {
        await ensureSetupFolder();
        const where = parkedPath(file.path);
        const result = await guarded(where, () => target.createExclusive(root, where, file.bytes));
        if (result === 'exists') {
            throw new WriteStop(where, 'it already exists');
        }
        outcome.wroteAnything = true;
        done.add(where);
        if (!outcome.kept.includes(file.path)) {
            outcome.kept.push(file.path);
        }
    }

    async function settle(file: ReleaseFile, existing: Uint8Array, attempts: number): Promise<void> {
        const next = classifyExisting(file, existing);
        switch (next.kind) {
            case 'same':
                return;
            case 'left':
                outcome.keptSettingKeys.push(...next.keptSettingKeys);
                return;
            case 'kept':
                await park(file);
                return;
            case 'completed': {
                const result = await guarded(file.path, () => target.replaceIfUnchanged(root, file.path, next.basis, next.content));
                if (result === 'replaced') {
                    outcome.wroteAnything = true;
                    outcome.completed.push(file.path);
                    outcome.keptSettingKeys.push(...next.keptSettingKeys);
                    return;
                }
                await reread(file, attempts + 1);
                return;
            }
            case 'missing':
                return;
        }
    }

    async function reread(file: ReleaseFile, attempts: number): Promise<void> {
        const kind = await guarded(file.path, () => target.kind(root, file.path));
        if (kind === undefined) {
            await create(file);
            return;
        }
        if (kind !== 'file' || attempts > MAX_RECLASSIFY) {
            if (file.path !== GITIGNORE_PATH) {
                await park(file);
            }
            return;
        }
        const existing = await guarded(file.path, () => target.readBytes(root, file.path));
        await settle(file, existing, attempts);
    }

    async function create(file: ReleaseFile): Promise<void> {
        const result = await guarded(file.path, () => target.createExclusive(root, file.path, file.bytes));
        if (result === 'created') {
            outcome.wroteAnything = true;
            outcome.created.push(file.path);
            done.add(file.path);
            return;
        }
        const kind = await guarded(file.path, () => target.kind(root, file.path));
        if (kind !== 'file') {
            if (file.path !== GITIGNORE_PATH) {
                await park(file);
            }
            return;
        }
        const existing = await guarded(file.path, () => target.readBytes(root, file.path));
        await settle(file, existing, 0);
    }

    try {
        const earlierSetupFolder = (await guarded(SETUP_FOLDER, () => target.kind(root, SETUP_FOLDER))) !== undefined;
        await guarded(SETUP_FOLDER, () => target.clearSetupFolder(root));
        outcome.wroteAnything = earlierSetupFolder;
        for (const entry of classes) {
            if (entry.kind === 'kept') {
                await park(entry.file);
            }
        }
        const missing = classes.filter((entry): entry is Extract<FileClass, { kind: 'missing' }> => entry.kind === 'missing');
        for (const entry of missing.filter((each) => each.file.path !== AGENTS_PATH)) {
            await create(entry.file);
            done.add(entry.file.path);
        }
        for (const entry of classes) {
            if (entry.kind === 'completed') {
                const result = await guarded(entry.file.path, () => target.replaceIfUnchanged(root, entry.file.path, entry.basis, entry.content));
                if (result === 'replaced') {
                    outcome.wroteAnything = true;
                    outcome.completed.push(entry.file.path);
                    outcome.keptSettingKeys.push(...entry.keptSettingKeys);
                } else {
                    await reread(entry.file, 1);
                }
                done.add(entry.file.path);
            } else if (entry.kind === 'left') {
                outcome.keptSettingKeys.push(...entry.keptSettingKeys);
            }
        }
        for (const entry of missing.filter((each) => each.file.path === AGENTS_PATH)) {
            await create(entry.file);
            done.add(entry.file.path);
        }
    } catch (error) {
        if (!(error instanceof WriteStop)) {
            throw error;
        }
        outcome.stopped = { path: error.path, reason: error.reason };
        outcome.notWritten = planned.filter((path) => !done.has(path));
    }
    return outcome;
}
