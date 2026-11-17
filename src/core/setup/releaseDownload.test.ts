import { describe, expect, it } from 'vitest';
import { checkRelease } from './releaseArchive';
import { createTarGzArchive } from '../../adapters/node/tarGzArchive';
import { archiveUrl, downloadLatestRelease, LATEST_RELEASE_URL, type DownloadResult } from './releaseDownload';
import { createSetupClock, type SetupClock } from './testing/setupClock';
import { realReleaseBytes } from './testing/realRelease';
import { reply, replyWith, scriptedHttp, whenAborted, type ScriptedHttp } from './testing/scriptedHttp';

const TAG_URL = 'https://github.com/GregorBiswanger/featherspec/releases/tag/v1.10.0';
const CODELOAD = 'https://codeload.github.com/GregorBiswanger/featherspec/tar.gz/refs/tags/v1.10.0';
const bytes = (...values: number[]) => new Uint8Array(values);

interface Run {
    result: DownloadResult;
    http: ScriptedHttp;
    clock: SetupClock;
}

function start(http: ScriptedHttp, clock: SetupClock = createSetupClock(), signal: AbortSignal = new AbortController().signal) {
    return downloadLatestRelease({ http, clock, studioVersion: '0.1.0' }, signal);
}

async function run(routes: Parameters<typeof scriptedHttp>[0], signal?: AbortSignal): Promise<Run> {
    const http = scriptedHttp(routes);
    const clock = createSetupClock();
    return { result: await start(http, clock, signal), http, clock };
}

const happy = {
    [LATEST_RELEASE_URL]: reply(302, { location: TAG_URL }),
    [archiveUrl('v1.10.0')]: reply(302, { location: CODELOAD }),
    [CODELOAD]: reply(200, { 'content-type': 'application/x-gzip' }, [bytes(1, 2), bytes(3), bytes(4, 5, 6)]),
};

function failure(result: DownloadResult): string {
    if (result.ok || result.kind !== 'failed') {
        throw new Error(`expected a failure, got ${JSON.stringify(result.ok ? 'ok' : result.kind)}`);
    }
    return result.reason;
}

describe('0014 AC-005, AC-025, §10: the route to the latest release', () => {
    it('asks the latest-release page for the tag, then the tag archive, follows the redirect and returns the joined bytes', async () => {
        const { result, http } = await run(happy);
        expect(result).toEqual({ ok: true, tag: 'v1.10.0', bytes: bytes(1, 2, 3, 4, 5, 6) });
        expect(http.requests.map((request) => request.url)).toEqual([
            'https://github.com/GregorBiswanger/featherspec/releases/latest',
            'https://github.com/GregorBiswanger/featherspec/archive/refs/tags/v1.10.0.tar.gz',
            CODELOAD,
        ]);
    });

    it('sends the User-Agent with the Studio version and no other header', async () => {
        const { http } = await run(happy);
        for (const request of http.requests) {
            expect(request.headers).toEqual({ 'User-Agent': 'FeatherSpec-Studio/0.1.0' });
        }
    });

    it('returns the real 1.10.0 archive byte for byte, delivered in odd chunks, and it checks out as a release', async () => {
        const real = realReleaseBytes();
        const chunks: Uint8Array[] = [];
        for (let offset = 0; offset < real.length; offset += 7919) {
            chunks.push(real.slice(offset, offset + 7919));
        }
        const { result } = await run({ ...happy, [CODELOAD]: reply(200, {}, chunks) });
        expect(result.ok && result.bytes).toEqual(real);
        const release = await checkRelease(createTarGzArchive(), result.ok ? result.bytes : new Uint8Array());
        expect(release.ok && release.version).toBe('1.10.0');
    });

    it('takes a relative Location and a tag with a plus sign, which it encodes into the archive address', async () => {
        const routes = {
            [LATEST_RELEASE_URL]: reply(302, { location: '/GregorBiswanger/featherspec/releases/tag/v2.0.0%2Brc1' }),
            [archiveUrl('v2.0.0+rc1')]: reply(200, {}, [bytes(9)]),
        };
        const { result, http } = await run(routes);
        expect(result).toEqual({ ok: true, tag: 'v2.0.0+rc1', bytes: bytes(9) });
        expect(http.requests[1]?.url).toBe('https://github.com/GregorBiswanger/featherspec/archive/refs/tags/v2.0.0%2Brc1.tar.gz');
    });

    it('reads no body of a redirect and starts nothing else: three requests, no timer left', async () => {
        const { clock, http } = await run(happy);
        expect(http.requests).toHaveLength(3);
        expect(clock.pendingTimers()).toBe(0);
    });
});

