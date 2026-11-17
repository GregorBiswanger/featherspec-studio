import type { ControlsView } from '../../shared/protocol/agentCenter';
import { AC_CANCEL_BUTTON, AC_REQUEST_FAILED, acCancelConfirmation } from '../../shared/protocol/agentCenterTexts';
import type { AgentCenterOrchestrator, AgentCenterUiPort } from '../ports/agentCenter';
import { isEndStatus, type RunView } from '../runtime/model';

export interface ActionContext {
    controls: ControlsView;
    run: RunView;
    specNumber: string;
    requestIds: readonly string[];
    cancelOffered: boolean;
}

export interface ActionsDeps {
    orchestrator: AgentCenterOrchestrator;
    ui: Pick<AgentCenterUiPort, 'confirm'>;
    context(runId: string): ActionContext | undefined;
    changed(): void;
    selectRun(runId: string): void;
}

export interface RequestState {
    pending: boolean;
    refusal: string | undefined;
}

export interface Actions {
    approval(runId: string, requestId: string, decision: 'approve-once' | 'reject', reason?: string): Promise<void>;
    input(runId: string, requestId: string, text: string): Promise<void>;
    cancel(runId: string): Promise<void>;
    resume(runId: string): Promise<void>;
    requestState(runId: string, requestId: string): RequestState;
    runRefusal(runId: string): string | undefined;
    prune(runId: string, openRequestIds: readonly string[]): void;
}

function keyOf(runId: string, requestId: string): string {
    return `${runId}/${requestId}`;
}

export function createActions(deps: ActionsDeps): Actions {
    const pending = new Set<string>();
    const refusals = new Map<string, string>();
    const runRefusals = new Map<string, string>();
    const busy = new Set<string>();

    async function answer(runId: string, requestId: string, hand: () => Promise<{ kind: string; reason?: string }>): Promise<void> {
        const key = keyOf(runId, requestId);
        pending.add(key);
        refusals.delete(key);
        deps.changed();
        try {
            const result = await hand();
            if (result.kind === 'refused') {
                pending.delete(key);
                refusals.set(key, result.reason ?? AC_REQUEST_FAILED);
            }
        } catch {
            pending.delete(key);
            refusals.set(key, AC_REQUEST_FAILED);
        }
        deps.changed();
    }

    function answerable(runId: string, requestId: string): boolean {
        const context = deps.context(runId);
        return context !== undefined && context.controls.kind === 'enabled' && context.requestIds.includes(requestId) && !pending.has(keyOf(runId, requestId));
    }

    return {
        async approval(runId, requestId, decision, reason) {
            if (!answerable(runId, requestId)) {
                return;
            }
            const answerValue = decision === 'approve-once' ? { decision } : reason === undefined || reason === '' ? { decision } : { decision, reason };
            await answer(runId, requestId, () => deps.orchestrator.respondToApproval(runId, requestId, answerValue));
        },
        async input(runId, requestId, text) {
            if (text.trim() === '' || !answerable(runId, requestId)) {
                return;
            }
            await answer(runId, requestId, () => deps.orchestrator.respondToInput(runId, requestId, text));
        },
        async cancel(runId) {
            const context = deps.context(runId);
            if (context === undefined || context.controls.kind !== 'enabled' || !context.cancelOffered || isEndStatus(context.run.status) || busy.has(runId)) {
                return;
            }
            busy.add(runId);
            runRefusals.delete(runId);
            try {
                if (await deps.ui.confirm(acCancelConfirmation(context.specNumber), AC_CANCEL_BUTTON)) {
                    const result = await deps.orchestrator.stop(runId);
                    if (result.kind === 'refused') {
                        runRefusals.set(runId, result.reason);
                    }
                }
            } catch {
                runRefusals.set(runId, AC_REQUEST_FAILED);
            } finally {
                busy.delete(runId);
                deps.changed();
            }
        },
        async resume(runId) {
            const context = deps.context(runId);
            if (context === undefined || context.controls.kind !== 'enabled' || !isEndStatus(context.run.status) || busy.has(runId)) {
                return;
            }
            busy.add(runId);
            runRefusals.delete(runId);
            try {
                const result = await deps.orchestrator.resume(runId);
                if (result.kind === 'resumed') {
                    deps.selectRun(result.runId);
                } else if (result.kind === 'refused') {
                    runRefusals.set(runId, result.reason);
                }
            } catch {
                runRefusals.set(runId, AC_REQUEST_FAILED);
            } finally {
                busy.delete(runId);
                deps.changed();
            }
        },
        requestState(runId, requestId) {
            const key = keyOf(runId, requestId);
            return { pending: pending.has(key), refusal: refusals.get(key) };
        },
        runRefusal: (runId) => runRefusals.get(runId),
        prune(runId, openRequestIds) {
            const prefix = `${runId}/`;
            const keep = new Set(openRequestIds.map((id) => keyOf(runId, id)));
            for (const key of [...pending, ...refusals.keys()]) {
                if (key.startsWith(prefix) && !keep.has(key)) {
                    pending.delete(key);
                    refusals.delete(key);
                }
            }
        },
    };
}
