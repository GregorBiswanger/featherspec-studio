import type { PanelState, SelectedSpec, ShellView } from '../../../shared/protocol/messages';
import type { DiscoveredFolder } from '../../discovery/discoverWorkspace';
import type { DiscoveryController, DiscoverySnapshot } from '../../discovery/discoveryController';
import { createFakeSource, type FakeSource } from '../../board/testing/boardWorld';
import { createFakeHost, type FakeClock } from '../../discovery/testing/fakeHost';
import type { ShellModel } from '../../ports/shell';
import { ROOT } from '../../lifecycle/testing/projects';
import { modelFor, type SpecInput } from '../../missionControl/testing/projects';
import type { StatusEntryView } from '../../ports/copyNextStep';
import type { Disposable } from '../../ports/host';
import type { ShellService } from '../../shell/shellService';
import { createProjectLine, type ProjectLine } from '../projectLine';
import { createStatusEntry, type StatusEntry } from '../statusEntry';

export interface FakeProject {
    name: string;
    version?: string;
    root?: string;
    verdict?: DiscoveredFolder['verdict'];
}

export interface EntryWorld {
    entry: StatusEntry;
    line: ProjectLine;
    source: FakeSource;
    clock: FakeClock;
    shown: Array<StatusEntryView | 'hidden'>;
    last(): StatusEntryView | 'hidden' | undefined;
    text(): string | undefined;
    setProjects(projects: FakeProject[], active?: string): void;
    clearActive(): void;
    setModel(model: ShellModel): void;
    setSpecs(inputs: readonly SpecInput[], extraFiles?: Record<string, string>): Promise<void>;
    select(selection: { stem: string; path?: string } | undefined): void;
    setPanelState(state: PanelState | undefined): void;
    dispose(): void;
}

function folderOf(project: FakeProject): DiscoveredFolder {
    return {
        root: project.root ?? ROOT,
        name: project.name,
        verdict: project.verdict ?? 'project',
        legacy: false,
        version: project.version ?? '1.10.0',
        missingMarkers: [],
        diagnostics: [],
        readError: undefined,
    };
}

export function createEntryWorld(): EntryWorld {
    const line = createProjectLine();
    const source = createFakeSource();
    const clock = createFakeHost([]).clock;
    const shown: Array<StatusEntryView | 'hidden'> = [];
    let snapshot: DiscoverySnapshot = { result: undefined, active: undefined, remembered: undefined, failure: undefined };
    let state: PanelState | undefined;
    let selection: SelectedSpec | undefined;
    const updateListeners = new Set<() => void>();
    const viewListeners = new Set<(view: ShellView) => void>();

    const discovery: Pick<DiscoveryController, 'snapshot' | 'onDidUpdate'> = {
        snapshot: () => snapshot,
        onDidUpdate(listener): Disposable {
            updateListeners.add(listener);
            return { dispose: () => void updateListeners.delete(listener) };
        },
    };
    function view(): ShellView {
        return { state, restricted: false, projectName: snapshot.active?.name, area: 'board', target: undefined, selection, notice: undefined, rows: [] };
    }
    const shell: Pick<ShellService, 'view' | 'onDidChangeView'> = {
        view,
        onDidChangeView(listener): Disposable {
            viewListeners.add(listener);
            return { dispose: () => void viewListeners.delete(listener) };
        },
    };
    const entry = createStatusEntry({
        line,
        discovery,
        shell,
        source,
        item: {
            show: (next) => void shown.push(next),
            hide: () => void shown.push('hidden'),
        },
        clock,
        sameRoot: (first, second) => first === second,
    });
    const notifyUpdate = () => [...updateListeners].forEach((listener) => listener());
    return {
        entry,
        line,
        source,
        clock,
        shown,
        last: () => shown.at(-1),
        text() {
            const last = shown.at(-1);
            return last === undefined || last === 'hidden' ? undefined : last.text;
        },
        setProjects(projects, active) {
            const folders = projects.map(folderOf);
            const chosen = active === undefined ? undefined : folders.find((folder) => folder.name === active);
            snapshot = { result: { folders }, active: chosen, remembered: undefined, failure: undefined };
            if (chosen !== undefined) {
                line.show(`FeatherSpec: ${chosen.name} (${chosen.version})`, 'select');
            }
            notifyUpdate();
        },
        clearActive() {
            snapshot = { ...snapshot, active: undefined };
            notifyUpdate();
        },
        setModel(model) {
            source.set(model);
        },
        async setSpecs(inputs, extraFiles = {}) {
            source.set(await modelFor(inputs, extraFiles));
        },
        select(next) {
            const entryOf = source.current()?.lifecycle.entries.find((candidate) => candidate.stem === next?.stem);
            selection = next === undefined ? undefined : { ...next, number: entryOf?.number ?? next.stem.slice(0, 4) };
            const current = view();
            [...viewListeners].forEach((listener) => listener(current));
        },
        setPanelState(next) {
            state = next;
            const current = view();
            [...viewListeners].forEach((listener) => listener(current));
        },
        dispose() {
            entry.dispose();
        },
    };
}
