import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const script = path.join(here, 'conformanceExpected.mjs');
const fixturesRoot = path.join(repo, 'test', 'fixtures');
const golden = path.join(repo, 'src', 'core', 'setup', 'mergePrompt.golden.txt');
const archive = path.join(fixturesRoot, 'setup', 'featherspec-1.10.0.tar.gz');
const SKIPPED = new Set(['next-step-baseline', 'read-baseline', 'setup']);
const fixtures = fs
    .readdirSync(fixturesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !SKIPPED.has(entry.name))
    .map((entry) => entry.name)
    .sort();
const names = [...fixtures, 'gen-200'];

let outDir;

before(() => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conformance-expected-test-'));
    execFileSync(process.execPath, [script, outDir], { stdio: 'pipe', timeout: 900_000 });
}, { timeout: 900_000 });

after(() => {
    if (outDir !== undefined) {
        fs.rmSync(outDir, { recursive: true, force: true });
    }
});

test('AC-004 writes one input and one expected file per fixture and for gen-200', () => {
    for (const name of names) {
        assert.ok(fs.existsSync(path.join(outDir, 'inputs', `${name}.json`)), `input ${name}`);
        assert.ok(fs.existsSync(path.join(outDir, 'expected', `${name}.json`)), `expected ${name}`);
    }
});

test('AC-004 every input is {files, version} and every expected file is JSON text', () => {
    for (const name of names) {
        const input = JSON.parse(fs.readFileSync(path.join(outDir, 'inputs', `${name}.json`), 'utf8'));
        assert.equal(typeof input.version, 'string', `version ${name}`);
        assert.equal(typeof input.files, 'object', `files ${name}`);
        assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(outDir, 'expected', `${name}.json`), 'utf8')), name);
    }
});

test('AC-005 the setup input is the JSON string of the base64 archive and the setup expected has the golden merge prompt', () => {
    const setupInput = JSON.parse(fs.readFileSync(path.join(outDir, 'inputs', 'setup-input.json'), 'utf8'));
    assert.equal(setupInput, fs.readFileSync(archive).toString('base64'));
    const setupExpected = JSON.parse(fs.readFileSync(path.join(outDir, 'expected', 'setup-expected.json'), 'utf8'));
    assert.equal(setupExpected.mergePrompt, fs.readFileSync(golden, 'utf8'));
});

test('AC-004 the weak inputs carry the synthetic AGENTS.md and every FeatherSpec output has board and overview', () => {
    const synthetic = fs.readFileSync(path.join(fixturesRoot, 'fs-version-1110', 'AGENTS.md')).toString('base64');
    for (const name of ['gen-200', 'repo-8052f9a', 'repo-f9cadb4']) {
        const input = JSON.parse(fs.readFileSync(path.join(outDir, 'inputs', `${name}.json`), 'utf8'));
        assert.equal(input.files['AGENTS.md'], synthetic, name);
        const expected = JSON.parse(fs.readFileSync(path.join(outDir, 'expected', `${name}.json`), 'utf8'));
        assert.ok(expected.board && expected.overview && expected.planSpecs, name);
        assert.ok(Object.keys(expected.details).length > 0, name);
    }
    const expected = JSON.parse(fs.readFileSync(path.join(outDir, 'expected', 'fs-version-1110.json'), 'utf8'));
    assert.ok(expected.board && expected.overview, 'fs-version-1110');
});

test('AC-005 archive-expected.json lists every entry of the setup archive with kind, size and sha256', () => {
    const expected = JSON.parse(fs.readFileSync(path.join(outDir, 'archive-expected.json'), 'utf8'));
    assert.equal(expected.maxUnpackedBytes, 20 * 1024 * 1024);
    const kinds = {};
    for (const entry of expected.entries) {
        kinds[entry.kind] = (kinds[entry.kind] ?? 0) + 1;
        assert.equal(typeof entry.path, 'string');
        assert.equal(typeof entry.size, 'number');
        assert.match(entry.sha256, /^[0-9a-f]{64}$/);
    }
    assert.deepEqual(kinds, { directory: 16, file: 67, metadata: 1 });
    assert.equal(expected.entries[0].kind, 'metadata');
});
