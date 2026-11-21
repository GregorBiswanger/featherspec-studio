import { composeStudio, type HostPorts, type PanelPort } from '../compose';
import { stepView, nextStep } from '../../core/board/nextStep';
import { stepTips } from '../../core/board/stepTips';
import { createFakeAssistantHost } from '../../core/assistant/testing/fakeAssistantHost';
import { createFakeHost, createFakeState } from '../../core/discovery/testing/fakeHost';
import { createMemoryFileSystem, type MemoryFileSystem } from '../../core/discovery/testing/memoryFileSystem';
import { deriveLifecycle } from '../../core/lifecycle/deriveLifecycle';
import type { ShellModel } from '../../core/ports/shell';
import type { ReleaseArchivePort } from '../../core/ports/releaseArchive';
import { openRuntimeStore } from '../../core/runtime/runtimeStore';
import { createFakeNotices, createFakeRuntimeClock, createSequentialIds } from '../../core/runtime/testing/fakes';
import { createMemoryBacking, createMemoryMedium } from '../../core/runtime/testing/memoryMedium';
import { parseStepTipSettings } from '../../core/settings/stepTipSettings';
import { applySetup } from '../../core/setup/applySetup';
import { classifyFiles } from '../../core/setup/fileClasses';
import { buildMergePrompt } from '../../core/setup/mergePrompt';
import { checkRelease } from '../../core/setup/releaseArchive';
import { createMemoryTarget } from '../../core/setup/testing/memoryTarget';
import { scriptedHttp } from '../../core/setup/testing/scriptedHttp';
import { createFakeFileWatch } from '../../core/specs/testing/fakeFileWatch';
import { createMemorySpecSource, type MemorySpecSource } from '../../core/specs/testing/memorySpecSource';
import { readProject } from '../../core/specs/readProject';
import { readSnapshot } from '../../core/specs/testing/readSnapshot';
import { fromBase64, isRecord } from './bridge';

export interface ConformanceInput {
    files: Record<string, string>;
    version: string;
}

const ROOT = 'memory://fixture';
const TARGET = 'memory://tip-splitter';
const FIXED_NOW = '2026-11-20T00:00:00.000Z';
const DEFAULT_SETTINGS = parseStepTipSettings(undefined, undefined);

export function parseConformanceInput(json: string): ConformanceInput {
    const value: unknown = JSON.parse(json);
    if (!isRecord(value) || typeof value.version !== 'string' || !isBase64Map(value.files)) {
        throw new Error('The conformance input needs files (base64 by path) and a version.');
    }
    return { files: value.files, version: value.version };
}

function isBase64Map(value: unknown): value is Record<string, string> {
    return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');
}

export async function runConformance(input: ConformanceInput): Promise<string> {
    const fileSystem = createMemoryFileSystem();
    const specSource = createMemorySpecSource();
    for (const [relativePath, base64] of Object.entries(input.files)) {
        const bytes = fromBase64(base64);
        for (const directory of directoriesOf(relativePath)) {
            fileSystem.setDirectory(ROOT, directory);
            specSource.setDirectory(ROOT, directory);
        }
        fileSystem.setFile(ROOT, relativePath, new TextDecoder().decode(bytes));
        specSource.setFile(ROOT, relativePath, bytes);
    }
    const project = await readProject(specSource, ROOT, input.version);
    const model: ShellModel = { project, lifecycle: deriveLifecycle(project) };
    const studio = composeStudio(memoryPorts(fileSystem, specSource));
    await studio.start();
    await studio.controller.whenIdle();
    await studio.repository.whenIdle();
    await studio.board.whenIdle();
    const board = studio.board.view();
    const details: Record<string, unknown> = {};
    for (const entry of model.lifecycle.entries) {
        studio.service.select({ stem: entry.stem });
        details[entry.stem] = studio.board.detail();
    }
    const result = stableJson({
        read: readSnapshot(project),
        next: nextSnapshot(model),
        board,
        overview: studio.overview.view(),
        planSpecs: board?.planSpecs ?? null,
        details,
        tree: studio.treeService.model(),
        status: studio.entry.situation(),
    });
    studio.navigation.dispose();
    studio.feed.dispose();
    studio.board.dispose();
    studio.service.dispose();
    return result;
}

