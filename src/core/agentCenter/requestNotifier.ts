import { AC_OPEN_IN_AGENT_CENTER, acApprovalNotification, acInputNotification } from '../../shared/protocol/agentCenterTexts';
import type { AgentCenterStore, AgentCenterUiPort } from '../ports/agentCenter';
import type { Disposable } from '../ports/host';
import type { ShellModelSource, TrustPort } from '../ports/shell';
import type { AgentCenterSession } from './agentCenterService';
import { specRefOf } from './runList';

export interface RequestNotifierDeps {
    session: AgentCenterSession;
    model: ShellModelSource;
    ui: Pick<AgentCenterUiPort, 'notify'>;
    trust: Pick<TrustPort, 'isTrusted'>;
    shownAndFocused(runId: string): boolean;
    open(runId: string): void;
}

export function createRequestNotifier(deps: RequestNotifierDeps): Disposable {
    let followed: AgentCenterStore | undefined;
    let subscription: Disposable | undefined;
    const seen = new Set<string>();
    let disposed = false;

    async function onEvent(store: AgentCenterStore, runId: string, seq: number, type: string): Promise<void> {
        if (type !== 'approval.requested' && type !== 'input.requested') {
            return;
        }
        const key = `${runId}:${seq}`;
        if (seen.has(key) || deps.session.state().kind !== 'writable' || !deps.trust.isTrusted() || deps.shownAndFocused(runId)) {
            return;
        }
        seen.add(key);
        const found = await store.getRun(runId);
        if (disposed || !found.available || found.value === undefined) {
            return;
        }
        const spec = specRefOf(found.value, deps.model.current());
        const label = spec.found ? spec.number : spec.stem;
        const accepted = await deps.ui.notify(type === 'approval.requested' ? acApprovalNotification(label) : acInputNotification(label), AC_OPEN_IN_AGENT_CENTER);
        if (accepted && !disposed) {
            deps.open(runId);
        }
    }

    function attach(): void {
        const store = deps.session.current();
        if (store === followed && subscription !== undefined) {
            return;
        }
        subscription?.dispose();
        subscription = undefined;
        followed = store;
        if (store?.onDidStoreEvent !== undefined) {
            subscription = store.onDidStoreEvent((event) => void onEvent(store, event.runId, event.seq, event.type));
        }
    }

    attach();
    const stateSubscription = deps.session.onDidChangeState(attach);
    return {
        dispose() {
            disposed = true;
            subscription?.dispose();
            stateSubscription.dispose();
        },
    };
}
