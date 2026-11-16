import type { DiscoveredFolder } from '../../discovery/discoverWorkspace';
import type { DiscoveryController } from '../../discovery/discoveryController';
import type { HistoryView } from '../../lifecycle/statusHistory';
import type { ClockPort, Disposable } from '../../ports/host';
import type { ShellModel } from '../../ports/shell';
import { createFakeSource, type FakeSource } from '../../board/testing/boardWorld';
import { createMissionControlService, type MissionControlService } from '../missionControlService';
import { createFakeSession, createScriptedStore, type FakeSession, type ScriptedStore } from './runtimeWorld';
import type { MissionControlView } from '../../../shared/protocol/missionControl';

export interface FakeHistory {
    view: HistoryView;
    reads: number;
    fire(): void;
    port: { read(): Promise<HistoryView>; onDidChange(listener: () => void): Disposable };
}

export function createHistory(): FakeHistory {
    const listeners = new Set<() => void>();
    const fake: FakeHistory = {
        view: { available: true, label: 'Observed', entries: [] },
        reads: 0,
        fire: () => [...listeners].forEach((listener) => listener()),
        port: {
            async read() {
                fake.reads += 1;
                return fake.view;
            },
            onDidChange(listener): Disposable {
                listeners.add(listener);
                return { dispose: () => void listeners.delete(listener) };
            },
        },
    };
    return fake;
}

export interface FakeDiscovery {
    port: Pick<DiscoveryController, 'snapshot' | 'onDidUpdate'>;
    setActive(active: { name: string; version: string } | undefined): void;
    update(): void;
}

export function createDiscovery(): FakeDiscovery {
    let active: { name: string; version: string } | undefined = { name: 'demo', version: '1.10.0' };
    const listeners = new Set<() => void>();
    return {
        port: {
            snapshot: () => ({
                result: undefined,
                active:
                    active === undefined
                        ? undefined
                        : ({ root: 'memory://lifecycle', name: active.name, version: active.version, verdict: 'project', legacy: false, missingMarkers: [], diagnostics: [], readError: undefined } satisfies DiscoveredFolder),
                remembered: undefined,
                failure: undefined,
            }),
            onDidUpdate(listener): Disposable {
                listeners.add(listener);
                return { dispose: () => void listeners.delete(listener) };
            },
        },
        setActive(next) {
            active = next;
        },
        update: () => [...listeners].forEach((listener) => listener()),
    };
}

export interface FakeClock extends ClockPort {
    set(value: string): void;
}

export function createClock(start = '2026-11-16T10:00:00.000Z'): FakeClock {
    let now = start;
    return {
        now: () => now,
        setTimeout: () => ({ dispose: () => undefined }),
        set(value) {
            now = value;
        },
    };
}

export interface ServiceWorld {
    source: FakeSource;
    store: ScriptedStore;
    session: FakeSession;
    history: FakeHistory;
    discovery: FakeDiscovery;
    clock: FakeClock;
    service: MissionControlService;
    views: MissionControlView[];
    listen(): Disposable;
}

export function createServiceWorld(model: ShellModel | undefined): ServiceWorld {
    const source = createFakeSource(model);
    const store = createScriptedStore();
    const session = createFakeSession(store.store);
    const history = createHistory();
    const discovery = createDiscovery();
    const clock = createClock();
    const service = createMissionControlService({ source, discovery: discovery.port, session, history: history.port, clock });
    const views: MissionControlView[] = [];
    return {
        source,
        store,
        session,
        history,
        discovery,
        clock,
        service,
        views,
        listen: () =>
            service.onDidChangeView((view) => {
                if (view !== undefined) {
                    views.push(view);
                }
            }),
    };
}
