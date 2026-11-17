import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { createNodeFileSystem } from '../../adapters/node/nodeFileSystem';
import { createNodeSetupTarget } from '../../adapters/node/nodeSetupTarget';
import { createTarGzArchive } from '../../adapters/node/tarGzArchive';
import { releaseEntries, tarGz } from '../../adapters/node/testing/tarWriter';
import { discoverWorkspace } from '../discovery/discoverWorkspace';
import { fixturePath } from '../discovery/testing/fixtures';
import { createTempDirectories } from '../runtime/testing/tempDirectories';
import { archiveUrl } from './releaseDownload';
import { createSetupService } from './setupService';
import { reply, scriptedHttp, whenAborted } from './testing/scriptedHttp';
import { createSetupClock } from './testing/setupClock';
import { realReleaseBytes } from './testing/realRelease';
import { CODELOAD, LATEST, TAG_URL } from './testing/setupWorld';

const directories = createTempDirectories();

afterEach(async () => {
    await directories.removeAll();
});

async function snapshot(dir: string): Promise<string[]> {
    const lines: string[] = [];
    async function walk(current: string): Promise<void> {
        for (const entry of await fs.readdir(current, { withFileTypes: true })) {
            const full = path.join(current, entry.name);
            const relative = path.relative(dir, full).split(path.sep).join('/');
            if (entry.isDirectory()) {
                lines.push(`${relative}/`);
                await walk(full);
            } else {
                const stats = await fs.stat(full);
                lines.push(`${relative}|${stats.size}|${stats.mtimeMs}|${(await fs.readFile(full)).toString('hex')}`);
            }
        }
    }
    await walk(dir);
    return lines.sort();
}

async function copyFixture(name: string): Promise<{ dir: string; root: string }> {
    const dir = await directories.make('fs-setup-nowrite-');
    await fs.cp(fixturePath(name), dir, { recursive: true });
    return { dir, root: pathToFileURL(dir).href };
}

interface Scenario {
    trusted: boolean;
    routes: Parameters<typeof scriptedHttp>[0];
    pick?: boolean;
    confirm: boolean;
    cancel?: boolean;
}

const GOOD = {
    [LATEST]: reply(302, { location: TAG_URL }),
    [archiveUrl('v1.10.0')]: reply(302, { location: CODELOAD }),
    [CODELOAD]: reply(200, {}, [realReleaseBytes()]),
};

async function runScenario(fixtures: string[], scenario: Scenario): Promise<string[][]> {
    const copies: { dir: string; root: string }[] = [];
    for (const name of fixtures) {
        copies.push(await copyFixture(name));
    }
    const before = await Promise.all(copies.map((copy) => snapshot(copy.dir)));
    const discovered = await discoverWorkspace(createNodeFileSystem(), copies.map((copy, index) => ({ root: copy.dir, name: fixtures[index] ?? '' })), { sameRoot: (a, b) => a === b });
    const folders = discovered.folders.map((folder, index) => ({ ...folder, root: copies[index]?.root ?? folder.root }));
    let progress: AbortController | undefined;
    const service = createSetupService({
        trust: { isTrusted: () => scenario.trusted, onDidGrant: () => ({ dispose: () => undefined }) },
        folders: { list: () => folders.map((folder) => ({ root: folder.root, name: folder.name })), onDidChange: () => ({ dispose: () => undefined }) },
        discovery: { snapshot: () => ({ result: { folders } }), refresh: async () => undefined },
        http: scriptedHttp(scenario.routes),
        archive: createTarGzArchive(),
        target: createNodeSetupTarget(),
        ui: {
            pickTarget: async (items) => (scenario.pick === false ? undefined : items[0]?.root),
            confirm: async () => scenario.confirm,
            withProgress: async (_title, task) => {
                progress = new AbortController();
                if (scenario.cancel === true) {
                    queueMicrotask(() => progress?.abort());
                }
                return task(progress.signal);
            },
            notify: async () => undefined,
            copy: async () => undefined,
        },
        clock: createSetupClock(),
        output: { appendBlock: () => undefined },
        actions: { manageTrust: async () => undefined, showOutput: () => undefined, openSetupGuide: async () => undefined },
        studioVersion: '0.1.0',
    });
    await service.start();
    await service.whenIdle();
    const after = await Promise.all(copies.map((copy) => snapshot(copy.dir)));
    return before.map((lines, index) => (lines.join('\n') === (after[index] ?? []).join('\n') ? [] : [...lines, '---', ...(after[index] ?? [])]));
}

describe('0014 AC-005, AC-010: nothing is written before the confirmation, and a refusal writes nothing at all (temp copy of a fixture)', () => {
    it('distrust', async () => {
        expect(await runScenario(['not-fs-speckit'], { trusted: false, routes: GOOD, confirm: true })).toEqual([[]]);
    });

    it('a dismissed pick', async () => {
        expect(await runScenario(['not-fs-speckit', 'incomplete-agents-only'], { trusted: true, routes: GOOD, confirm: true, pick: false })).toEqual([[], []]);
    });

    it('a cancelled download', async () => {
        const routes = { [LATEST]: (request: { signal: AbortSignal }) => whenAborted(request.signal) };
        expect(await runScenario(['not-fs-speckit'], { trusted: true, routes, confirm: true, cancel: true })).toEqual([[]]);
    });

    it('a download failure', async () => {
        expect(await runScenario(['not-fs-speckit'], { trusted: true, routes: { [LATEST]: reply(500) }, confirm: true })).toEqual([[]]);
    });

    it('an archive that is refused', async () => {
        const hostile = tarGz(releaseEntries('top', '1.0.0', [{ path: 'top/../escape.txt', content: 'x' }]));
        const routes = { ...GOOD, [CODELOAD]: reply(200, {}, [hostile]) };
        expect(await runScenario(['not-fs-speckit'], { trusted: true, routes, confirm: true })).toEqual([[]]);
    });

    it('a cancelled confirmation', async () => {
        expect(await runScenario(['not-fs-speckit'], { trusted: true, routes: GOOD, confirm: false })).toEqual([[]]);
    });

    it('negative control: a confirmed setup does change the folder', async () => {
        const [changed] = await runScenario(['not-fs-speckit'], { trusted: true, routes: GOOD, confirm: true });
        expect(changed?.length).toBeGreaterThan(0);
        expect(changed?.join('\n')).toContain('AGENTS.md|');
    });

    it('negative control: a folder that is already a project is no target, so nothing happens even when confirmed', async () => {
        expect(await runScenario(['fs110-de-active-review'], { trusted: true, routes: GOOD, confirm: true })).toEqual([[]]);
    });
});