export async function runSetupConformance(archiveBase64: string, archive: ReleaseArchivePort): Promise<string> {
    const check = await checkRelease(archive, fromBase64(archiveBase64));
    if (!check.ok) {
        throw new Error(check.reason);
    }
    const target = createMemoryTarget();
    const classes = await classifyFiles(target, TARGET, check.files);
    const outcome = await applySetup(target, TARGET, classes);
    return stableJson({
        mergePrompt: buildMergePrompt('/work/tip-splitter', ['.vscode/settings.json', 'AGENTS.md', 'CLAUDE.md']),
        classes: classes.map((entry) => ({ kind: entry.kind, path: entry.file.path })),
        writes: {
            outcome,
            files: target.files(TARGET).map((path) => ({ path, text: target.text(TARGET, path) })),
        },
    });
}

function directoriesOf(relativePath: string): string[] {
    const parts = relativePath.split('/');
    return parts.slice(0, -1).map((_part, index) => parts.slice(0, index + 1).join('/'));
}

function nextSnapshot(model: ShellModel): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const entry of model.lifecycle.entries) {
        const next = nextStep(model, entry.key);
        result[entry.key] = {
            state: entry.state,
            rule: entry.rule,
            persistence: entry.persistence,
            nextStep: plain(next),
            stepView: plain(stepView(model, entry.key)),
            tips: next !== undefined && 'case' in next ? plain(stepTips(next.case, DEFAULT_SETTINGS, undefined, { version: model.project.version, ...(next.reason === undefined ? {} : { reason: next.reason }) })) : null,
        };
    }
    return result;
}

function plain(value: unknown): unknown {
    return value === undefined ? null : JSON.parse(JSON.stringify(value));
}

function memoryPorts(fileSystem: MemoryFileSystem, specSource: MemorySpecSource): HostPorts<PanelPort> {
    const host = createFakeHost([{ root: ROOT, name: ROOT }], createFakeState());
    const notStubbed = (): Promise<never> => Promise.reject(new Error('not used by the conformance run'));
    return {
        platform: 'linux',
        studioVersion: 'conformance',
        fileSystem,
        specSource,
        folders: host.folders,
        workspaceState: host.state,
        uiMemory: () => ({ get: () => undefined, set: async () => undefined }),
        clock: { now: () => FIXED_NOW, setTimeout: () => ({ dispose: () => undefined }) },
        ui: host.ui,
        markerWatch: host.watch,
        fileWatch: createFakeFileWatch(),
        sameRoot: (first, second) => first === second,
        output: { ...host.output, show: () => undefined },
        statusItem: { show: () => undefined, hide: () => undefined },
        openStore: (projectRoot) =>
            openRuntimeStore({
                medium: createMemoryMedium(createMemoryBacking()),
                ids: createSequentialIds(),
                clock: createFakeRuntimeClock(),
                notices: createFakeNotices(),
                projectRoot,
            }),
        trust: () => ({ isTrusted: () => true, onDidGrant: () => ({ dispose: () => undefined }) }),
        http: scriptedHttp({}),
        archive: { read: notStubbed },
        setupTarget: createMemoryTarget(),
        setupUi: { pickTarget: notStubbed, confirm: notStubbed, withProgress: notStubbed, notify: notStubbed, copy: notStubbed },
        setting: () => ({ read: () => undefined, onDidChange: () => ({ dispose: () => undefined }) }),
        assistantHost: createFakeAssistantHost(),
        clipboard: { writeText: async () => undefined },
        stepUi: { pick: async () => undefined, inform: async () => undefined, warn: () => undefined },
        editor: { open: async () => 'not-found' },
        shellActions: {
            openFolder: notStubbed,
            openSetupGuide: notStubbed,
            showOutput: () => undefined,
            manageTrust: notStubbed,
            reloadPanel: () => undefined,
            setUp: notStubbed,
            copyMergePrompt: notStubbed,
        },
        openStudio: async () => undefined,
        createPanel: () => ({ panelCount: () => 0, show: () => undefined }),
        earlierRunData: { state: { has: () => false, remove: async () => undefined } },
    };
}

function stableJson(value: unknown): string {
    return JSON.stringify(stable(value));
}

function stable(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((entry) => stable(entry));
    }
    if (typeof value === 'object' && value !== null) {
        const record = value as Record<string, unknown>;
        return Object.fromEntries(Object.keys(record).sort().map((key) => [key, stable(record[key])]));
    }
    return value;
}
