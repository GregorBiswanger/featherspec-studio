import * as path from 'path';
import type { SpecSourcePort } from '../ports/specSource';
import type { Diagnostic } from './diagnostics';
import { readProjectFiles } from './files';
import type { LifecycleFolder, ProjectFile, ProjectFiles } from './files';
import { parsePlan } from './parsePlan';
import type { ParsedPlan } from './parsePlan';
import { parseSpec } from './parseSpec';
import type { ParsedSpec } from './parseSpec';
import { parseReturnNote } from './returnNote';
import type { ParsedReturnNote } from './returnNote';
import { checkVersion } from './version';

export interface EntryFacts {
    key: string;
    modifiedMs: number | undefined;
    size: number | undefined;
    readable: boolean;
}

export interface SpecEntry extends EntryFacts {
    reference: string;
    number: string;
    slug: string;
    folder: LifecycleFolder;
    parsed: ParsedSpec | undefined;
    planKeys: string[];
    returnNoteKeys: string[];
}

export interface PlanEntry extends EntryFacts {
    variant: 'sibling' | 'archived';
    reference: string;
    number: string;
    slug: string;
    folder: LifecycleFolder | undefined;
    date: string | undefined;
    suffix: number | undefined;
    parsed: ParsedPlan | undefined;
    specKeys: string[];
    specReferences: string[];
}

export interface ReturnNoteEntry extends EntryFacts {
    number: string;
    stepId: string;
    parsed: ParsedReturnNote | undefined;
    specKeys: string[];
    specReferences: string[];
}

export interface ProjectRead {
    root: string;
    version: string;
    specs: SpecEntry[];
    plans: PlanEntry[];
    returnNotes: ReturnNoteEntry[];
    diagnostics: Diagnostic[];
}

export interface Parsers {
    parseSpec: (text: string, key: string) => ParsedSpec;
    parsePlan: (text: string, key: string) => ParsedPlan;
    parseReturnNote: (text: string, key: string) => ParsedReturnNote;
}

const DEFAULT_PARSERS: Parsers = { parseSpec, parsePlan, parseReturnNote };
const MARKDOWN_LINK = /^\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

function compareKeys(left: { key: string }, right: { key: string }): number {
    return left.key < right.key ? -1 : left.key > right.key ? 1 : 0;
}

function unique(values: readonly string[]): string[] {
    return [...new Set(values)];
}

function parseFile<T>(file: ProjectFile, parse: (text: string, key: string) => T, diagnostics: Diagnostic[]): T | undefined {
    if (file.content.state !== 'text') {
        return undefined;
    }
    try {
        return parse(file.content.text, file.key);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        diagnostics.push({ kind: 'unreadable-file', scope: { file: file.key }, reason: `parsing failed: ${message}` });
        return undefined;
    }
}

function facts(file: ProjectFile): EntryFacts {
    return { key: file.key, modifiedMs: file.modifiedMs, size: file.size, readable: file.content.state === 'text' };
}

function linkTarget(raw: string): string | undefined {
    const match = MARKDOWN_LINK.exec(raw.trim());
    if (match === null || URL_SCHEME.test(match[1])) {
        return undefined;
    }
    const target = match[1].split('#')[0];
    try {
        return decodeURIComponent(target);
    } catch {
        return target;
    }
}

function resolveInRoot(fileKey: string, target: string): string | undefined {
    if (target === '' || target.startsWith('/') || target.startsWith('\\')) {
        return undefined;
    }
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(fileKey), target));
    return resolved === '..' || resolved.startsWith('../') ? undefined : resolved;
}

async function isDangling(
    source: SpecSourcePort,
    root: string,
    known: ReadonlySet<string>,
    fileKey: string,
    target: string,
): Promise<boolean> {
    const resolved = resolveInRoot(fileKey, target);
    if (resolved === undefined) {
        return true;
    }
    if (known.has(resolved)) {
        return false;
    }
    try {
        return (await source.stat(root, resolved)) === undefined;
    } catch {
        return false;
    }
}

export async function readProject(
    source: SpecSourcePort,
    root: string,
    version: string,
    parsers: Parsers = DEFAULT_PARSERS,
): Promise<ProjectRead> {
    return buildProject(source, root, version, await readProjectFiles(source, root), parsers);
}

