import type { DiscoveredFolder } from '../../discovery/discoverWorkspace';
import type { DiscoveryController } from '../../discovery/discoveryController';
import type { HistoryView } from '../../lifecycle/statusHistory';
import type { Disposable } from '../../ports/host';
import type { ShellModel } from '../../ports/shell';
import { createFakeSource, type FakeSource } from '../../board/testing/boardWorld';
import { createFakeTips, type FakeTips } from '../../settings/testing/fakeTips';
import { createOverviewService, type OverviewService } from '../overviewService';
import type { OverviewView } from '../../../shared/protocol/overview';

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

export interface ServiceWorld {
    source: FakeSource;
    history: FakeHistory;
    discovery: FakeDiscovery;
    tips: FakeTips;
    service: OverviewService;
    views: OverviewView[];
    listen(): Disposable;
}

export function createServiceWorld(model: ShellModel | undefined, tips: FakeTips = createFakeTips()): ServiceWorld {
    const source = createFakeSource(model);
    const history = createHistory();
    const discovery = createDiscovery();
    const service = createOverviewService({ source, discovery: discovery.port, history: history.port, tips });
    const views: OverviewView[] = [];
    return {
        source,
        history,
        discovery,
        tips,
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