describe('0014 AC-019: the release metadata cannot be fetched', () => {
    it.each([
        ['a latest page that redirects to the releases list', reply(302, { location: 'https://github.com/GregorBiswanger/featherspec/releases' })],
        ['a latest page that answers 200 and redirects nowhere', reply(200)],
        ['a redirect without a Location', reply(302)],
        ['a tag that is not a safe name', reply(302, { location: 'https://github.com/GregorBiswanger/featherspec/releases/tag/v1%2F..%2Fx' })],
        ['an empty tag', reply(302, { location: 'https://github.com/GregorBiswanger/featherspec/releases/tag/' })],
    ])('%s: "GitHub names no latest release for this repository"', async (_name, answer) => {
        const { result, http } = await run({ [LATEST_RELEASE_URL]: answer });
        expect(failure(result)).toBe('GitHub names no latest release for this repository');
        expect(http.requests).toHaveLength(1);
    });

    it('a final answer other than success: the latest page and the archive', async () => {
        expect(failure((await run({ [LATEST_RELEASE_URL]: reply(404) })).result)).toBe('GitHub answered with status 404');
        expect(failure((await run({ ...happy, [CODELOAD]: reply(500) })).result)).toBe('GitHub answered with status 500');
        expect(failure((await run({ ...happy, [CODELOAD]: reply(204) })).result)).toBe('GitHub answered with status 204');
    });

    it('no connection: the request itself fails, or the body breaks off', async () => {
        const down = scriptedHttp(() => () => {
            throw new Error('getaddrinfo ENOTFOUND github.com');
        });
        expect(failure(await start(down))).toBe('there is no connection to GitHub (getaddrinfo ENOTFOUND github.com)');
        const broken = replyWith(200, {}, () => ({
            async *[Symbol.asyncIterator]() {
                yield bytes(1);
                throw new Error('socket hang up');
            },
        }));
        expect(failure((await run({ ...happy, [CODELOAD]: broken })).result)).toBe('there is no connection to GitHub (socket hang up)');
    });

    it('negative control: the same request with a good answer is no failure', async () => {
        expect((await run(happy)).result.ok).toBe(true);
    });
});

describe('0014 AC-019: redirects stay within the hosts of §10', () => {
    it.each([
        ['an http address', 'http://codeload.github.com/x'],
        ['another host', 'https://example.com/GregorBiswanger/featherspec.tar.gz'],
        ['a lookalike host', 'https://github.com.evil.example/x'],
        ['a subdomain that is not listed', 'https://api.github.com/x'],
        ['an address with a user name', 'https://user@codeload.github.com/x'],
        ['another scheme', 'file:///etc/passwd'],
    ])('%s is refused', async (_name, location) => {
        const { result, http } = await run({ ...happy, [archiveUrl('v1.10.0')]: reply(302, { location }) });
        expect(failure(result)).toBe('GitHub redirected to an address that is not allowed');
        expect(http.requests).toHaveLength(2);
    });

    it('a latest page that redirects to another host is refused too', async () => {
        const { result } = await run({ [LATEST_RELEASE_URL]: reply(302, { location: 'https://example.com/releases/tag/v1.0.0' }) });
        expect(failure(result)).toBe('GitHub redirected to an address that is not allowed');
    });

    it('five redirects are followed, a sixth is refused', async () => {
        const hop = (index: number) => `https://codeload.github.com/hop/${index}`;
        const chain = (hops: number) => {
            const routes: Record<string, ReturnType<typeof reply>> = { [LATEST_RELEASE_URL]: reply(302, { location: TAG_URL }) };
            let from = archiveUrl('v1.10.0');
            for (let index = 1; index <= hops; index++) {
                routes[from] = reply(302, { location: hop(index) });
                from = hop(index);
            }
            routes[from] = reply(200, {}, [bytes(7)]);
            return routes;
        };
        expect((await run(chain(5))).result).toEqual({ ok: true, tag: 'v1.10.0', bytes: bytes(7) });
        expect(failure((await run(chain(6))).result)).toBe('GitHub redirected more than 5 times');
    });

    it('a redirect without a Location is refused', async () => {
        expect(failure((await run({ ...happy, [archiveUrl('v1.10.0')]: reply(302) })).result)).toBe('GitHub redirected without saying where');
    });
});

