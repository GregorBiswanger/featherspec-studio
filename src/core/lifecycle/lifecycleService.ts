import type { ClockPort, Disposable } from '../ports/host';
import type { RuntimeSession } from '../runtime/runtimeSession';
import type { RuntimeStore } from '../runtime/runtimeStore';
import type { ProjectRead } from '../specs/readProject';
import type { SpecRepository } from '../specs/specRepository';
import { deriveLifecycle } from './deriveLifecycle';
import type { LifecycleModel, LifecycleState } from './model';
import { createStatusHistory } from './statusHistory';
import type { HistoryView, StatusHistory } from './statusHistory';
import { judgeTransition } from './transitions';
import type { TransitionVerdict } from './transitions';

export interface LifecycleServiceDeps {
    repository: Pick<SpecRepository, 'snapshot' | 'onDidChange'>;
    session: Pick<RuntimeSession, 'current' | 'state' | 'onDidChangeState'>;
    clock: ClockPort;
}

export interface LifecycleService {
    model(): LifecycleModel | undefined;
    judgeTransition(key: string, target: LifecycleState): TransitionVerdict;
    history(): Promise<HistoryView>;
    onDidChange(listener: (model: LifecycleModel | undefined) => void): Disposable;
    whenIdle(): Promise<void>;
    dispose(): void;
}

export function createLifecycleService(deps: LifecycleServiceDeps): LifecycleService {
    const { repository, session, clock } = deps;
    const listeners = new Set<(model: LifecycleModel | undefined) => void>();
    let model: LifecycleModel | undefined;
    let recorder: StatusHistory | undefined;
    let recorderStore: RuntimeStore | undefined;
    let recorderRoot: string | undefined;
    let previous: ProjectRead | undefined;
    let chain: Promise<void> = Promise.resolve();
    let disposed = false;

    async function refresh(): Promise<void> {
        if (disposed) {
            return;
        }
        const snapshot = repository.snapshot();
        const store = session.current();
        if (snapshot === undefined) {
            model = undefined;
            recorder = undefined;
            recorderStore = undefined;
            recorderRoot = undefined;
            previous = undefined;
        } else {
            if (store !== recorderStore || snapshot.root !== recorderRoot) {
                recorder = store === undefined ? undefined : createStatusHistory({ store, clock });
                recorderStore = store;
                recorderRoot = snapshot.root;
                previous = undefined;
            }
            model = deriveLifecycle(snapshot);
            try {
                await recorder?.observe(previous, snapshot, model);
            } catch {
                recorder = undefined;
            }
            previous = snapshot;
        }
        [...listeners].forEach((listener) => listener(model));
    }

    function schedule(): void {
        chain = chain.then(refresh, refresh);
    }

    const subscriptions = [repository.onDidChange(schedule), session.onDidChangeState(schedule)];
    schedule();

    return {
        model: () => model,
        judgeTransition: (key, target) => judgeTransition(model ?? { entries: [], projectDiagnostics: [] }, key, target),
        async history() {
            if (recorder === undefined) {
                return { available: false, text: `Status history not available: ${session.state().reason ?? 'no store'}` };
            }
            return recorder.read();
        },
        onDidChange(listener) {
            listeners.add(listener);
            return { dispose: () => void listeners.delete(listener) };
        },
        whenIdle: () => chain,
        dispose() {
            disposed = true;
            subscriptions.forEach((subscription) => subscription.dispose());
            listeners.clear();
        },
    };
}