export async function buildProject(
    source: SpecSourcePort,
    root: string,
    version: string,
    read: ProjectFiles,
    parsers: Parsers = DEFAULT_PARSERS,
): Promise<ProjectRead> {
    const diagnostics: Diagnostic[] = [];
    const versionDiagnostic = checkVersion(version);
    if (versionDiagnostic !== undefined) {
        diagnostics.push(versionDiagnostic);
    }
    diagnostics.push(...read.diagnostics);

    const specs: SpecEntry[] = [];
    const plans: PlanEntry[] = [];
    const returnNotes: ReturnNoteEntry[] = [];
    const parserDiagnostics: Diagnostic[] = [];
    for (const file of read.files) {
        if (file.kind === 'spec') {
            const parsed = parseFile(file, parsers.parseSpec, parserDiagnostics);
            parserDiagnostics.push(...(parsed?.diagnostics ?? []));
            specs.push({ ...facts(file), reference: file.reference, number: file.number, slug: file.slug, folder: file.folder, parsed, planKeys: [], returnNoteKeys: [] });
        } else if (file.kind === 'return-note') {
            const parsed = parseFile(file, parsers.parseReturnNote, parserDiagnostics);
            parserDiagnostics.push(...(parsed?.diagnostics ?? []));
            returnNotes.push({ ...facts(file), number: file.number, stepId: file.stepId, parsed, specKeys: [], specReferences: [] });
        } else {
            const parsed = parseFile(file, parsers.parsePlan, parserDiagnostics);
            parserDiagnostics.push(...(parsed?.diagnostics ?? []));
            plans.push({
                ...facts(file),
                variant: file.kind === 'plan' ? 'sibling' : 'archived',
                reference: file.reference,
                number: file.number,
                slug: file.slug,
                folder: file.kind === 'plan' ? file.folder : undefined,
                date: file.kind === 'archived-plan' ? file.date : undefined,
                suffix: file.kind === 'archived-plan' ? file.suffix : undefined,
                parsed,
                specKeys: [],
                specReferences: [],
            });
        }
    }
    specs.sort(compareKeys);
    plans.sort(compareKeys);
    returnNotes.sort(compareKeys);
    diagnostics.push(...parserDiagnostics);

    for (const plan of plans) {
        const matching = specs.filter((spec) => spec.reference === plan.reference);
        plan.specKeys = matching.map((spec) => spec.key);
        plan.specReferences = unique(matching.map((spec) => spec.reference));
        for (const spec of matching) {
            spec.planKeys.push(plan.key);
        }
        if (matching.length === 0) {
            diagnostics.push({ kind: 'orphan', scope: { file: plan.key }, reason: `plan matches no spec (${plan.reference})` });
        }
    }
    for (const note of returnNotes) {
        const matching = specs.filter((spec) => spec.number === note.number);
        note.specKeys = matching.map((spec) => spec.key);
        note.specReferences = unique(matching.map((spec) => spec.reference));
        for (const spec of matching) {
            spec.returnNoteKeys.push(note.key);
        }
        if (matching.length === 0) {
            diagnostics.push({ kind: 'orphan', scope: { file: note.key }, reason: `return note matches no spec (number ${note.number})` });
        }
    }
    for (const spec of specs) {
        const sameReference = specs.filter((other) => other !== spec && other.reference === spec.reference);
        if (sameReference.length > 0) {
            diagnostics.push({
                kind: 'duplicate',
                scope: { file: spec.key },
                reason: `reference ${spec.reference} also exists in ${sameReference.map((other) => other.key).join(', ')}`,
            });
        }
        const sameNumber = specs.filter((other) => other.number === spec.number && other.slug !== spec.slug);
        if (sameNumber.length > 0) {
            diagnostics.push({
                kind: 'duplicate',
                scope: { file: spec.key },
                reason: `number ${spec.number} also used by ${sameNumber.map((other) => other.key).join(', ')}`,
            });
        }
    }

    const known = new Set(read.files.map((file) => file.key));
    for (const spec of specs) {
        const field = spec.parsed?.plan;
        const target = field?.value.state === 'value' ? linkTarget(field.value.raw) : undefined;
        if (field !== undefined && target !== undefined && (await isDangling(source, root, known, spec.key, target))) {
            diagnostics.push({
                kind: 'dangling-link',
                scope: { file: spec.key, ...(field.line === undefined ? {} : { line: field.line }) },
                reason: `plan link ${target} points to a missing file`,
            });
        }
    }
    for (const plan of plans) {
        const field = plan.parsed?.spec;
        const target = plan.variant === 'sibling' && field?.value.state === 'value' ? linkTarget(field.value.raw) : undefined;
        if (field !== undefined && target !== undefined && (await isDangling(source, root, known, plan.key, target))) {
            diagnostics.push({
                kind: 'dangling-link',
                scope: { file: plan.key, ...(field.line === undefined ? {} : { line: field.line }) },
                reason: `spec link ${target} points to a missing file`,
            });
        }
    }
    return { root, version, specs, plans, returnNotes, diagnostics };
}
