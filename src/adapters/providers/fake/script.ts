import type { DeliveredEvent, EventSource, ProviderEventSink } from '../../../core/ports/agentProvider';
import type { Disposable } from '../../../core/ports/host';
import type { RuntimeClock } from '../../../core/ports/runtimeMedium';
import type { JsonValue } from '../../../core/runtime/model';

export interface ScriptEvent {
    kind: string;
    payload: JsonValue;
    source?: EventSource;
    providerEventId?: string;
    occurredAt?: string;
}

export type AnswerKey = 'approve-once' | 'reject' | 'answer';

export type ScriptStep =
    | { type: 'emit'; event: ScriptEvent; delayMs?: number }
    | { type: 'wait'; ms: number }
    | { type: 'awaitAnswer'; answerType: 'approval' | 'input'; requestId: string; branches: Partial<Record<AnswerKey, ScriptStep[]>> }
    | { type: 'ignoreCancel' }
    | { type: 'repeat'; intervalMs: number; event: ScriptEvent }
    | { type: 'close' }
    | { type: 'fail'; reason: string };

export interface ScriptRun {
    cancel(): 'cancelled' | 'ignored' | 'inactive';
    answer(answerType: 'approval' | 'input', requestId: string, key: AnswerKey): boolean;
    dispose(): void;
}

export function toDelivered(event: ScriptEvent): DeliveredEvent {
    return {
        kind: event.kind,
        source: event.source ?? 'provider',
        ...(event.providerEventId === undefined ? {} : { providerEventId: event.providerEventId }),
        ...(event.occurredAt === undefined ? {} : { occurredAt: event.occurredAt }),
        payload: event.payload,
    };
}

const END_KINDS: readonly string[] = ['run.completed', 'run.failed', 'run.cancelled'];

export function runScript(steps: readonly ScriptStep[], clock: RuntimeClock, sink: ProviderEventSink): ScriptRun {
    let queue: ScriptStep[] = [...steps];
    let timer: Disposable | undefined;
    let stopped = false;
    let delayed = false;
    let ignoresCancel = false;
    let pending: Extract<ScriptStep, { type: 'awaitAnswer' }> | undefined;
    let repeating = false;
    let ended = false;

    const later = (ms: number): void => {
        timer = clock.setTimeout(proceed, ms);
    };

    const deliver = (event: ScriptEvent): void => {
        if (END_KINDS.includes(event.kind)) {
            ended = true;
        }
        sink.emit(toDelivered(event));
    };

    function proceed(): void {
        timer = undefined;
        while (!stopped && pending === undefined && !repeating && queue.length > 0) {
            const step = queue.shift();
            if (step === undefined) {
                return;
            }
            switch (step.type) {
                case 'wait':
                    later(step.ms);
                    return;
                case 'emit':
                    if (!delayed && (step.delayMs ?? 0) > 0) {
                        delayed = true;
                        queue.unshift(step);
                        later(step.delayMs ?? 0);
                        return;
                    }
                    delayed = false;
                    deliver(step.event);
                    break;
                case 'awaitAnswer':
                    pending = step;
                    return;
                case 'ignoreCancel':
                    ignoresCancel = true;
                    break;
                case 'repeat': {
                    repeating = true;
                    const tick = (): void => {
                        timer = undefined;
                        if (stopped) {
                            return;
                        }
                        deliver(step.event);
                        timer = clock.setTimeout(tick, step.intervalMs);
                    };
                    timer = clock.setTimeout(tick, step.intervalMs);
                    return;
                }
                case 'close':
                    sink.close();
                    break;
                case 'fail':
                    sink.fail(step.reason);
                    break;
            }
        }
    }

    proceed();
    return {
        cancel() {
            if (stopped || ended) {
                return 'inactive';
            }
            if (ignoresCancel) {
                return 'ignored';
            }
            stopped = true;
            timer?.dispose();
            timer = undefined;
            pending = undefined;
            deliver({ kind: 'run.cancelled', payload: { cause: 'cancelled by request' } });
            sink.close();
            return 'cancelled';
        },
        answer(answerType, requestId, key) {
            if (stopped || pending === undefined || pending.answerType !== answerType || pending.requestId !== requestId) {
                return false;
            }
            const branch = pending.branches[key];
            if (branch === undefined) {
                return false;
            }
            pending = undefined;
            queue = [...branch, ...queue];
            proceed();
            return true;
        },
        dispose() {
            stopped = true;
            timer?.dispose();
            timer = undefined;
        },
    };
}