describe("0014 AC-019, PD-053: GitHub's rate limit", () => {
    it('429 names the reset time of x-ratelimit-reset (epoch seconds, UTC)', async () => {
        const reset = String(Date.parse('2026-11-17T13:30:45Z') / 1000);
        const { result } = await run({ [LATEST_RELEASE_URL]: reply(429, { 'x-ratelimit-reset': reset }) });
        expect(failure(result)).toBe("GitHub's rate limit is reached; it resets at 2026-11-17 13:30 UTC");
    });

    it('403 with x-ratelimit-remaining 0 is the rate limit', async () => {
        const { result } = await run({ ...happy, [CODELOAD]: reply(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Date.parse('2026-11-17T18:00:00Z') / 1000) }) });
        expect(failure(result)).toBe("GitHub's rate limit is reached; it resets at 2026-11-17 18:00 UTC");
    });

    it('retry-after in seconds counts from the clock, retry-after as a date is taken as it is', async () => {
        expect(failure((await run({ [LATEST_RELEASE_URL]: reply(429, { 'retry-after': '90' }) })).result)).toBe("GitHub's rate limit is reached; it resets at 2026-11-17 12:01 UTC");
        expect(failure((await run({ [LATEST_RELEASE_URL]: reply(429, { 'retry-after': 'Tue, 17 Nov 2026 15:00:00 GMT' }) })).result)).toBe(
            "GitHub's rate limit is reached; it resets at 2026-11-17 15:00 UTC",
        );
    });

    it('an answer without a reset time still names the rate limit', async () => {
        expect(failure((await run({ [LATEST_RELEASE_URL]: reply(429) })).result)).toBe("GitHub's rate limit is reached");
        expect(failure((await run({ [LATEST_RELEASE_URL]: reply(429, { 'retry-after': 'soon' }) })).result)).toBe("GitHub's rate limit is reached");
    });

    it('negative control: 403 with requests remaining is a plain status 403', async () => {
        expect(failure((await run({ [LATEST_RELEASE_URL]: reply(403, { 'x-ratelimit-remaining': '12' }) })).result)).toBe('GitHub answered with status 403');
        expect(failure((await run({ [LATEST_RELEASE_URL]: reply(403) })).result)).toBe('GitHub answered with status 403');
    });
});

