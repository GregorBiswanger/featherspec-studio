import { readVersionLine } from '../discovery/versionLine';
import type { ArchiveEntry, ReleaseArchivePort } from '../ports/releaseArchive';
import { ARCHIVE_REFUSAL, MAX_ARCHIVE_BYTES } from './setupTexts';

export interface ReleaseFile {
    path: string;
    bytes: Uint8Array;
}

export type ReleaseCheck = { ok: true; version: string; files: readonly ReleaseFile[] } | { ok: false; reason: string };

const LEFT_OUT_AT_ROOT: readonly string[] = ['CHANGELOG.md', 'LICENSE', 'README.md', 'featherspec-logo.png'];

function refuse(reason: string): ReleaseCheck {
    return { ok: false, reason };
}

function cleanPath(entryPath: string): string {
    return entryPath.endsWith('/') ? entryPath.slice(0, -1) : entryPath;
}

function unsafe(entryPath: string): boolean {
    if (entryPath.startsWith('/') || /[\\:]/.test(entryPath) || /[\u0000-\u001f\u007f]/.test(entryPath)) {
        return true;
    }
    return entryPath.split('/').some((segment) => segment === '' || segment === '.' || segment === '..' || segment.toLowerCase() === '.git');
}

function firstProblem(entries: readonly ArchiveEntry[]): string | undefined {
    for (const entry of entries) {
        if (entry.kind === 'other') {
            return ARCHIVE_REFUSAL.otherEntry(entry.path);
        }
    }
    for (const entry of entries) {
        if (unsafe(cleanPath(entry.path))) {
            return ARCHIVE_REFUSAL.unsafePath(entry.path);
        }
    }
    const seen = new Map<string, string>();
    for (const entry of entries) {
        const key = cleanPath(entry.path).toLowerCase();
        const earlier = seen.get(key);
        if (earlier !== undefined) {
            return ARCHIVE_REFUSAL.caseCollision(earlier, entry.path);
        }
        seen.set(key, entry.path);
    }
    return undefined;
}

export async function checkRelease(archive: ReleaseArchivePort, bytes: Uint8Array): Promise<ReleaseCheck> {
    if (bytes.length > MAX_ARCHIVE_BYTES) {
        return refuse(ARCHIVE_REFUSAL.tooLarge);
    }
    const read = await archive.read(bytes, MAX_ARCHIVE_BYTES);
    if (!read.ok) {
        return refuse(read.failure === 'too-large' ? ARCHIVE_REFUSAL.tooLarge : ARCHIVE_REFUSAL.unreadable);
    }
    const entries = read.entries.filter((entry) => entry.kind !== 'metadata');
    const problem = firstProblem(entries);
    if (problem !== undefined) {
        return refuse(problem);
    }
    const tops = new Set(entries.map((entry) => cleanPath(entry.path).split('/')[0]));
    const rootFile = entries.some((entry) => entry.kind === 'file' && !cleanPath(entry.path).includes('/'));
    const top = [...tops][0];
    if (tops.size !== 1 || rootFile || top === undefined) {
        return refuse(ARCHIVE_REFUSAL.noTopFolder);
    }
    const files: ReleaseFile[] = entries
        .filter((entry) => entry.kind === 'file')
        .map((entry) => ({ path: cleanPath(entry.path).slice(top.length + 1), bytes: entry.bytes }));
    const agents = files.find((entry) => entry.path === 'AGENTS.md');
    const version = agents === undefined ? 'unknown' : readVersionLine(new TextDecoder().decode(agents.bytes)).version;
    if (version === 'unknown') {
        return refuse(ARCHIVE_REFUSAL.noAgents);
    }
    if (!files.some((entry) => entry.path.startsWith('.specs/'))) {
        return refuse(ARCHIVE_REFUSAL.noSpecsFile);
    }
    return { ok: true, version, files: files.filter((entry) => !LEFT_OUT_AT_ROOT.includes(entry.path)) };
}

export { archiveRefusedText } from './setupTexts';
