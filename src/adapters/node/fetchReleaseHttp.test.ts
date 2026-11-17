import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createFetchReleaseHttp } from './fetchReleaseHttp';

interface Seen {
    url: string | undefined;
    headers: http.IncomingHttpHeaders;
}

let server: http.Server | undefined;
const seen: Seen[] = [];

async function listen(handler: (request: http.IncomingMessage, response: http.ServerResponse) => void): Promise<string> {
    server = http.createServer((request, response) => {
        seen.push({ url: request.url, headers: request.headers });
        handler(request, response);
    });
    await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(async () => {
    const closing = server;
    server = undefined;
    seen.length = 0;
    if (closing !== undefined) {
        closing.closeAllConnections();
        await new Promise<void>((resolve) => closing.close(() => resolve()));
    }
});

async function drain(body: AsyncIterable<Uint8Array>): Promise<Uint8Array[]> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of body) {
        chunks.push(chunk);
    }
    return chunks;
}

const adapter = createFetchReleaseHttp();

describe('0014 AC-025: the fetch adapter of the release download', () => {
    it('streams the body of a 200 answer and gives lower-case header names', async () => {
        const base = await listen((_request, response) => {
            response.writeHead(200, { 'Content-Type': 'application/x-gzip', 'X-RateLimit-Remaining': '7' });
            response.write(Buffer.from([1, 2, 3]));
            response.end(Buffer.from([4, 5]));
        });
        const answer = await adapter.get(`${base}/archive`, { headers: { 'User-Agent': 'FeatherSpec-Studio/test' }, signal: new AbortController().signal });
        expect(answer.status).toBe(200);
        expect(answer.headers['content-type']).toBe('application/x-gzip');
        expect(answer.headers['x-ratelimit-remaining']).toBe('7');
        const joined = Buffer.concat(await drain(answer.body));
        expect([...joined]).toEqual([1, 2, 3, 4, 5]);
    });

    it('does not follow a redirect: the 302 and its Location come back as they are and the target is not requested', async () => {
        const base = await listen((request, response) => {
            if (request.url === '/latest') {
                response.writeHead(302, { Location: '/releases/tag/v1.10.0' });
                response.end('moved');
                return;
            }
            response.writeHead(200);
            response.end('target');
        });
        const answer = await adapter.get(`${base}/latest`, { headers: {}, signal: new AbortController().signal });
        expect(answer.status).toBe(302);
        expect(answer.headers['location']).toBe('/releases/tag/v1.10.0');
        expect(await drain(answer.body)).toEqual([]);
        expect(seen.map((entry) => entry.url)).toEqual(['/latest']);
    });

    it('gives other answers with an empty body, 404 and 429 included', async () => {
        const base = await listen((_request, response) => {
            response.writeHead(429, { 'Retry-After': '60' });
            response.end('slow down');
        });
        const answer = await adapter.get(`${base}/x`, { headers: {}, signal: new AbortController().signal });
        expect(answer.status).toBe(429);
        expect(answer.headers['retry-after']).toBe('60');
        expect(await drain(answer.body)).toEqual([]);
    });

    it('sends the given User-Agent, and no cookie, no authorization', async () => {
        const base = await listen((_request, response) => {
            response.writeHead(200);
            response.end();
        });
        await adapter.get(`${base}/x`, { headers: { 'User-Agent': 'FeatherSpec-Studio/9.9.9' }, signal: new AbortController().signal });
        expect(seen[0]?.headers['user-agent']).toBe('FeatherSpec-Studio/9.9.9');
        expect(seen[0]?.headers['cookie']).toBeUndefined();
        expect(seen[0]?.headers['authorization']).toBeUndefined();
    });

    it('rejects when the connection is refused', async () => {
        const base = await listen((_request, response) => response.end());
        const closing = server;
        server = undefined;
        closing?.closeAllConnections();
        await new Promise<void>((resolve) => closing?.close(() => resolve()));
        await expect(adapter.get(`${base}/x`, { headers: {}, signal: new AbortController().signal })).rejects.toThrow();
    });

    it('rejects when the signal is aborted while the server is silent', async () => {
        const base = await listen(() => undefined);
        const controller = new AbortController();
        const pending = adapter.get(`${base}/x`, { headers: {}, signal: controller.signal });
        const outcome = expect(pending).rejects.toThrow();
        while (seen.length === 0) {
            await new Promise((resolve) => setTimeout(resolve, 5));
        }
        controller.abort();
        await outcome;
    });

    it('rejects the body iteration when the signal is aborted in the middle of the body', async () => {
        const base = await listen((_request, response) => {
            response.writeHead(200);
            response.write(Buffer.from([1]));
        });
        const controller = new AbortController();
        const answer = await adapter.get(`${base}/x`, { headers: {}, signal: controller.signal });
        const iterator = answer.body[Symbol.asyncIterator]();
        expect((await iterator.next()).done).toBe(false);
        const next = iterator.next();
        const outcome = expect(next).rejects.toThrow();
        controller.abort();
        await outcome;
    });
});
