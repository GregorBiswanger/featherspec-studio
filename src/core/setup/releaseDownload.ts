import type { ClockPort, Disposable } from '../ports/host';
import type { HttpResponse, ReleaseHttpPort } from '../ports/releaseHttp';
import { DOWNLOAD_FAILURE, DOWNLOAD_TIMEOUT_MS, MAX_ARCHIVE_BYTES, MAX_REDIRECTS } from './setupTexts';

export const RELEASE_REPOSITORY = 'GregorBiswanger/featherspec';
export const LATEST_RELEASE_URL = `https://github.com/${RELEASE_REPOSITORY}/releases/latest`;
export const ALLOWED_HOSTS: readonly string[] = ['github.com', 'codeload.github.com'];

export interface DownloadDeps {
    http: ReleaseHttpPort;
    clock: ClockPort;
    studioVersion: string;
}

export type DownloadResult =
    | { ok: true; tag: string; bytes: Uint8Array }
    | { ok: false; kind: 'cancelled' }
    | { ok: false; kind: 'too-large' }
    | { ok: false; kind: 'failed'; reason: string };

export function archiveUrl(tag: string): string {
    return `https://github.com/${RELEASE_REPOSITORY}/archive/refs/tags/${encodeURIComponent(tag)}.tar.gz`;
}

class Stop extends Error {
    constructor(readonly result: DownloadResult) {
        super('download stopped');
    }
}

function failed(reason: string): Stop {
    return new Stop({ ok: false, kind: 'failed', reason });
}

