import type { SetupTargetPort } from '../ports/setupTarget';
import { completeGitignore } from './gitignore';
import type { ReleaseFile } from './releaseArchive';
import { completeSettings } from './settingsJson';

export type FileClass =
    | { kind: 'missing'; file: ReleaseFile }
    | { kind: 'same'; file: ReleaseFile }
    | { kind: 'left'; file: ReleaseFile; keptSettingKeys: readonly string[] }
    | { kind: 'completed'; file: ReleaseFile; basis: Uint8Array; content: Uint8Array; keptSettingKeys: readonly string[] }
    | { kind: 'kept'; file: ReleaseFile };

export const GITIGNORE_PATH = '.gitignore';
export const SETTINGS_PATH = '.vscode/settings.json';

export function withoutCarriageReturns(bytes: Uint8Array): Uint8Array {
    const out = new Uint8Array(bytes.length);
    let length = 0;
    for (let index = 0; index < bytes.length; index++) {
        if (bytes[index] === 0x0d && bytes[index + 1] === 0x0a) {
            continue;
        }
        out[length++] = bytes[index] ?? 0;
    }
    return out.slice(0, length);
}

export function sameBytes(first: Uint8Array, second: Uint8Array): boolean {
    return first.length === second.length && first.every((byte, index) => byte === second[index]);
}

export function classifyExisting(file: ReleaseFile, existing: Uint8Array): FileClass {
    if (sameBytes(withoutCarriageReturns(existing), withoutCarriageReturns(file.bytes))) {
        return { kind: 'same', file };
    }
    if (file.path === GITIGNORE_PATH) {
        const result = completeGitignore(existing, file.bytes);
        if (result.kind === 'completed') {
            return { kind: 'completed', file, basis: existing, content: result.content, keptSettingKeys: [] };
        }
        return { kind: 'left', file, keptSettingKeys: [] };
    }
    if (file.path === SETTINGS_PATH) {
        const result = completeSettings(existing, file.bytes);
        if (result.kind === 'completed') {
            return { kind: 'completed', file, basis: existing, content: result.content, keptSettingKeys: result.keptKeys };
        }
        return result.kind === 'nothing-to-add' ? { kind: 'left', file, keptSettingKeys: result.keptKeys } : { kind: 'kept', file };
    }
    return { kind: 'kept', file };
}

export async function classifyFile(target: SetupTargetPort, root: string, file: ReleaseFile): Promise<FileClass> {
    const kind = await target.kind(root, file.path);
    if (kind === undefined) {
        return { kind: 'missing', file };
    }
    if (kind !== 'file') {
        return file.path === GITIGNORE_PATH ? { kind: 'left', file, keptSettingKeys: [] } : { kind: 'kept', file };
    }
    return classifyExisting(file, await target.readBytes(root, file.path));
}

export async function classifyFiles(target: SetupTargetPort, root: string, files: readonly ReleaseFile[]): Promise<FileClass[]> {
    const classes: FileClass[] = [];
    for (const file of files) {
        classes.push(await classifyFile(target, root, file));
    }
    return classes;
}
