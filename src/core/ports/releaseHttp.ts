export interface HttpRequestOptions {
    headers: Readonly<Record<string, string>>;
    signal: AbortSignal;
}

export interface HttpResponse {
    status: number;
    headers: Readonly<Record<string, string>>;
    body: AsyncIterable<Uint8Array>;
}

export interface ReleaseHttpPort {
    get(url: string, options: HttpRequestOptions): Promise<HttpResponse>;
}
