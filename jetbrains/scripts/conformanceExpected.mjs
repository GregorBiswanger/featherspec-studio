import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const require = createRequire(import.meta.url);
const { embeddedBuildOptions } = require(path.join(repo, 'esbuild.js'));
const fixturesRoot = path.join(repo, 'test', 'fixtures');
const setupArchive = path.join(fixturesRoot, 'setup', 'featherspec-1.10.0.tar.gz');
const outRoot = path.resolve(process.argv[2] ?? path.join(repo, 'jetbrains', 'build', 'conformance'));
const inputsDir = path.join(outRoot, 'inputs');
const expectedDir = path.join(outRoot, 'expected');
const SKIPPED = new Set(['next-step-baseline', 'read-baseline', 'setup']);
const GEN_NAME = 'gen-200';
const GEN_COUNT = 200;

const HELPERS = `
export { generateProject } from ${JSON.stringify(path.join(repo, 'src', 'core', 'specs', 'testing', 'generateProject.ts'))};
export { createTarGzArchive } from ${JSON.stringify(path.join(repo, 'src', 'adapters', 'node', 'tarGzArchive.ts'))};
export { readVersionLine } from ${JSON.stringify(path.join(repo, 'src', 'core', 'discovery', 'versionLine.ts'))};
export { VERSION } from ${JSON.stringify(path.join(repo, 'src', 'core', 'lifecycle', 'testing', 'projects.ts'))};
`;

async function loadHelpers(tmp) {
    const outfile = path.join(tmp, 'helpers.mjs');
    await esbuild.build({
        stdin: { contents: HELPERS, resolveDir: repo, sourcefile: 'helpers-entry.ts', loader: 'ts' },
        bundle: true,
        platform: 'node',
        format: 'esm',
        outfile,
        logLevel: 'silent',
    });
    return import(pathToFileURL(outfile).href);
}

async function embeddedBundle() {
    const built = await esbuild.build({
        ...embeddedBuildOptions,
        minify: true,
        write: false,
        logLevel: 'silent',
        plugins: embeddedBuildOptions.plugins.filter((plugin) => plugin.name === 'embedded-path-shim'),
    });
    return built.outputFiles[0].text;
}

function collect(directory, prefix = '', files = {}) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
        const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            collect(full, relative, files);
        } else {
            files[relative] = fs.readFileSync(full).toString('base64');
        }
    }
    return files;
}

function wire(result) {
    if (result.ok) {
        return {
            ok: true,
            entries: result.entries.map((entry) => ({ path: entry.path, kind: entry.kind, bytes: Buffer.from(entry.bytes).toString('base64') })),
        };
    }
    return result.failure === 'unreadable' ? { ok: false, failure: 'unreadable', detail: result.detail } : { ok: false, failure: 'too-large' };
}

function openHost(bundle, archive) {
    const replies = new Map();
    const state = {};
    const onFrame = (frame) => {
        if (frame.k === 'reply') {
            const waiter = replies.get(frame.id);
            replies.delete(frame.id);
            if (waiter === undefined) {
                return;
            }
            if (frame.error !== undefined) {
                waiter.reject(new Error(frame.error));
            } else {
                waiter.resolve(frame.ok);
            }
        } else if (frame.k === 'call') {
            if (frame.name === 'archive.read') {
                const { bytes, maxUnpackedBytes } = frame.args;
                void archive
                    .read(Buffer.from(bytes, 'base64'), maxUnpackedBytes)
                    .then((result) => state.host.resolve(frame.id, JSON.stringify({ ok: wire(result) })));
            } else {
                state.host.resolve(frame.id, JSON.stringify({ error: `The conformance run cannot answer ${frame.name}.` }));
            }
        }
    };
    const context = vm.createContext({
        TextDecoder,
        TextEncoder,
        URL,
        AbortController,
        AbortSignal,
        setTimeout,
        clearTimeout,
        queueMicrotask,
        crypto: globalThis.crypto,
        console,
        __featherspecNative: (raw) => onFrame(JSON.parse(raw)),
    });
    vm.runInContext(bundle, context);
    state.host = context.FeatherSpecHost;
    return {
        host: state.host,
        waitFor(id) {
            return new Promise((resolve, reject) => replies.set(id, { resolve, reject }));
        },
    };
}

async function main() {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'conformance-expected-'));
    try {
        const { generateProject, createTarGzArchive, readVersionLine, VERSION } = await loadHelpers(tmp);
        const generated = path.join(tmp, GEN_NAME);
        fs.mkdirSync(generated);
        await generateProject(generated, GEN_COUNT);
        const targets = [
            ...fs
                .readdirSync(fixturesRoot, { withFileTypes: true })
                .filter((entry) => entry.isDirectory() && !SKIPPED.has(entry.name))
                .map((entry) => entry.name)
                .sort()
                .map((name) => ({ name, root: path.join(fixturesRoot, name) })),
            { name: GEN_NAME, root: generated },
        ];
        const versionOf = (root) => {
            const agents = path.join(root, 'AGENTS.md');
            return fs.existsSync(agents) ? readVersionLine(fs.readFileSync(agents, 'utf8')).version : VERSION;
        };
        fs.rmSync(inputsDir, { recursive: true, force: true });
        fs.rmSync(expectedDir, { recursive: true, force: true });
        fs.mkdirSync(inputsDir, { recursive: true });
        fs.mkdirSync(expectedDir, { recursive: true });
        const { host, waitFor } = openHost(await embeddedBundle(), createTarGzArchive());
        for (const target of targets) {
            const inputJson = JSON.stringify({ files: collect(target.root), version: versionOf(target.root) });
            fs.writeFileSync(path.join(inputsDir, `${target.name}.json`), inputJson);
            const reply = waitFor(target.name);
            host.conformance(target.name, inputJson);
            fs.writeFileSync(path.join(expectedDir, `${target.name}.json`), await reply);
        }
        const archiveJson = JSON.stringify(fs.readFileSync(setupArchive).toString('base64'));
        fs.writeFileSync(path.join(inputsDir, 'setup-input.json'), archiveJson);
        const setupReply = waitFor('setup');
        host.setupConformance('setup', archiveJson);
        fs.writeFileSync(path.join(expectedDir, 'setup-expected.json'), await setupReply);
        console.log(`conformance expected: ${targets.length} fixtures and the setup pair written to ${outRoot}`);
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
