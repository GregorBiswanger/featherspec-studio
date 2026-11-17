import type { MissionControlView } from '../../shared/protocol/missionControl';
import type { DiscoveryController } from '../discovery/discoveryController';
import type { HistoryView } from '../lifecycle/statusHistory';
import type { Disposable } from '../ports/host';
import type { ShellModelSource } from '../ports/shell';
import { buildMissionControlView } from './missionControlView';

export interface MissionControlServiceDeps {
    source: ShellModelSource;
    discovery: Pick<DiscoveryController, 'snapshot' | 'onDidUpdate'>;
    history: { read(): Promise<HistoryView>; onDidChange(listener: () => void): Disposable };
}

export interface MissionControlService {
    view(): MissionControlView | undefined;
    onDidChangeView(listener: (view: MissionControlView | undefined) => void): Disposable;
    whenIdle(): Promise<void>;
    dispose(): void;
}

const HISTORY_FAILED: HistoryView = { available: false, text: 'Status history not available' };

export function createMissionControlService(deps: MissionControlServiceDeps): MissionControlService {
    const listeners = new Set<(view: MissionControlView | undefined) => void>();
    let subscriptions: Disposable[] = [];
    let current: MissionControlView | undefined;
    let last = 'undefined';
    let running = false;
    let again = false;
    let idle: Promise<void> = Promise.resolve();
    let disposed = false;

    function setView(next: MissionControlView | undefined): void {
        const serialized = JSON.stringify(next);
        current = next;
        if (serialized === last) {
            return;
        }
        last = serialized;
        [...listeners].forEach((listener) => {
            try {
                listener(next);
            } catch {
                return;
            }
        });
    }

    async function readHistory(): Promise<HistoryView> {
        try {
            return await deps.history.read();
        } catch {
            return HISTORY_FAILED;
        }
    }

    async function refresh(): Promise<void> {
        const model = deps.source.current();
        const active = deps.discovery.snapshot().active;
        if (model === undefined || active === undefined) {
            setView(undefined);
            return;
        }
        const history = await readHistory();
        if (disposed || listeners.size === 0) {
            return;
        }
        setView(buildMissionControlView({ model, active: { name: active.name, version: active.version }, updatedAt: deps.source.updatedAt(), history }));
    }

    function schedule(): void {
        if (disposed || listeners.size === 0) {
            return;
        }
        if (running) {
            again = true;
            return;
        }
        running = true;
        idle = (async () => {
            try {
                do {
                    again = false;
                    try {
                        await refresh();
                    } catch {
                        setView(undefined);
                    }
                } while (again && !disposed && listeners.size > 0);
            } finally {
                running = false;
            }
        })();
    }

    function listen(): void {
        subscriptions = [
            deps.source.onDidChange(schedule),
            deps.history.onDidChange(schedule),
            deps.discovery.onDidUpdate(schedule),
        ];
    }

    function release(): void {
        subscriptions.forEach((subscription) => subscription.dispose());
        subscriptions = [];
        current = undefined;
        last = 'undefined';
    }

    return {
        view: () => current,
        onDidChangeView(listener) {
            listeners.add(listener);
            if (listeners.size === 1) {
                listen();
                schedule();
            }
            return {
                dispose() {
                    listeners.delete(listener);
                    if (listeners.size === 0) {
                        release();
                    }
                },
            };
        },
        async whenIdle() {
            while (running) {
                await idle;
            }
        },
        dispose() {
            disposed = true;
            listeners.clear();
            release();
        },
    };
}
