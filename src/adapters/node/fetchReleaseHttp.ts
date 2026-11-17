import type { HttpRequestOptions, HttpResponse, ReleaseHttpPort } from '../../core/ports/releaseHttp';

async function* chunksOf(body: ReadableStream<Uint8Array>): AsyncGenerator<Uint8Array> {
    const reader = body.getReader();
    try {
        for (;;) {
            const step = await reader.read();
            if (step.done) {
                return;
            }
            yield step.value;
        }
    } finally {
        await reader.cancel().catch(() => undefined);
    }
}

async function* nothing(): AsyncGenerator<Uint8Array> {
    return;
}

export function createFetchReleaseHttp(): ReleaseHttpPort {
    return {
        async get(url: string, options: HttpRequestOptions): Promise<HttpResponse> {
            const response = await fetch(url, { method: 'GET', headers: { ...options.headers }, redirect: 'manual', credentials: 'omit', signal: options.signal });
            const headers: Record<string, string> = {};
            response.headers.forEach((value, name) => {
                headers[name.toLowerCase()] = value;
            });
            if (response.status !== 200 || response.body === null) {
                await response.body?.cancel().catch(() => undefined);
                return { status: response.status, headers, body: nothing() };
            }
            return { status: response.status, headers, body: chunksOf(response.body) };
        },
    };
}
