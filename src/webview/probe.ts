import type { ProbeOutcome } from '../shared/protocol/messages';

export type Probe = (url: string) => Promise<ProbeOutcome>;

const FETCH_TIMEOUT_MS = 10_000;

export function createFetchProbe(fetchImpl: (url: string) => Promise<{ ok: boolean }>, timeoutMs = FETCH_TIMEOUT_MS): Probe {
    return async (url) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const expired = new Promise<'failed'>((resolve) => {
            timer = setTimeout(() => resolve('failed'), timeoutMs);
        });
        const attempt = (async (): Promise<ProbeOutcome> => {
            try {
                const response = await fetchImpl(url);
                return response.ok ? 'loaded' : 'failed';
            } catch {
                return 'failed';
            }
        })();
        try {
            return await Promise.race([attempt, expired]);
        } finally {
            clearTimeout(timer);
        }
    };
}