function isRedirect(status: number): boolean {
    return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function resolveAllowed(location: string, base: string): URL | undefined {
    try {
        const url = new URL(location, base);
        return url.protocol === 'https:' && ALLOWED_HOSTS.includes(url.hostname) && url.username === '' && url.password === '' ? url : undefined;
    } catch {
        return undefined;
    }
}

function tagOf(url: URL): string | undefined {
    const match = /\/releases\/tag\/([^/]+)$/.exec(url.pathname);
    if (match === null) {
        return undefined;
    }
    try {
        const tag = decodeURIComponent(match[1] ?? '');
        return /^[A-Za-z0-9][A-Za-z0-9._+-]*$/.test(tag) && !tag.includes('..') ? tag : undefined;
    } catch {
        return undefined;
    }
}

function resetTime(headers: Readonly<Record<string, string>>, nowIso: string): string | undefined {
    let at: number | undefined;
    const reset = headers['x-ratelimit-reset'];
    const retryAfter = headers['retry-after'];
    if (reset !== undefined && /^\d+$/.test(reset)) {
        at = Number(reset) * 1000;
    } else if (retryAfter !== undefined) {
        at = /^\d+$/.test(retryAfter) ? Date.parse(nowIso) + Number(retryAfter) * 1000 : Date.parse(retryAfter);
    }
    if (at === undefined || !Number.isFinite(at)) {
        return undefined;
    }
    return `${new Date(at).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export async function downloadLatestRelease(deps: DownloadDeps, signal: AbortSignal): Promise<DownloadResult> {
    const inner = new AbortController();
    const headers = { 'User-Agent': `FeatherSpec-Studio/${deps.studioVersion}` };
    let timedOut: 'answer' | 'idle' | undefined;
    let timer: Disposable | undefined;
    const forward = () => inner.abort();
    const aborted = new Promise<'aborted'>((resolve) => inner.signal.addEventListener('abort', () => resolve('aborted'), { once: true }));
    const disarm = () => {
        timer?.dispose();
        timer = undefined;
    };
    const arm = (which: 'answer' | 'idle') => {
        disarm();
        timer = deps.clock.setTimeout(() => {
            timedOut = which;
            inner.abort();
        }, DOWNLOAD_TIMEOUT_MS);
    };
    const interrupted = (error: unknown): Stop => {
        if (error instanceof Stop) {
            return error;
        }
        if (signal.aborted) {
            return new Stop({ ok: false, kind: 'cancelled' });
        }
        if (timedOut !== undefined) {
            return failed(timedOut === 'answer' ? DOWNLOAD_FAILURE.answerTimeout : DOWNLOAD_FAILURE.idleTimeout);
        }
        return failed(DOWNLOAD_FAILURE.noConnection(error instanceof Error ? error.message : String(error)));
    };

    async function get(url: string): Promise<HttpResponse> {
        arm('answer');
        let response: HttpResponse;
        try {
            response = await Promise.race([deps.http.get(url, { headers, signal: inner.signal }), aborted.then(() => Promise.reject(new Error('aborted')))]);
        } catch (error) {
            throw interrupted(error);
        } finally {
            disarm();
        }
        const limited = response.status === 429 || (response.status === 403 && response.headers['x-ratelimit-remaining'] === '0');
        if (limited) {
            throw failed(DOWNLOAD_FAILURE.rateLimit(resetTime(response.headers, deps.clock.now())));
        }
        return response;
    }

    async function latestTag(): Promise<string> {
        const response = await get(LATEST_RELEASE_URL);
        if (!isRedirect(response.status)) {
            throw failed(response.status >= 200 && response.status < 300 ? DOWNLOAD_FAILURE.noReleaseTag : DOWNLOAD_FAILURE.status(response.status));
        }
        const location = response.headers['location'];
        if (location === undefined) {
            throw failed(DOWNLOAD_FAILURE.noReleaseTag);
        }
        const target = resolveAllowed(location, LATEST_RELEASE_URL);
        if (target === undefined) {
            throw failed(DOWNLOAD_FAILURE.redirectNotAllowed);
        }
        const tag = tagOf(target);
        if (tag === undefined) {
            throw failed(DOWNLOAD_FAILURE.noReleaseTag);
        }
        return tag;
    }

    async function archive(tag: string): Promise<Uint8Array> {
        let url = archiveUrl(tag);
        for (let redirects = 0; ; redirects++) {
            const response = await get(url);
            if (isRedirect(response.status)) {
                const location = response.headers['location'];
                if (location === undefined) {
                    throw failed(DOWNLOAD_FAILURE.redirectWithoutTarget);
                }
                if (redirects >= MAX_REDIRECTS) {
                    throw failed(DOWNLOAD_FAILURE.tooManyRedirects);
                }
                const target = resolveAllowed(location, url);
                if (target === undefined) {
                    throw failed(DOWNLOAD_FAILURE.redirectNotAllowed);
                }
                url = target.href;
                continue;
            }
            if (response.status !== 200) {
                throw failed(DOWNLOAD_FAILURE.status(response.status));
            }
            return readBody(response);
        }
    }

    async function readBody(response: HttpResponse): Promise<Uint8Array> {
        const chunks: Uint8Array[] = [];
        let total = 0;
        const iterator = response.body[Symbol.asyncIterator]();
        try {
            for (;;) {
                arm('idle');
                const step = await Promise.race([iterator.next(), aborted]);
                if (step === 'aborted') {
                    throw new Error('aborted');
                }
                if (step.done === true) {
                    break;
                }
                total += step.value.length;
                if (total > MAX_ARCHIVE_BYTES) {
                    inner.abort();
                    throw new Stop({ ok: false, kind: 'too-large' });
                }
                chunks.push(step.value);
            }
        } catch (error) {
            throw interrupted(error);
        } finally {
            disarm();
            void iterator.return?.().catch(() => undefined);
        }
        const bytes = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
        }
        return bytes;
    }

    if (signal.aborted) {
        return { ok: false, kind: 'cancelled' };
    }
    signal.addEventListener('abort', forward, { once: true });
    try {
        const tag = await latestTag();
        const bytes = await archive(tag);
        return { ok: true, tag, bytes };
    } catch (error) {
        const stop = interrupted(error);
        return stop.result;
    } finally {
        disarm();
        signal.removeEventListener('abort', forward);
    }
}
