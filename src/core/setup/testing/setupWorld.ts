import type { DiscoveredFolder } from '../../discovery/discoverWorkspace';
import type { OutputPort, WorkspaceFolderInfo } from '../../ports/host';
import type { SetupConfirmation, SetupPickItem, SetupUiPort } from '../../ports/setupUi';
import type { TrustPort } from '../../ports/shell';
import { archiveUrl } from '../releaseDownload';
import { createSetupService, type SetupService } from '../setupService';
import { createTarGzArchive } from '../../../adapters/node/tarGzArchive';
import { createMemoryTarget, type MemoryTarget } from './memoryTarget';
import { realReleaseBytes } from './realRelease';
import { reply, scriptedHttp, type ScriptedHttp } from './scriptedHttp';
import { createSetupClock, type SetupClock } from './setupClock';

export const TAG_URL = 'https://github.com/GregorBiswanger/featherspec/releases/tag/v1.10.0';
export const CODELOAD = 'https://codeload.github.com/GregorBiswanger/featherspec/tar.gz/refs/tags/v1.10.0';
export const LATEST = 'https://github.com/GregorBiswanger/featherspec/releases/latest';

export interface FakeSetupUi extends SetupUiPort {
    picks: { items: readonly SetupPickItem[]; placeholder: string }[];
    confirmations: SetupConfirmation[];
    progressTitles: string[];
    notices: { message: string; actions: readonly string[] }[];
    copied: string[];
    pickAnswer: (items: readonly SetupPickItem[]) => string | undefined;
    confirmAnswer: boolean | (() => boolean | Promise<boolean>);
    noticeAnswer: (message: string, actions: readonly string[]) => string | undefined;
    cancelProgress(): void;
    onProgress: (() => void) | undefined;
}

export interface FakeDiscovery {
    folders: DiscoveredFolder[];
    refreshes: number;
    onRefresh: (() => void) | undefined;
    snapshot(): { result: { folders: DiscoveredFolder[] } | undefined };
    refresh(): Promise<void>;
    hide(): void;
}

export interface SetupWorld {
    service: SetupService;
    ui: FakeSetupUi;
    http: ScriptedHttp;
    target: MemoryTarget;
    clock: SetupClock;
    output: OutputPort & { blocks: string[][] };
    actions: { calls: string[] };
    trust: TrustPort & { trusted: boolean };
    discovery: FakeDiscovery;
    workspaceFolders: WorkspaceFolderInfo[];
}

export function folderAt(name: string, verdict: DiscoveredFolder['verdict'], extra: Partial<DiscoveredFolder> = {}): DiscoveredFolder {
    return {
        root: `file:///w/${name}`,
        name,
        verdict,
        legacy: false,
        version: 'unknown',
        missingMarkers: [],
        diagnostics: [],
        readError: undefined,
        ...extra,
    };
}

export interface SetupWorldOptions {
    folders?: DiscoveredFolder[];
    trusted?: boolean;
    releaseBytes?: Uint8Array;
    routes?: Parameters<typeof scriptedHttp>[0];
}

export function createSetupWorld(options: SetupWorldOptions = {}): SetupWorld {
    const folders = options.folders ?? [folderAt('plain', 'not-a-project')];
    const release = options.releaseBytes ?? realReleaseBytes();
    const http = scriptedHttp(
        options.routes ?? {
            [LATEST]: reply(302, { location: TAG_URL }),
            [archiveUrl('v1.10.0')]: reply(302, { location: CODELOAD }),
            [CODELOAD]: reply(200, {}, [release]),
        },
    );
    const target = createMemoryTarget();
    const clock = createSetupClock();
    const output: SetupWorld['output'] = {
        blocks: [],
        appendBlock(lines) {
            output.blocks.push([...lines]);
        },
    };
    const actions = { calls: [] as string[] };
    const trust: SetupWorld['trust'] = { trusted: options.trusted ?? true, isTrusted: () => trust.trusted, onDidGrant: () => ({ dispose: () => undefined }) };
    const discovery: FakeDiscovery = {
        folders,
        refreshes: 0,
        onRefresh: undefined,
        snapshot: () => ({ result: hidden ? undefined : { folders: discovery.folders } }),
        async refresh() {
            discovery.refreshes += 1;
            hidden = false;
            discovery.onRefresh?.();
        },
        hide() {
            hidden = true;
        },
    };
    let hidden = false;
    let progress: AbortController | undefined;
    const ui: FakeSetupUi = {
        picks: [],
        confirmations: [],
        progressTitles: [],
        notices: [],
        copied: [],
        pickAnswer: (items) => items[0]?.root,
        confirmAnswer: true,
        noticeAnswer: () => undefined,
        onProgress: undefined,
        cancelProgress: () => progress?.abort(),
        async pickTarget(items, placeholder) {
            ui.picks.push({ items, placeholder });
            return ui.pickAnswer(items);
        },
        async confirm(model) {
            ui.confirmations.push(model);
            return typeof ui.confirmAnswer === 'function' ? ui.confirmAnswer() : ui.confirmAnswer;
        },
        async withProgress(title, task) {
            ui.progressTitles.push(title);
            progress = new AbortController();
            ui.onProgress?.();
            return task(progress.signal);
        },
        async notify(message, notifyActions) {
            ui.notices.push({ message, actions: notifyActions });
            return ui.noticeAnswer(message, notifyActions);
        },
        async copy(text) {
            ui.copied.push(text);
        },
    };
    const workspaceFolders = folders.map((folder) => ({ root: folder.root, name: folder.name }));
    const service = createSetupService({
        trust,
        folders: { list: () => workspaceFolders, onDidChange: () => ({ dispose: () => undefined }) },
        discovery,
        http,
        archive: createTarGzArchive(),
        target,
        ui,
        clock,
        output,
        actions: {
            async manageTrust() {
                actions.calls.push('manageTrust');
            },
            showOutput() {
                actions.calls.push('showOutput');
            },
            async openSetupGuide() {
                actions.calls.push('openSetupGuide');
            },
        },
        studioVersion: '0.1.0',
    });
    return { service, ui, http, target, clock, output, actions, trust, discovery, workspaceFolders };
}
