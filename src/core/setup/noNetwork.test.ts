import { readdirSync, readFileSync, statSync } from 'node:fs';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const MODULES = ['net', 'node:net', 'http', 'node:http', 'https', 'node:https', 'http2', 'node:http2', 'tls', 'node:tls', 'dgram', 'node:dgram', 'dns', 'node:dns'];

const hits = vi.hoisted(() => [] as string[]);

function recorder(name: string): object {
    return new Proxy(
        {},
        {
            get(_target, property) {
                if (typeof property === 'symbol' || property === 'then' || property === '__esModule') {
                    return undefined;
                }
                hits.push(`${name}.${property}`);
                throw new Error(`${name}.${property} used`);
            },
        },
    );
}

vi.mock('net', () => recorder('net'));
vi.mock('node:net', () => recorder('node:net'));
vi.mock('http', () => recorder('http'));
vi.mock('node:http', () => recorder('node:http'));
vi.mock('https', () => recorder('https'));
vi.mock('node:https', () => recorder('node:https'));
vi.mock('http2', () => recorder('http2'));
vi.mock('node:http2', () => recorder('node:http2'));
vi.mock('tls', () => recorder('tls'));
vi.mock('node:tls', () => recorder('node:tls'));
vi.mock('dgram', () => recorder('dgram'));
vi.mock('node:dgram', () => recorder('node:dgram'));
vi.mock('dns', () => recorder('dns'));
vi.mock('node:dns', () => recorder('node:dns'));

import { createFetchReleaseHttp } from '../../adapters/node/fetchReleaseHttp';
import { createSystemClock } from '../../adapters/node/systemClock';
import { addProject, createShellWorld } from '../shell/testing/world';
import { downloadLatestRelease } from './releaseDownload';

const fetched: string[] = [];
const realFetch = globalThis.fetch;

beforeEach(() => {
    globalThis.fetch = ((input: unknown) => {
        fetched.push(String(input));
        return Promise.reject(new Error('fetch is recorded, not sent'));
    }) as typeof fetch;
});

afterEach(() => {
    globalThis.fetch = realFetch;
    fetched.length = 0;
    hits.length = 0;
});

describe('0014 AC-025: discovery, the view and the panel send no network request', () => {
    it('negative control: the recorders fail on use and a download with the real adapter reaches the fetch recorder', async () => {
        for (const name of MODULES) {
            const loaded = (await import(/* @vite-ignore */ name)) as Record<string, unknown>;
            expect(() => loaded.anything).toThrow('used');
        }
        expect(hits).toHaveLength(MODULES.length);
        const result = await downloadLatestRelease({ http: createFetchReleaseHttp(), clock: createSystemClock(), studioVersion: '0.1.0' }, new AbortController().signal);
        expect(fetched).toEqual(['https://github.com/GregorBiswanger/featherspec/releases/latest']);
        expect(result).toEqual({ ok: false, kind: 'failed', reason: 'there is no connection to GitHub (fetch is recorded, not sent)' });
    });

    it('S2, S9 (marker missing and setup pending), a project, every shell action and refresh send nothing', async () => {
        const world = createShellWorld({ roots: ['plain', 'incomplete', 'pending'] });
        world.discoveryFs.setFile('incomplete', 'AGENTS.md', 'FeatherSpecVersion: 1.10.0\n');
        world.discoveryFs.setDirectory('pending', '.featherspec-setup');
        await world.controller.start();
        await world.settle();
        expect(world.service.view().state?.id).toBe('S9');
        for (const action of ['refresh', 'retry', 'openFolder', 'openSetupGuide', 'showOutput', 'manageTrust', 'setUp', 'copyMergePrompt', 'reload'] as const) {
            await world.service.runAction(action);
        }
        world.discoveryFs.remove('incomplete', 'AGENTS.md');
        world.discoveryFs.remove('pending', '.featherspec-setup');
        await world.controller.refresh();
        await world.settle();
        expect(world.service.view().state?.id).toBe('S2');
        addProject(world, 'plain');
        await world.controller.refresh();
        await world.settle();
        expect(world.service.view().state).toBeUndefined();
        world.service.open({ via: 'area', area: 'board' });
        await world.service.handlers.navigate({ area: 'board' });
        await world.service.refresh();
        world.dispose();
        expect(hits).toEqual([]);
        expect(fetched).toEqual([]);
    });
});

describe('0014 AC-025: only one adapter reaches the network', () => {
    function sources(directory: string): string[] {
        return readdirSync(directory).flatMap((name) => {
            const full = path.join(directory, name);
            if (statSync(full).isDirectory()) {
                return name === 'node_modules' ? [] : sources(full);
            }
            return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
        });
    }

    const root = path.resolve(__dirname, '..', '..');
    const files = [...sources(path.join(root, 'core')), ...sources(path.join(root, 'adapters')), ...sources(path.join(root, 'shared')), path.join(root, 'extension.ts')];
    const NETWORK_IMPORT = /from\s+'(?:node:)?(?:http|https|net|tls|http2|dgram|dns)'|require\('(?:node:)?(?:http|https|net|tls|http2|dgram|dns)'\)/;
    const FETCH_CALL = /\bfetch\(/;

    it('only fetchReleaseHttp.ts calls fetch or imports a network module, outside the webview bundle', () => {
        const users = files.filter((file) => {
            const text = readFileSync(file, 'utf8');
            return NETWORK_IMPORT.test(text) || FETCH_CALL.test(text);
        });
        expect(users.map((file) => path.relative(root, file).split(path.sep).join('/'))).toEqual(['adapters/node/fetchReleaseHttp.ts']);
    });

    it('negative control: the scan finds the adapter by both patterns', () => {
        const text = readFileSync(path.join(root, 'adapters', 'node', 'fetchReleaseHttp.ts'), 'utf8');
        expect(FETCH_CALL.test(text)).toBe(true);
        expect(NETWORK_IMPORT.test("import * as http from 'node:http';")).toBe(true);
        expect(NETWORK_IMPORT.test("import * as path from 'node:path';")).toBe(false);
    });
});
