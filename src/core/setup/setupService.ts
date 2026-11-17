import type { DiscoveredFolder, DiscoveryResult } from '../discovery/discoverWorkspace';
import type { ClockPort, OutputPort, WorkspaceFoldersPort } from '../ports/host';
import type { ReleaseArchivePort } from '../ports/releaseArchive';
import type { ReleaseHttpPort } from '../ports/releaseHttp';
import type { SetupTargetPort } from '../ports/setupTarget';
import type { SetupUiPort } from '../ports/setupUi';
import type { TrustPort } from '../ports/shell';
import { ACTION_LABELS } from '../../shared/protocol/texts';
import { applySetup, type SetupOutcome } from './applySetup';
import { classifyFiles, type FileClass } from './fileClasses';
import { checkRelease, type ReleaseFile } from './releaseArchive';
import { downloadLatestRelease } from './releaseDownload';
import { reportRun } from './setupReport';
import { buildMergePrompt, gatherParkedFiles } from './mergePrompt';
import { ARCHIVE_REFUSAL, confirmDetail, confirmTitle, FINISH_TEXTS, SETUP_TEXTS } from './setupTexts';

export interface SetupDiscoveryPort {
    snapshot(): { result: DiscoveryResult | undefined };
    refresh(): Promise<void>;
}

export interface SetupHostActions {
    manageTrust(): Promise<void>;
    showOutput(): void;
    openSetupGuide(): Promise<void>;
}

export interface SetupServiceDeps {
    trust: TrustPort;
    folders: WorkspaceFoldersPort;
    discovery: SetupDiscoveryPort;
    http: ReleaseHttpPort;
    archive: ReleaseArchivePort;
    target: SetupTargetPort;
    ui: SetupUiPort;
    clock: ClockPort;
    output: OutputPort;
    actions: SetupHostActions;
    studioVersion: string;
}

export interface SetupTargetFolder {
    root: string;
    name: string;
    path: string;
}

export interface SetupRelease {
    tag: string;
    version: string;
    files: readonly ReleaseFile[];
}

export type RunResult =
    | { kind: 'no-target' }
    | { kind: 'cancelled'; target: SetupTargetFolder }
    | { kind: 'download-failed'; target: SetupTargetFolder; reason: string }
    | { kind: 'archive-refused'; target: SetupTargetFolder; tag: string | undefined; reason: string }
    | { kind: 'declined'; target: SetupTargetFolder; release: SetupRelease; classes: readonly FileClass[] }
    | { kind: 'applied'; target: SetupTargetFolder; release: SetupRelease; classes: readonly FileClass[]; outcome: SetupOutcome };

export interface SetupService {
    start(request?: { root: string }): Promise<void>;
    copyMergePrompt(): Promise<void>;
    isRunning(): boolean;
    whenIdle(): Promise<void>;
}

export interface NoticeSink {
    show(message: string, actions: readonly string[], onChoice?: (choice: string) => Promise<void> | void): void;
}

function eligible(folder: DiscoveredFolder): boolean {
    if (!folder.root.startsWith('file:')) {
        return false;
    }
    return folder.verdict === 'incomplete' || (folder.verdict === 'not-a-project' && folder.readError === undefined);
}

function verdictText(folder: DiscoveredFolder): string {
    if (folder.setupPending === true) {
        return SETUP_TEXTS.verdict.setupPending;
    }
    return folder.verdict === 'incomplete' ? SETUP_TEXTS.verdict.incomplete : SETUP_TEXTS.verdict.notAProject;
}

function targetOf(folder: DiscoveredFolder): SetupTargetFolder {
    return { root: folder.root, name: folder.name, path: folder.displayPath ?? folder.root };
}

