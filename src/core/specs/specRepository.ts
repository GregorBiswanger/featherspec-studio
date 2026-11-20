import type { FileWatchPort } from '../ports/fileWatch';
import type { ClockPort, Disposable } from '../ports/host';
import type { SpecSourcePort } from '../ports/specSource';
import type { SetupRun } from '../discovery/setupSign';
import { createRerunScheduler } from '../discovery/rerunScheduler';
import { readProjectFiles } from './files';
import type { ProjectFile } from './files';
import { buildProject } from './readProject';
import type { ProjectRead } from './readProject';

export interface RepositoryProject {
    root: string;
    version: string;
    setupRun?: SetupRun;
}

export interface SpecChange {
    references: string[];
    untied: boolean;
    cause: 'files' | 'rescan' | 'project';
}

export interface SpecRepository {
    open(project: RepositoryProject | undefined): Promise<void>;
    rescan(): Promise<void>;
    snapshot(): ProjectRead | undefined;
    readAt(): string | undefined;
    onDidChange(listener: (change: SpecChange) => void): Disposable;
    whenIdle(): Promise<void>;
    dispose(): void;
}

export interface SpecRepositoryOptions {
    source: SpecSourcePort;
    watch: FileWatchPort;
    clock: ClockPort;
    debounceMs?: number;
    caseInsensitiveEvents?: boolean;
}

interface State {
    project: RepositoryProject;
    files: ProjectFile[];
    model: ProjectRead;
    readAt: string;
}

const DEFAULT_DEBOUNCE_MS = 200;

function sameFile(left: ProjectFile | undefined, right: ProjectFile | undefined): boolean {
    if (left === undefined || right === undefined) {
        return left === right;
    }
    if (left.modifiedMs !== right.modifiedMs || left.size !== right.size || left.content.state !== right.content.state) {
        return false;
    }
    return left.content.state === 'text' && right.content.state === 'text'
        ? left.content.text === right.content.text
        : JSON.stringify(left.content) === JSON.stringify(right.content);
}

