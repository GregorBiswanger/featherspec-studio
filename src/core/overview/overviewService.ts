import type { OverviewView } from '../../shared/protocol/overview';
import type { DiscoveryController } from '../discovery/discoveryController';
import type { HistoryView } from '../lifecycle/statusHistory';
import type { Disposable } from '../ports/host';
import type { RequestHandlers } from '../shell/messageRouter';
import type { OverviewRequestType } from '../../shared/protocol/messages';
import type { ShellModelSource } from '../ports/shell';
import { buildOverviewView } from './overviewView';
import { historyUnavailableText } from '../lifecycle/historyTexts';

export interface OverviewServiceDeps {
    source: ShellModelSource;
    discovery: Pick<DiscoveryController, 'snapshot' | 'onDidUpdate'>;
    history: { read(): Promise<HistoryView>; onDidChange(listener: () => void): Disposable };
}

export interface OverviewService {
    view(): OverviewView | undefined;
    onDidChangeView(listener: (view: OverviewView | undefined) => void): Disposable;
    setActivityOpen(open: boolean): void;
    handlers: Pick<RequestHandlers, OverviewRequestType>;
    whenIdle(): Promise<void>;
    dispose(): void;
}

const HISTORY_FAILED: HistoryView = { available: false, text: historyUnavailableText() };

export function createOverviewService(deps: OverviewServiceDeps): OverviewService {
    const listeners = new Set<(view: OverviewView | undefined) => void>();
    let subscriptions: Disposable[] = [];
    let current: OverviewView | undefined;
    let last = 'undefined';
    let running = false;
    let again = false;
    let idle: Promise<void> = Promise.resolve();
    let disposed = false;
    let activityOpen = false;

    function setView(next: OverviewView | undefined): void {
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
        setView(buildOverviewView({ model, history, activityOpen }));
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

    function setActivityOpen(open: boolean): void {
        if (listeners.size === 0 || activityOpen === open) {
            return;
        }
        activityOpen = open;
        schedule();
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
        activityOpen = false;
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
        setActivityOpen,
        handlers: {
            overviewSetActivity: async (payload) => setActivityOpen(payload.open),
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