describe('0014 AC-019: the 30 second limits', () => {
    function hangingAnswer(url: string) {
        return { ...happy, [url]: (request: { signal: AbortSignal }) => whenAborted(request.signal) };
    }

    it('no answer within 30 seconds: the request is aborted and the reason says so; 29.999 seconds are still fine', async () => {
        const http = scriptedHttp(hangingAnswer(LATEST_RELEASE_URL));
        const clock = createSetupClock();
        const pending = start(http, clock);
        clock.advance(29_999);
        expect(http.requests[0]?.signal.aborted).toBe(false);
        clock.advance(1);
        expect(http.requests[0]?.signal.aborted).toBe(true);
        expect(failure(await pending)).toBe('GitHub did not answer within 30 seconds');
        expect(clock.pendingTimers()).toBe(0);
    });

    it('the archive request has the same limit', async () => {
        const http = scriptedHttp(hangingAnswer(archiveUrl('v1.10.0')));
        const clock = createSetupClock();
        const pending = start(http, clock);
        for (let turn = 0; turn < 20; turn++) {
            await Promise.resolve();
        }
        expect(http.requests).toHaveLength(2);
        clock.advance(30_000);
        expect(failure(await pending)).toBe('GitHub did not answer within 30 seconds');
    });

    it('no data for 30 seconds during the download; every chunk starts the 30 seconds anew', async () => {
        let release: (() => void) | undefined;
        const stalled = replyWith(200, {}, () => ({
            async *[Symbol.asyncIterator]() {
                yield bytes(1);
                await new Promise<void>((resolve) => {
                    release = resolve;
                });
                yield bytes(2);
                await new Promise<void>(() => undefined);
            },
        }));
        const http = scriptedHttp({ ...happy, [CODELOAD]: stalled });
        const clock = createSetupClock();
        const pending = start(http, clock);
        for (let turn = 0; turn < 20 && release === undefined; turn++) {
            await Promise.resolve();
        }
        clock.advance(29_000);
        release?.();
        for (let turn = 0; turn < 20; turn++) {
            await Promise.resolve();
        }
        clock.advance(29_000);
        expect(http.requests[2]?.signal.aborted).toBe(false);
        clock.advance(1_000);
        expect(http.requests[2]?.signal.aborted).toBe(true);
        expect(failure(await pending)).toBe('GitHub sent no data for 30 seconds');
        expect(clock.pendingTimers()).toBe(0);
    });

    it('a body that ignores the abort still ends the download at the limit', async () => {
        const deaf = replyWith(200, {}, () => ({
            async *[Symbol.asyncIterator]() {
                await new Promise<void>(() => undefined);
            },
        }));
        const http = scriptedHttp({ ...happy, [CODELOAD]: deaf });
        const clock = createSetupClock();
        const pending = start(http, clock);
        for (let turn = 0; turn < 20; turn++) {
            await Promise.resolve();
        }
        clock.advance(30_000);
        expect(failure(await pending)).toBe('GitHub sent no data for 30 seconds');
    });
});

describe('0014 AC-021, AC-006: cancel, and the 20 MB limit while reading', () => {
    it('a signal that is already aborted sends no request', async () => {
        const controller = new AbortController();
        controller.abort();
        const { result, http } = await run(happy, controller.signal);
        expect(result).toEqual({ ok: false, kind: 'cancelled' });
        expect(http.requests).toEqual([]);
    });

    it('cancelling while waiting for an answer aborts the request and ends as cancelled, not as a failure', async () => {
        const controller = new AbortController();
        const http = scriptedHttp({ [LATEST_RELEASE_URL]: (request) => whenAborted(request.signal) });
        const clock = createSetupClock();
        const pending = start(http, clock, controller.signal);
        controller.abort();
        expect(await pending).toEqual({ ok: false, kind: 'cancelled' });
        expect(http.requests[0]?.signal.aborted).toBe(true);
        expect(clock.pendingTimers()).toBe(0);
    });

    it('cancelling while the body is read ends as cancelled', async () => {
        const controller = new AbortController();
        const stuck = replyWith(200, {}, () => ({
            async *[Symbol.asyncIterator]() {
                yield bytes(1);
                await new Promise<void>(() => undefined);
            },
        }));
        const http = scriptedHttp({ ...happy, [CODELOAD]: stuck });
        const pending = start(http, createSetupClock(), controller.signal);
        for (let turn = 0; turn < 20; turn++) {
            await Promise.resolve();
        }
        controller.abort();
        expect(await pending).toEqual({ ok: false, kind: 'cancelled' });
    });

    it('more than 20 MB is cut off while it is read: the reading stops at the chunk that crosses the limit', async () => {
        let delivered = 0;
        const big = replyWith(200, {}, () => ({
            async *[Symbol.asyncIterator]() {
                for (let index = 0; index < 100; index++) {
                    delivered += 1;
                    yield new Uint8Array(8 * 1024 * 1024);
                }
            },
        }));
        const { result, http } = await run({ ...happy, [CODELOAD]: big });
        expect(result).toEqual({ ok: false, kind: 'too-large' });
        expect(delivered).toBe(3);
        expect(http.requests[2]?.signal.aborted).toBe(true);
    });

    it('negative control: exactly 20 MB is accepted', async () => {
        const exact = replyWith(200, {}, () => ({
            async *[Symbol.asyncIterator]() {
                yield new Uint8Array(10 * 1024 * 1024);
                yield new Uint8Array(10 * 1024 * 1024);
            },
        }));
        const { result } = await run({ ...happy, [CODELOAD]: exact });
        expect(result.ok && result.bytes.length).toBe(20 * 1024 * 1024);
    });
});
