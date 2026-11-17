import type { RefusalItem } from '../../shared/protocol/agentStart';
import type { PreconditionFailure } from './preconditions';

export function refusalItems(failures: readonly PreconditionFailure[], providerName: string | undefined, stem: string): RefusalItem[] {
    return failures.map((failure): RefusalItem => {
        switch (failure.id) {
            case 'P-1':
                if (failure.kind === 'transition') {
                    const refusal = failure.refusal;
                    const ids = refusal.kind === 'not-ready' ? [...refusal.failing] : refusal.kind === 'derived-target' ? [refusal.rule] : [];
                    return { id: 'P-1', kind: 'transition', refusal: refusal.kind, ids, text: failure.text };
                }
                return { id: 'P-1', kind: failure.kind, stem };
            case 'P-2':
                return { id: 'P-2', missing: failure.missing };
            case 'P-3':
                return failure.configured === undefined ? { id: 'P-3' } : { id: 'P-3', configured: failure.configured };
            case 'P-4':
                return {
                    id: 'P-4',
                    provider: providerName ?? '',
                    result: failure.result,
                    ...(failure.reason === undefined ? {} : { reason: failure.reason }),
                    ...(failure.hint === undefined ? {} : { hint: failure.hint }),
                };
            case 'P-5':
                return { id: 'P-5', runId: failure.runId, stem: failure.stem };
            case 'P-6':
                return { id: 'P-6', state: failure.state, ...(failure.reason === undefined ? {} : { reason: failure.reason }) };
            case 'P-7':
                return { id: 'P-7' };
            case 'P-8':
                return { id: 'P-8', stem: failure.stem };
        }
    });
}
