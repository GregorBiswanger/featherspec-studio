import { promises as fs, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import type { DiscoveredFolder } from '../../core/discovery/discoverWorkspace';
import type { ReleaseArchivePort } from '../../core/ports/releaseArchive';
import type { SetupUiPort } from '../../core/ports/setupUi';
import { createTempDirectories } from '../../core/runtime/testing/tempDirectories';
import { checkRelease, type ReleaseFile } from '../../core/setup/releaseArchive';
import { createSetupService } from '../../core/setup/setupService';
import { loadRealRelease } from '../../core/setup/testing/realRelease';
import { createFetchReleaseHttp } from './fetchReleaseHttp';
import { createNodeSetupTarget } from './nodeSetupTarget';
import { createSystemClock } from './systemClock';
import { createTarGzArchive } from './tarGzArchive';

const OPT_IN = 'FEATHERSPEC_SETUP_LIVE';
const LIVE_LIMIT_MS = 120_000;
const live = process.env[OPT_IN] === '1';
const directories = createTempDirectories();

afterEach(async () => {
    await directories.removeAll();
});

const enc = (text: string) => new TextEncoder().encode(text);

function studioVersion(): string {
    const manifest = JSON.parse(readFileSync(path.resolve(__dirname, '..', '..', '..', 'package.json'), 'utf8')) as { version: string };
    return manifest.version;
}

async function tree(dir: string): Promise<string[]> {
    const names: string[] = [];
    async function walk(current: string): Promise<void> {
        for (const entry of await fs.readdir(current, { withFileTypes: true })) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
                await walk(full);
            } else {
                names.push(path.relative(dir, full).split(path.sep).join('/'));
            }
        }
    }
    await walk(dir);
    return names.sort();
}

function onDisk(dir: string, releasePath: string): string {
    return path.join(dir, ...releasePath.split('/'));
}

interface LiveRun {
    notices: string[];
    block: string[];
    release: { version: string; files: readonly ReleaseFile[] };
    elapsedMs: number;
}

async function runLiveSetup(dir: string, verdict: DiscoveredFolder['verdict']): Promise<LiveRun> {
    const root = pathToFileURL(dir).href;
    const name = path.basename(dir);
    const folder: DiscoveredFolder = {
        root,
        name,
        displayPath: fileURLToPath(root),
        verdict,
        legacy: false,
        version: 'unknown',
        missingMarkers: [],
        diagnostics: [],
        readError: undefined,
    };
    const realArchive = createTarGzArchive();
    const received: Uint8Array[] = [];
    const archive: ReleaseArchivePort = {
        read(bytes, maxUnpackedBytes) {
            received.push(bytes);
            return realArchive.read(bytes, maxUnpackedBytes);
        },
    };
    const notices: string[] = [];
    const blocks: string[][] = [];
    const ui: SetupUiPort = {
        pickTarget: async (items) => items[0]?.root,
        confirm: async () => true,
        withProgress: async (_title, task) => task(new AbortController().signal),
        notify: async (message) => {
            notices.push(message);
            return undefined;
        },
        copy: async () => undefined,
    };
    const service = createSetupService({
        trust: { isTrusted: () => true, onDidGrant: () => ({ dispose: () => undefined }) },
        folders: { list: () => [{ root, name }], onDidChange: () => ({ dispose: () => undefined }) },
        discovery: { snapshot: () => ({ result: { folders: [folder] } }), refresh: async () => undefined },
        http: createFetchReleaseHttp(),
        archive,
        target: createNodeSetupTarget(),
        ui,
        clock: createSystemClock(),
        output: { appendBlock: (lines) => void blocks.push([...lines]) },
        actions: { manageTrust: async () => undefined, showOutput: () => undefined, openSetupGuide: async () => undefined },
        studioVersion: studioVersion(),
    });
    const started = Date.now();
    await service.start();
    await service.whenIdle();
    const elapsedMs = Date.now() - started;
    expect(blocks, `one Output block, notices: ${JSON.stringify(notices)}`).toHaveLength(1);
    const bytes = received[0];
    expect(bytes, 'the archive was handed to the reader').toBeDefined();
    const checked = await checkRelease(createTarGzArchive(), bytes as Uint8Array);
    if (!checked.ok) {
        throw new Error(`the live release is refused: ${checked.reason}`);
    }
    return { notices, block: blocks[0] as string[], release: { version: checked.version, files: checked.files }, elapsedMs };
}

function field(block: readonly string[], name: string): string | undefined {
    return block.find((line) => line.startsWith(`${name}: `))?.slice(name.length + 2);
}

function count(block: readonly string[], group: string): number {
    return Number(field(block, group) ?? '0');
}

function summary(label: string, run: LiveRun): void {
    console.log(
        `[${OPT_IN}] ${label}: version ${field(run.block, 'version') ?? '?'}, tag ${field(run.block, 'tag') ?? '?'}, taken ${run.release.files.length}, created ${count(run.block, 'created')}, completed ${count(run.block, 'completed')}, kept ${count(run.block, 'kept')}, ${run.elapsedMs} ms`,
    );
}

