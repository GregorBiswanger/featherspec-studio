import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { differingAreas, missingTests, mochaTitles, protocolVersionOf, vitestInventory } from './sharedGuard.mjs';

const root = path.resolve('/repo');
const keep = { file: 'src/core/specs/readProject.test.ts', title: 'AC-006 reads the project' };
const other = { file: 'src/core/specs/readSnapshot.test.ts', title: 'AC-006 reads the snapshot' };

test('AC-006 identical test inventories have no missing tests', () => {
    assert.deepEqual(missingTests([keep, other], [keep, other]), []);
});

test('AC-006 a test of the start that the head lacks is reported by file and title', () => {
    assert.deepEqual(missingTests([keep, other], [keep]), [other]);
});

test('AC-006 negative control: the same title in another file is reported as missing', () => {
    assert.deepEqual(missingTests([keep], [{ ...keep, file: 'src/core/specs/moved.test.ts' }]), [keep]);
});

test('AC-006 tests that the head adds are not reported', () => {
    assert.deepEqual(missingTests([keep], [keep, other]), []);
});

test('AC-039 vitest entries become root-relative keys with forward slashes', () => {
    const json = JSON.stringify([
        { name: 'AC-006 reads the project', file: path.join(root, 'src', 'core', 'specs', 'readProject.test.ts'), projectName: 'node' },
    ]);
    assert.deepEqual(vitestInventory(json, root), [keep]);
});

test('AC-039 mocha titles of suite, test and it calls are read from the source', () => {
    const source = "suite('FeatherSpec Studio smoke', function () {\n  test('AC-001: the board shows', async () => {});\n  it('AC-002: the tree shows', () => {});\n});";
    assert.deepEqual(mochaTitles(source), ['FeatherSpec Studio smoke', 'AC-001: the board shows', 'AC-002: the tree shows']);
});

test('AC-039 negative control: a source without test calls has no mocha titles', () => {
    assert.deepEqual(mochaTitles("export const split = (text) => text.split(',');"), []);
});

test('AC-039 differing area texts are reported by name', () => {
    assert.deepEqual(
        differingAreas({ 'tip-splitter board': 'Board', 'tip-splitter detail 0001': 'One' }, { 'tip-splitter board': 'Board', 'tip-splitter detail 0001': 'Uno' }),
        ['tip-splitter detail 0001'],
    );
});

test('AC-039 negative control: identical area texts report nothing', () => {
    assert.deepEqual(differingAreas({ 'tip-splitter board': 'Board' }, { 'tip-splitter board': 'Board' }), []);
});

test('AC-039 an area rendered on one side only is reported', () => {
    assert.deepEqual(differingAreas({ 'tip-splitter board': 'Board' }, {}), ['tip-splitter board']);
});

const repoFile = (...parts) => readFileSync(path.resolve(import.meta.dirname, '..', '..', ...parts), 'utf8');
const workflow = repoFile('.github', 'workflows', 'jetbrains.yml');
const jobBlock = (name) => {
    const start = workflow.indexOf(`\n  ${name}:`);
    assert.ok(start >= 0, `job ${name} exists`);
    const next = workflow.slice(start + 1).search(/\n  [a-z-]+:\n/);
    return next < 0 ? workflow.slice(start) : workflow.slice(start, start + 1 + next);
};

test('0035 AC-026 the start commit of the workflow is the plan baseline, in full', () => {
    const plan = repoFile('.specs', 'active', '0035-send-and-copy-for-each-assistant-in-jetbrains.plan.md');
    const baseline = /\*\*Baseline:\*\* `?([0-9a-f]{40})`?/.exec(plan)?.[1];
    assert.ok(baseline, 'the plan names its baseline as a full hash');
    assert.equal(/^  START_COMMIT: ([0-9a-f]{40})$/m.exec(workflow)?.[1], baseline);
});

test('0035 AC-026 the shared-guard diff keeps the baselines, the golden file, ci.yml and publish.yml, and no longer lists src/core', () => {
    const line = jobBlock('shared-guard').split('\n').find((text) => text.includes('git diff --exit-code'));
    assert.ok(line, 'the shared-guard job has its git diff line');
    const paths = line.split(' -- ')[1].trim().split(/\s+/);
    assert.deepEqual(paths, ['test/fixtures/next-step-baseline', 'test/fixtures/read-baseline', 'src/core/setup/mergePrompt.golden.txt', '.github/workflows/ci.yml', '.github/workflows/publish.yml']);
    assert.ok(!paths.includes('src/core'));
});

test('0035 AC-026 negative control: the old line named src/core as a path of its own', () => {
    const old = 'git diff --exit-code X -- src/core test/fixtures/next-step-baseline src/core/setup/mergePrompt.golden.txt';
    assert.ok(old.split(' -- ')[1].split(/\s+/).includes('src/core'));
});

test('0035 AC-026 the shared-guard job still runs the test inventory and the rendered texts against the start commit', () => {
    const block = jobBlock('shared-guard');
    assert.ok(block.includes('node jetbrains/guards/sharedGuard.mjs "${{ runner.temp }}/start" .'));
    assert.ok(block.includes('node jetbrains/guards/renderedTexts.mjs "${{ runner.temp }}/start" .'));
    assert.ok(block.includes('"${{ env.START_COMMIT }}"'));
});

test('0035 AC-026 vscode-guards keeps comparing ci.yml and publish.yml with the start commit', () => {
    assert.ok(jobBlock('vscode-guards').includes('git diff --exit-code $START_COMMIT -- .github/workflows/ci.yml .github/workflows/publish.yml'));
});

test('0035 T-008 the protocol version is read from the envelope source of each side', () => {
    assert.equal(protocolVersionOf('export const PROTOCOL_VERSION = 11;\n\nexport type JsonValue = null;'), 11);
    assert.equal(protocolVersionOf('export const PROTOCOL_VERSION = 12;\n'), 12);
});

test('0035 T-008 negative control: a source without the constant gives no version', () => {
    assert.equal(protocolVersionOf('export const OTHER = 12;'), undefined);
});
