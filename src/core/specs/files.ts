import type { SourceEntryKind, SourceStat, SpecSourcePort } from '../ports/specSource';
import type { Diagnostic } from './diagnostics';
import { decodeText, InvalidEncodingError } from './text';

export type LifecycleFolder = 'backlog' | 'active' | 'done';

export type FileContent = { state: 'text'; text: string } | { state: 'unreadable'; reason: string };

export interface FileFacts {
    key: string;
    modifiedMs: number | undefined;
    size: number | undefined;
    content: FileContent;
}

export type ProjectFile = FileFacts &
    (
        | { kind: 'spec'; reference: string; number: string; slug: string; folder: LifecycleFolder }
        | { kind: 'plan'; reference: string; number: string; slug: string; folder: LifecycleFolder }
        | {
              kind: 'archived-plan';
              reference: string;
              number: string;
              slug: string;
              date: string;
              suffix: number | undefined;
          }
        | { kind: 'return-note'; number: string; stepId: string }
    );

export type ReuseFile = (key: string, stats: SourceStat | undefined) => ProjectFile | undefined;

export interface ProjectFiles {
    files: ProjectFile[];
    diagnostics: Diagnostic[];
}

type Identity = ProjectFile extends infer F ? (F extends FileFacts ? Omit<F, keyof FileFacts> : never) : never;

interface Candidate {
    key: string;
    identity: Identity;
}

const LIFECYCLE_FOLDERS: readonly LifecycleFolder[] = ['backlog', 'active', 'done'];
const SPEC_NAME = /^(\d{4})-(.+)\.md$/;
const PLAN_NAME = /^(\d{4})-(.+)\.plan\.md$/;
const ARCHIVED_PLAN_NAME = /^(\d{4})-(.+)\.(\d{4}-\d{2}-\d{2})(?:-(\d+))?\.plan\.md$/;
const RETURN_NOTE_NAME = /^activeContext\.(\d{4})-(T-\d+)\.md$/;
const SYMLINK_REASON = 'symbolic link not followed';

function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function classifyLifecycleName(name: string, folder: LifecycleFolder): Identity | undefined {
    const plan = PLAN_NAME.exec(name);
    if (plan !== null) {
        return { kind: 'plan', reference: `${plan[1]}-${plan[2]}`, number: plan[1], slug: plan[2], folder };
    }
    const spec = SPEC_NAME.exec(name);
    if (spec !== null) {
        return { kind: 'spec', reference: `${spec[1]}-${spec[2]}`, number: spec[1], slug: spec[2], folder };
    }
    return undefined;
}

function classifyArchiveName(name: string): Identity | undefined {
    const match = ARCHIVED_PLAN_NAME.exec(name);
    if (match === null) {
        return undefined;
    }
    return {
        kind: 'archived-plan',
        reference: `${match[1]}-${match[2]}`,
        number: match[1],
        slug: match[2],
        date: match[3],
        suffix: match[4] === undefined ? undefined : Number(match[4]),
    };
}

function classifyNoteName(name: string): Identity | undefined {
    const match = RETURN_NOTE_NAME.exec(name);
    return match === null ? undefined : { kind: 'return-note', number: match[1], stepId: match[2] };
}

