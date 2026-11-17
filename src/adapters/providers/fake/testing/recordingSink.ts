import type { DeliveredEvent, ProviderEventSink } from '../../../../core/ports/agentProvider';

export interface RecordingSink extends ProviderEventSink {
    events: DeliveredEvent[];
    closed: number;
    failures: string[];
    kinds(): string[];
}

export function createRecordingSink(onEmit?: (event: DeliveredEvent) => void): RecordingSink {
    const sink: RecordingSink = {
        events: [],
        closed: 0,
        failures: [],
        emit(event) {
            sink.events.push(event);
            onEmit?.(event);
        },
        close() {
            sink.closed += 1;
        },
        fail(reason) {
            sink.failures.push(reason);
        },
        kinds: () => sink.events.map((event) => event.kind),
    };
    return sink;
}