export function createSetupService(deps: SetupServiceDeps): SetupService {
    let running = false;
    const pending = new Set<Promise<void>>();

    const notices: NoticeSink = {
        show(message, actions, onChoice) {
            const handled = deps.ui
                .notify(message, actions)
                .then(async (choice) => {
                    if (choice !== undefined && onChoice !== undefined) {
                        await onChoice(choice);
                    }
                })
                .catch(() => undefined);
            pending.add(handled);
            void handled.then(() => pending.delete(handled));
        },
    };

    async function discoverTarget(request: { root: string } | undefined): Promise<SetupTargetFolder | undefined> {
        if (!deps.trust.isTrusted()) {
            notices.show(SETUP_TEXTS.trustRequired, [ACTION_LABELS.manageTrust], async (choice) => {
                if (choice === ACTION_LABELS.manageTrust) {
                    await deps.actions.manageTrust();
                }
            });
            return undefined;
        }
        let result = deps.discovery.snapshot().result;
        if (result === undefined) {
            await deps.discovery.refresh();
            result = deps.discovery.snapshot().result;
        }
        const folders = result?.folders ?? [];
        const candidates = folders.filter(eligible);
        const same = request === undefined ? undefined : candidates.find((folder) => folder.root === request.root);
        if (same !== undefined) {
            return targetOf(same);
        }
        if (candidates.length === 0) {
            refuseWithoutTarget(folders, deps.folders.list().length);
            return undefined;
        }
        if (candidates.length === 1 && request === undefined) {
            return targetOf(candidates[0] as DiscoveredFolder);
        }
        const root = await deps.ui.pickTarget(
            candidates.map((folder) => ({ label: folder.name, description: verdictText(folder), detail: folder.displayPath ?? folder.root, root: folder.root })),
            SETUP_TEXTS.pickPlaceholder,
        );
        const picked = candidates.find((folder) => folder.root === root);
        return picked === undefined ? undefined : targetOf(picked);
    }

    function refuseWithoutTarget(folders: readonly DiscoveredFolder[], folderCount: number): void {
        if (folderCount === 0) {
            notices.show(SETUP_TEXTS.noFolder, []);
        } else if (folders.length > 0 && folders.every((folder) => folder.verdict === 'project')) {
            notices.show(SETUP_TEXTS.everyFolderIsProject, []);
        } else {
            notices.show(SETUP_TEXTS.noEligibleFolder, [ACTION_LABELS.showOutput], (choice) => {
                if (choice === ACTION_LABELS.showOutput) {
                    deps.actions.showOutput();
                }
            });
        }
    }

    async function run(request: { root: string } | undefined): Promise<RunResult> {
        const target = await discoverTarget(request);
        if (target === undefined) {
            return { kind: 'no-target' };
        }
        const download = await deps.ui.withProgress(SETUP_TEXTS.downloading, (signal) =>
            downloadLatestRelease({ http: deps.http, clock: deps.clock, studioVersion: deps.studioVersion }, signal),
        );
        if (!download.ok) {
            if (download.kind === 'cancelled') {
                return { kind: 'cancelled', target };
            }
            if (download.kind === 'too-large') {
                return { kind: 'archive-refused', target, tag: undefined, reason: ARCHIVE_REFUSAL.tooLarge };
            }
            return { kind: 'download-failed', target, reason: download.reason };
        }
        const checked = await checkRelease(deps.archive, download.bytes);
        if (!checked.ok) {
            return { kind: 'archive-refused', target, tag: download.tag, reason: checked.reason };
        }
        const release: SetupRelease = { tag: download.tag, version: checked.version, files: checked.files };
        const classes = await classifyFiles(deps.target, target.root, release.files);
        const count = (kind: FileClass['kind']) => classes.filter((entry) => entry.kind === kind).length;
        const confirmed = await deps.ui.confirm({
            message: confirmTitle(release.version, target.name),
            detail: confirmDetail(target.path, count('missing'), count('completed'), count('kept')),
            confirmLabel: SETUP_TEXTS.confirmLabel,
        });
        if (!confirmed) {
            return { kind: 'declined', target, release, classes };
        }
        const outcome = await applySetup(deps.target, target.root, classes);
        return { kind: 'applied', target, release, classes, outcome };
    }

    const service: SetupService = {
        async copyMergePrompt() {
            let result = deps.discovery.snapshot().result;
            if (result === undefined) {
                await deps.discovery.refresh();
                result = deps.discovery.snapshot().result;
            }
            const pending = (result?.folders ?? []).filter((folder) => folder.setupPending === true && folder.root.startsWith('file:'));
            if (pending.length === 0) {
                notices.show(FINISH_TEXTS.noPendingFolder, []);
                return;
            }
            let chosen: DiscoveredFolder | undefined = pending[0];
            if (pending.length > 1) {
                const root = await deps.ui.pickTarget(
                    pending.map((folder) => ({ label: folder.name, description: verdictText(folder), detail: folder.displayPath ?? folder.root, root: folder.root })),
                    FINISH_TEXTS.pickMergePlaceholder,
                );
                chosen = pending.find((folder) => folder.root === root);
            }
            if (chosen === undefined) {
                return;
            }
            const folder = targetOf(chosen);
            const files = await gatherParkedFiles(deps.target, folder.root);
            if (files.length === 0) {
                notices.show(FINISH_TEXTS.nothingToMerge(folder.name), []);
                return;
            }
            await deps.ui.copy(buildMergePrompt(folder.path, files));
            notices.show(FINISH_TEXTS.mergeCopied, []);
        },
        isRunning: () => running,
        async whenIdle() {
            while (pending.size > 0) {
                await Promise.all([...pending]);
            }
        },
        async start(request) {
            if (running) {
                notices.show(SETUP_TEXTS.alreadyRunning, []);
                return;
            }
            running = true;
            const finished = (async () => {
                try {
                    const result = await run(request);
                    await reportRun(deps, notices, result, (root) => finished.then(() => service.start({ root })));
                } finally {
                    running = false;
                }
            })();
            await finished;
        },
    };
    return service;
}
