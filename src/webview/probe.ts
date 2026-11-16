import type { ProbeOutcome } from '../shared/protocol/messages';

export type Probe = (url: string) => Promise<ProbeOutcome>;

export function createFetchProbe(fetchImpl: (url: string) => Promise<{ ok: boolean }>): Probe {
    return async (url) => {
        try {
            const response = await fetchImpl(url);
            return response.ok ? 'loaded' : 'failed';
        } catch {
            return 'failed';
        }
    };
}