function sameList(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

function allReferences(model: ProjectRead | undefined): string[] {
    return model === undefined ? [] : model.specs.map((spec) => spec.reference);
}

function sorted(values: Iterable<string>): string[] {
    return [...new Set(values)].sort();
}

function diffModels(previous: State | undefined, next: State | undefined): { references: string[]; untied: boolean } {
    const before = new Map((previous?.files ?? []).map((file) => [file.key, file]));
    const after = new Map((next?.files ?? []).map((file) => [file.key, file]));
    const changed = new Set<string>();
    for (const [key, file] of after) {
        if (!sameFile(before.get(key), file)) {
            changed.add(key);
        }
    }
    for (const key of before.keys()) {
        if (!after.has(key)) {
            changed.add(key);
        }
    }
    const references = new Set<string>();
    const tied = new Set<string>();
    const nextSpecs = new Map((next?.model.specs ?? []).map((spec) => [spec.key, spec]));
    const previousSpecs = new Map((previous?.model.specs ?? []).map((spec) => [spec.key, spec]));
    for (const spec of nextSpecs.values()) {
        const old = previousSpecs.get(spec.key);
        const related = [spec.key, ...spec.planKeys, ...spec.returnNoteKeys];
        related.forEach((key) => changed.has(key) && tied.add(key));
        if (
            related.some((key) => changed.has(key)) ||
            old === undefined ||
            !sameList(old.planKeys, spec.planKeys) ||
            !sameList(old.returnNoteKeys, spec.returnNoteKeys)
        ) {
            references.add(spec.reference);
        }
    }
    for (const spec of previousSpecs.values()) {
        const related = [spec.key, ...spec.planKeys, ...spec.returnNoteKeys];
        const touched = related.some((key) => changed.has(key));
        related.forEach((key) => changed.has(key) && tied.add(key));
        if (!nextSpecs.has(spec.key) || touched) {
            references.add(spec.reference);
        }
    }
    const untiedChange = [...changed].some((key) => !tied.has(key));
    const projectScoped = (state: State | undefined): string =>
        JSON.stringify((state?.model.diagnostics ?? []).filter((diagnostic) => diagnostic.scope === 'project'));
    return { references: sorted(references), untied: untiedChange || projectScoped(previous) !== projectScoped(next) };
}

export function createSpecRepository(options: SpecRepositoryOptions): SpecRepository {
    const listeners = new Set<(change: SpecChange) => void>();
    const pendingEvents = new Set<string>();
    let state: State | undefined;
    let watcher: Disposable | undefined;
    let generation = 0;
    let tail: Promise<void> = Promise.resolve();
    let disposed = false;

    function publish(change: SpecChange): void {
        for (const listener of [...listeners]) {
            try {
                listener(change);
            } catch {
                continue;
            }
        }
    }

    function serial(task: () => Promise<void>): Promise<void> {
        const run = tail.then(task, task);
        tail = run.catch(() => undefined);
        return run;
    }

    async function read(project: RepositoryProject, previous: State | undefined, forced: ReadonlySet<string>): Promise<State> {
        const cached = new Map((previous?.files ?? []).map((file) => [file.key, file]));
        const lowered = options.caseInsensitiveEvents === true;
        const forcedKeys = new Set<string>();
        if (forced.size > 0) {
            const wanted = new Set([...forced].map((event) => (lowered ? event.toLowerCase() : event)));
            for (const key of cached.keys()) {
                if (wanted.has(lowered ? key.toLowerCase() : key)) {
                    forcedKeys.add(key);
                }
            }
        }
        const files = await readProjectFiles(options.source, project.root, (key, stats) => {
            const known = cached.get(key);
            if (
                known === undefined ||
                stats === undefined ||
                stats.kind === 'symlink' ||
                stats.mtimeMs === undefined ||
                known.modifiedMs !== stats.mtimeMs ||
                known.size !== stats.size ||
                forcedKeys.has(key)
            ) {
                return undefined;
            }
            return known;
        });
        const model = await buildProject(options.source, project.root, project.version, files, undefined, project.setupRun);
        return { project, files: files.files, model, readAt: options.clock.now() };
    }

    function stopWatching(): void {
        watcher?.dispose();
        watcher = undefined;
        pendingEvents.clear();
    }

    const scheduler = createRerunScheduler({
        clock: options.clock,
        debounceMs: options.debounceMs ?? DEFAULT_DEBOUNCE_MS,
        run: () =>
            serial(async () => {
                const current = state;
                if (current === undefined || disposed) {
                    pendingEvents.clear();
                    return;
                }
                const forced = new Set(pendingEvents);
                pendingEvents.clear();
                const ticket = generation;
                const next = await read(current.project, current, forced);
                if (ticket !== generation || disposed) {
                    return;
                }
                state = next;
                const { references, untied } = diffModels(current, next);
                if (references.length > 0 || untied) {
                    publish({ references, untied, cause: 'files' });
                }
            }),
    });

    return {
        open(project) {
            return serial(async () => {
                if (disposed) {
                    return;
                }
                generation++;
                const ticket = generation;
                stopWatching();
                const previous = state;
                if (project === undefined) {
                    state = undefined;
                    publish({ references: sorted(allReferences(previous?.model)), untied: true, cause: 'project' });
                    return;
                }
                watcher = options.watch.watch(project.root, (relativePath) => {
                    pendingEvents.add(relativePath);
                    scheduler.trigger();
                });
                const next = await read(project, undefined, new Set());
                if (ticket !== generation || disposed) {
                    return;
                }
                state = next;
                const sameRoot = previous?.project.root === project.root;
                const { references, untied } = diffModels(sameRoot ? previous : undefined, next);
                publish({
                    references: sameRoot ? references : sorted([...allReferences(previous?.model), ...allReferences(next.model)]),
                    untied: sameRoot ? untied : true,
                    cause: 'project',
                });
            });
        },
        rescan() {
            return serial(async () => {
                const current = state;
                if (current === undefined || disposed) {
                    return;
                }
                const ticket = generation;
                const next = await read(current.project, undefined, new Set());
                if (ticket !== generation || disposed) {
                    return;
                }
                state = next;
                const { references, untied } = diffModels(current, next);
                publish({ references, untied, cause: 'rescan' });
            });
        },
        snapshot: () => state?.model,
        readAt: () => state?.readAt,
        onDidChange(listener) {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
        async whenIdle() {
            await scheduler.whenIdle();
            await tail;
        },
        dispose() {
            disposed = true;
            generation++;
            stopWatching();
            scheduler.dispose();
            listeners.clear();
        },
    };
}
