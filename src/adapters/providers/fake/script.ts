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

export type ScriptStep =
    | { type: 'emit'; event: ScriptEvent; delayMs?: number }
    | { type: 'wait'; ms: number }
    | { type: 'close' }
    | { type: 'fail'; reason: string };

export interface ScriptRun {
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

export function runScript(steps: readonly ScriptStep[], clock: RuntimeClock, sink: ProviderEventSink): ScriptRun {
    let index = 0;
    let timer: Disposable | undefined;
    let stopped = false;
    let delayed = false;

    const later = (ms: number): void => {
        timer = clock.setTimeout(proceed, ms);
    };

    function proceed(): void {
        timer = undefined;
        while (!stopped && index < steps.length) {
            const step = steps[index];
            index += 1;
            if (step === undefined) {
                return;
            }
            if (step.type === 'wait') {
                later(step.ms);
                return;
            }
            if (step.type === 'emit') {
                if (!delayed && (step.delayMs ?? 0) > 0) {
                    delayed = true;
                    index -= 1;
                    later(step.delayMs ?? 0);
                    return;
                }
                delayed = false;
                sink.emit(toDelivered(step.event));
            } else if (step.type === 'close') {
                sink.close();
            } else {
                sink.fail(step.reason);
            }
        }
    }

    proceed();
    return {
        dispose() {
            stopped = true;
            timer?.dispose();
            timer = undefined;
        },
    };
}