describe.runIf(live)(`0014 live setup against the real GitHub release (opt-in: ${OPT_IN}=1)`, () => {
    it(
        'an empty folder gets every taken file with the archive bytes and nothing else; a second run writes nothing',
        async () => {
            const dir = path.join(await directories.make('fs-setup-live-'), 'empty-project');
            await fs.mkdir(dir);
            const first = await runLiveSetup(dir, 'not-a-project');
            summary('empty folder', first);
            const version = field(first.block, 'version');
            expect(field(first.block, 'outcome')).toBe('set up');
            expect(first.notices).toEqual([`FeatherSpec ${version} is set up in empty-project. Open the AI assistant of your choice and run /sdd-setup.`]);
            expect(version).toBe(first.release.version);
            expect(await tree(dir)).toEqual(first.release.files.map((file) => file.path).sort());
            expect(count(first.block, 'created')).toBe(first.release.files.length);
            for (const file of first.release.files) {
                expect([...(await fs.readFile(onDisk(dir, file.path)))], file.path).toEqual([...file.bytes]);
            }
            const agents = await fs.readFile(path.join(dir, 'AGENTS.md'), 'utf8');
            expect(/^FeatherSpecVersion:\s*([^\s#]+)/m.exec(agents)?.[1]).toBe(version);
            expect(await fs.stat(path.join(dir, '.featherspec-setup')).then(() => true, () => false)).toBe(false);

            if (version === '1.10.0') {
                const fixture = await loadRealRelease();
                expect(first.release.files.map((file) => file.path).sort()).toEqual(fixture.files.map((file) => file.path).sort());
                for (const file of fixture.files) {
                    expect([...(await fs.readFile(onDisk(dir, file.path)))], `fixture ${file.path}`).toEqual([...file.bytes]);
                }
            }

            const before = await Promise.all((await tree(dir)).map(async (name) => [name, (await fs.stat(onDisk(dir, name))).mtimeMs] as const));
            const second = await runLiveSetup(dir, 'not-a-project');
            summary('second run, same folder', second);
            expect(field(second.block, 'outcome')).toBe('set up');
            expect(count(second.block, 'created') + count(second.block, 'completed') + count(second.block, 'kept')).toBe(0);
            const after = await Promise.all(before.map(async ([name]) => [name, (await fs.stat(onDisk(dir, name))).mtimeMs] as const));
            expect(after).toEqual(before);
            expect(await tree(dir)).toEqual(before.map(([name]) => name));
        },
        LIVE_LIMIT_MS,
    );

    it(
        'a folder with its own AGENTS.md (CRLF), .gitignore and .vscode/settings.json keeps them, gets the completions and the parked AGENTS.md',
        async () => {
            const dir = path.join(await directories.make('fs-setup-live-'), 'own-files');
            await fs.mkdir(path.join(dir, '.vscode'), { recursive: true });
            const ownAgents = enc('# My project\r\n\r\nHand-written rules for my agents.\r\n');
            const ownGitignore = enc('node_modules/\ndist/\n');
            const ownSettings = enc('{\r\n\t// my editor\r\n\t"editor.tabSize": 2\r\n}\r\n');
            await fs.writeFile(path.join(dir, 'AGENTS.md'), ownAgents);
            await fs.writeFile(path.join(dir, '.gitignore'), ownGitignore);
            await fs.writeFile(path.join(dir, '.vscode', 'settings.json'), ownSettings);

            const run = await runLiveSetup(dir, 'incomplete');
            summary('own files', run);
            const version = field(run.block, 'version');
            expect(field(run.block, 'outcome')).toBe('set up');
            expect(run.notices).toEqual([`FeatherSpec ${version} files were added to own-files. 1 existing file was kept: merge them with your AI assistant, then run /sdd-setup.`]);

            expect([...(await fs.readFile(path.join(dir, 'AGENTS.md')))]).toEqual([...ownAgents]);
            const releaseAgents = run.release.files.find((file) => file.path === 'AGENTS.md');
            expect([...(await fs.readFile(path.join(dir, '.featherspec-setup', 'AGENTS.md')))]).toEqual([...(releaseAgents?.bytes ?? [])]);
            expect(await fs.readFile(path.join(dir, '.featherspec-setup', '.gitignore'), 'utf8')).toBe('*\n');
            expect((await tree(dir)).filter((name) => name.startsWith('.featherspec-setup/'))).toEqual(['.featherspec-setup/.gitignore', '.featherspec-setup/AGENTS.md']);

            const gitignore = await fs.readFile(path.join(dir, '.gitignore'));
            expect([...gitignore.subarray(0, ownGitignore.length)]).toEqual([...ownGitignore]);
            const releaseGitignore = new TextDecoder().decode(run.release.files.find((file) => file.path === '.gitignore')?.bytes);
            const gitignoreLines = new Set(gitignore.toString('utf8').split('\n').map((line) => line.trimEnd()));
            for (const line of releaseGitignore.split('\n').map((each) => each.trimEnd())) {
                if (line !== '' && !line.startsWith('#')) {
                    expect(gitignoreLines.has(line), `.gitignore gets ${line}`).toBe(true);
                }
            }

            const settings = await fs.readFile(path.join(dir, '.vscode', 'settings.json'), 'utf8');
            expect(settings.startsWith('{\r\n\t// my editor\r\n\t"editor.tabSize": 2,\r\n')).toBe(true);
            const releaseSettings = JSON.parse(new TextDecoder().decode(run.release.files.find((file) => file.path === '.vscode/settings.json')?.bytes)) as Record<string, unknown>;
            for (const key of Object.keys(releaseSettings)) {
                expect(settings.includes(JSON.stringify(key)), `settings.json gets ${key}`).toBe(true);
            }
            expect(field(run.block, 'completed')).toBe('2');
            expect(run.block).toEqual(expect.arrayContaining(['  .gitignore', '  .vscode/settings.json']));
            expect(count(run.block, 'created')).toBe(run.release.files.length - 3);
        },
        LIVE_LIMIT_MS,
    );
});
