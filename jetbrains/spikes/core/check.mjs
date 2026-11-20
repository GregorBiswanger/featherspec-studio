import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as vm from 'node:vm';
import * as esbuild from 'esbuild';
import { buildCoreSpike } from './build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..', '..');
const fixturesRoot = path.join(repo, 'test', 'fixtures');
const outRoot = path.join(here, '..', 'build');
const SKIPPED = new Set(['next-step-baseline', 'read-baseline', 'setup']);
const DEFAULT_VERSION = '1.10.0';

function versionOf(root) {
    const agents = path.join(root, 'AGENTS.md');
    if (!fs.existsSync(agents)) {
        return DEFAULT_VERSION;
    }
    const match = /FeatherSpecVersion:\s*([^\s#]+)/.exec(fs.readFileSync(agents, 'utf8'));
    return match ? match[1] : DEFAULT_VERSION;
}

function collectFiles(root) {
    const files = {};
    const visit = (directory) => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
            const full = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                visit(full);
            } else if (entry.isFile()) {
                files[path.relative(root, full).split(path.sep).join('/')] = fs.readFileSync(full).toString('base64');
            } else {
                throw new Error(`unsupported entry: ${full}`);
            }
        }
    };
    visit(root);
    return files;
}

async function generatedProject(tmp) {
    const bundle = path.join(tmp, 'generateProject.mjs');
    await esbuild.build({
        entryPoints: [path.join(repo, 'src', 'core', 'specs', 'testing', 'generateProject.ts')],
        outfile: bundle,
        bundle: true,
        platform: 'node',
        format: 'esm',
        logLevel: 'silent',
    });
    const { generateProject } = await import(pathToFileURL(bundle).href);
    const root = path.join(tmp, 'generated-200');
    fs.mkdirSync(root);
    await generateProject(root, 200);
    return root;
}

function targetsOf(tmp, generated) {
    const fixtures = fs
        .readdirSync(fixturesRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !SKIPPED.has(entry.name))
        .map((entry) => ({ name: entry.name, root: path.join(fixturesRoot, entry.name) }))
        .sort((a, b) => (a.name < b.name ? -1 : 1));
    return [...fixtures, { name: 'generated-200', root: generated }];
}

function runBare(bundle, filesJson, version) {
    const context = vm.createContext({});
    new vm.Script(bundle).runInContext(context);
    return context.FeatherSpecSpike.run(filesJson, version);
}

function firstDifference(left, right) {
    let index = 0;
    while (index < left.length && index < right.length && left[index] === right[index]) {
        index++;
    }
    return index;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'core-spike-'));
const bundleFile = await buildCoreSpike();
const bundle = fs.readFileSync(bundleFile, 'utf8');
vm.runInThisContext(bundle);
const mainRun = globalThis.FeatherSpecSpike.run;

const targets = targetsOf(tmp, await generatedProject(tmp));
const expectedDir = path.join(outRoot, 'node-expected');
const inputDir = path.join(outRoot, 'inputs');
fs.mkdirSync(expectedDir, { recursive: true });
fs.mkdirSync(inputDir, { recursive: true });

let identical = 0;
for (const target of targets) {
    const version = versionOf(target.root);
    const filesJson = JSON.stringify(collectFiles(target.root));
    fs.writeFileSync(path.join(inputDir, `${target.name}.json`), JSON.stringify({ version, files: JSON.parse(filesJson) }));
    const bare = await runBare(bundle, filesJson, version);
    const expected = await mainRun(filesJson, version);
    if (bare !== expected) {
        const at = firstDifference(bare, expected);
        console.error(`not identical: ${target.name} at ${at}`);
        console.error(`bare:  ${bare.slice(Math.max(0, at - 60), at + 60)}`);
        console.error(`node:  ${expected.slice(Math.max(0, at - 60), at + 60)}`);
        process.exit(1);
    }
    fs.writeFileSync(path.join(expectedDir, `${target.name}.json`), expected);
    identical++;
}

console.log(`identical: ${identical}/${targets.length}`);
console.log(`bundle: ${Buffer.byteLength(bundle, 'utf8')} bytes`);
fs.rmSync(tmp, { recursive: true, force: true });
