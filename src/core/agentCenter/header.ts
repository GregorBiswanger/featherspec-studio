import type { HeaderView } from '../../shared/protocol/agentCenter';
import { AC_NOT_AVAILABLE } from '../../shared/protocol/agentCenterTexts';
import type { SpecRef } from '../../shared/protocol/missionControl';
import type { RunView } from '../runtime/model';

function held(value: string | undefined): string {
    return value === undefined || value === '' ? AC_NOT_AVAILABLE : value;
}

function causeOf(run: RunView): string | undefined {
    for (let index = run.statusHistory.length - 1; index >= 0; index -= 1) {
        const entry = run.statusHistory[index];
        if (entry?.status === run.status) {
            return entry.cause;
        }
    }
    return undefined;
}

export function runHeader(run: RunView, spec: SpecRef, provider: string): HeaderView {
    return {
        runId: run.runId,
        provider,
        model: held(run.model),
        session: held(run.sessionRef),
        spec,
        status: run.status,
        cause: causeOf(run),
        started: run.started,
        ended: run.ended,
    };
}
