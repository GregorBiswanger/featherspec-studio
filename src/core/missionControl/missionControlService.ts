import type { MissionControlView } from '../../shared/protocol/missionControl';
import type { DiscoveryController } from '../discovery/discoveryController';
import type { HistoryView } from '../lifecycle/statusHistory';
import type { ClockPort, Disposable } from '../ports/host';
import type { ShellModel, ShellModelSource } from '../ports/shell';
import { projectActivity } from './activity';
import { projectAttention } from './attention';
import { projectRuns } from './runFigures';
import { createRunSource, type RunSourceSession } from './runSource';
import { projectHeader, projectSpecFigures } from './specFigures';
import { createSpecResolver } from './specRefs';

export interface MissionControlServiceDeps {
    source: ShellModelSource;
    discovery: Pick<DiscoveryController, 'snapshot' | 'onDidUpdate'>;
    session: RunSourceSession;
    history: { read(): Promise<HistoryView>; onDidChange(listener: () => void): Disposable };
    clock: ClockPort;
}

export interface MissionControlService {
    view(): MissionControlView | undefined;
    onDidChangeView(listener: (view: MissionControlView | undefined) => void): Disposable;
    whenIdle(): Promise<void>;
    dispose(): void;
}

const HISTORY_FAILED: HistoryView = { available: false, text: 'Status history not available' };

export function createMissionControlService(deps: MissionControlServiceDeps): MissionControlService {
    const runSource = createRunSource({ session: deps.session });
    const listeners = new Set<(view: MissionControlView | undefined) => void>();
    let subscriptions: Disposable[] = [];
    let current: MissionControlView | undefined;
    let last = 'undefined';
    let lastModel: ShellModel | undefined;
    let updatedAt = '';
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
            lastModel = undefined;
            setView(undefined);
            return;
        }
        if (model !== lastModel) {
            lastModel = model;
            updatedAt = deps.clock.now();
        }
        const [runs, history] = await Promise.all([runSource.read(), readHistory()]);
        if (disposed || listeners.size === 0) {
            return;
        }
        const specs = createSpecResolver(model);
        const facts = projectRuns(runs, model, (stem) => specs.forStem(stem));
        setView({
            header: projectHeader({ name: active.name, version: active.version }, model, updatedAt),
            specs: projectSpecFigures(model),
            runs: facts.view,
            attention: projectAttention(model, facts, specs),
            activity: projectActivity(history, runs, specs),
        });
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
            runSource.onDidChange(schedule),
        ];
    }

    function release(): void {
        subscriptions.forEach((subscription) => subscription.dispose());
        subscriptions = [];
        current = undefined;
        last = 'undefined';
        lastModel = undefined;
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
            runSource.dispose();
        },
    };
}