async function readOne(
    source: SpecSourcePort,
    root: string,
    candidate: Candidate,
    diagnostics: Diagnostic[],
    reuse: ReuseFile | undefined,
): Promise<ProjectFile> {
    let modifiedMs: number | undefined;
    let size: number | undefined;
    let kind: SourceEntryKind | undefined;
    let stats: SourceStat | undefined;
    try {
        stats = await source.stat(root, candidate.key);
        modifiedMs = stats?.mtimeMs;
        size = stats?.size;
        kind = stats?.kind;
    } catch {
        modifiedMs = undefined;
        size = undefined;
    }
    const reused = reuse?.(candidate.key, stats);
    if (reused !== undefined) {
        if (reused.content.state === 'unreadable') {
            diagnostics.push({ kind: 'unreadable-file', tier: 'problem', scope: { file: candidate.key }, reason: reused.content.reason });
        }
        return reused;
    }
    let content: FileContent;
    if (kind === 'symlink') {
        content = { state: 'unreadable', reason: SYMLINK_REASON };
    } else {
        try {
            content = { state: 'text', text: decodeText(await source.readBytes(root, candidate.key)) };
        } catch (error) {
            content = {
                state: 'unreadable',
                reason: error instanceof InvalidEncodingError ? error.message : `could not be read: ${messageOf(error)}`,
            };
        }
    }
    if (content.state === 'unreadable') {
        diagnostics.push({ kind: 'unreadable-file', tier: 'problem', scope: { file: candidate.key }, reason: content.reason });
    }
    return { ...candidate.identity, key: candidate.key, modifiedMs, size, content } as ProjectFile;
}

async function collect(
    source: SpecSourcePort,
    root: string,
    folderKey: string,
    classify: (name: string) => Identity | undefined,
    diagnostics: Diagnostic[],
): Promise<Candidate[]> {
    try {
        const entries = await source.list(root, folderKey);
        if (entries === undefined) {
            return [];
        }
        const candidates: Candidate[] = [];
        for (const entry of entries) {
            if (entry.kind !== 'file' && entry.kind !== 'symlink') {
                continue;
            }
            const identity = classify(entry.name);
            if (identity !== undefined) {
                candidates.push({ key: `${folderKey}/${entry.name}`, identity });
            }
        }
        return candidates;
    } catch (error) {
        diagnostics.push({ kind: 'unreadable-file', tier: 'problem', scope: { file: folderKey }, reason: `could not be listed: ${messageOf(error)}` });
        return [];
    }
}

async function isFollowable(source: SpecSourcePort, root: string, folderKey: string, diagnostics: Diagnostic[]): Promise<boolean> {
    try {
        const stats = await source.stat(root, folderKey);
        if (stats === undefined || (stats.kind !== 'directory' && stats.kind !== 'symlink')) {
            return false;
        }
        if (stats.kind === 'symlink') {
            diagnostics.push({ kind: 'unreadable-file', tier: 'problem', scope: { file: folderKey }, reason: SYMLINK_REASON });
            return false;
        }
        return true;
    } catch (error) {
        diagnostics.push({ kind: 'unreadable-file', tier: 'problem', scope: { file: folderKey }, reason: `could not be listed: ${messageOf(error)}` });
        return false;
    }
}

export async function readProjectFiles(source: SpecSourcePort, root: string, reuse?: ReuseFile): Promise<ProjectFiles> {
    const diagnostics: Diagnostic[] = [];
    const candidates: Candidate[] = [];
    if (await isFollowable(source, root, '.specs', diagnostics)) {
        for (const folder of LIFECYCLE_FOLDERS) {
            const folderKey = `.specs/${folder}`;
            if (await isFollowable(source, root, folderKey, diagnostics)) {
                candidates.push(...(await collect(source, root, folderKey, (name) => classifyLifecycleName(name, folder), diagnostics)));
            }
        }
        if (await isFollowable(source, root, '.specs/plan-archive', diagnostics)) {
            candidates.push(...(await collect(source, root, '.specs/plan-archive', classifyArchiveName, diagnostics)));
        }
    }
    if (await isFollowable(source, root, '.memory-bank', diagnostics)) {
        candidates.push(...(await collect(source, root, '.memory-bank', classifyNoteName, diagnostics)));
    }
    candidates.sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));
    const fileDiagnostics: Diagnostic[][] = candidates.map(() => []);
    const files = await Promise.all(candidates.map((candidate, index) => readOne(source, root, candidate, fileDiagnostics[index], reuse)));
    return { files, diagnostics: [...diagnostics, ...fileDiagnostics.flat()] };
}
