import type { HttpRequestOptions, HttpResponse, ReleaseHttpPort } from '../../ports/releaseHttp';

export interface RecordedRequest {
    url: string;
    headers: Readonly<Record<string, string>>;
    signal: AbortSignal;
}

export type Scripted = (request: RecordedRequest) => Promise<HttpResponse> | HttpResponse;

export interface ScriptedHttp extends ReleaseHttpPort {
    requests: RecordedRequest[];
}

export function whenAborted(signal: AbortSignal): Promise<never> {
    return new Promise((_resolve, reject) => {
        const fail = () => reject(new Error('aborted'));
        if (signal.aborted) {
            fail();
            return;
        }
        signal.addEventListener('abort', fail, { once: true });
    });
}

export function reply(status: number, headers: Record<string, string> = {}, chunks: readonly Uint8Array[] = []): HttpResponse {
    return {
        status,
        headers,
        body: {
            async *[Symbol.asyncIterator]() {
                yield* chunks;
            },
        },
    };
}

export function replyWith(status: number, headers: Record<string, string>, body: () => AsyncIterable<Uint8Array>): HttpResponse {
    return { status, headers, body: { [Symbol.asyncIterator]: () => body()[Symbol.asyncIterator]() } };
}

export function scriptedHttp(routes: Record<string, Scripted | HttpResponse> | ((url: string) => Scripted | HttpResponse | undefined)): ScriptedHttp {
    const requests: RecordedRequest[] = [];
    return {
        requests,
        async get(url: string, options: HttpRequestOptions) {
            const request: RecordedRequest = { url, headers: options.headers, signal: options.signal };
            requests.push(request);
            const route = typeof routes === 'function' ? routes(url) : routes[url];
            if (route === undefined) {
                throw new Error(`no scripted answer for ${url}`);
            }
            return typeof route === 'function' ? route(request) : route;
        },
    };
}
