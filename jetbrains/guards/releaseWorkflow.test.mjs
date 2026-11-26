import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
    RELEASE_FILE,
    checkJob,
    checkOtherWorkflows,
    checkReleaseWorkflow,
    checkSecrets,
    checkSteps,
    checkTriggers,
    readWorkflows,
    splitSteps,
    unchangedAgainstStart,
} from './releaseWorkflow.mjs';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const real = readFileSync(new URL(`../../.github/workflows/${RELEASE_FILE}`, import.meta.url), 'utf8');

const without = (text, pattern) => {
    assert.ok(pattern.test(text), `fixture lacks ${pattern}`);
    return text.replace(pattern, '');
};

test('AC-001 to AC-006 the release workflow passes every check', () => {
    assert.deepEqual(checkReleaseWorkflow(real), []);
});

test('AC-001 only workflow_dispatch triggers, with mode and confirm', () => {
    assert.deepEqual(checkTriggers(real), []);
    assert.ok(checkTriggers(real.replace('on:\n  workflow_dispatch:', 'on:\n  push:\n    tags: [x]\n  workflow_dispatch:')).length > 0);
    assert.ok(checkTriggers(real.replace('workflow_dispatch:', 'workflow_call:')).length > 0);
    assert.ok(checkTriggers(real.replace(/ {6}confirm:/, '      confirmed:')).length > 0);
    assert.ok(checkTriggers(real.replace('          - publish\n', '')).length > 0);
    assert.ok(checkTriggers(`${real}\n  uses: ./.github/workflows/ci.yml\n`).length > 0);
});

test('AC-002 and AC-004 the job needs confirm, the environment and contents: read', () => {
    assert.deepEqual(checkJob(real), []);
    assert.ok(checkJob(without(real, /^ {4}if: inputs\.confirm == 'publish'\n/m)).length > 0);
    assert.ok(checkJob(without(real, /^ {4}environment: jetbrains-marketplace\n/m)).length > 0);
    assert.ok(checkJob(real.replace('contents: read', 'contents: write')).length > 0);
    assert.ok(checkJob(real.replace('jobs:\n  release:', 'jobs:\n  other:\n    runs-on: x\n  release:')).length > 0);
});

test('AC-003 the ref check names ref and version and comes before Gradle', () => {
    assert.deepEqual(checkSteps(real), []);
    assert.ok(checkSteps(without(real, /\bexit 1\b/g)).some((p) => p.includes('ref')));
    assert.ok(checkSteps(real.replace(/::error::The run's ref is '\$REF'; it must be 'refs\/tags\/jetbrains-v\$version' for the plugin version \$version\./, '::error::bad')).length > 0);
    const steps = splitSteps(real);
    const refIndex = steps.findIndex((step) => step.includes('refs/tags/jetbrains-v'));
    const moved = [...steps.slice(0, refIndex), ...steps.slice(refIndex + 1)];
    moved.splice(moved.findIndex((step) => /buildPlugin/.test(step)) + 1, 0, steps[refIndex]);
    const head = real.slice(0, real.indexOf('    steps:\n') + '    steps:\n'.length);
    assert.ok(checkSteps(head + moved.join('\n') + '\n').some((p) => p.includes('before the first Gradle')));
});

test('AC-005 the steps run in the order of the spec and swapping two is reported', () => {
    const steps = splitSteps(real);
    const a = steps.findIndex((step) => /run: .*\bsignPlugin\b/.test(step));
    const b = steps.findIndex((step) => /run: .*\bverifyPluginSignature\b/.test(step));
    const swapped = [...steps];
    [swapped[a], swapped[b]] = [swapped[b], swapped[a]];
    const head = real.slice(0, real.indexOf('    steps:\n') + '    steps:\n'.length);
    assert.ok(checkSteps(head + swapped.join('\n') + '\n').some((p) => p.includes('order')));
    assert.ok(checkSteps(without(real, /      - name: Check the signed plugin ZIP\n.*\n/)).some((p) => p.includes('zipGuard')));
    assert.ok(checkSteps(real.replace('name: plugin-zip-signed', 'name: plugin-zip')).some((p) => p.includes('upload')));
});

test('AC-005 and AC-006 publishPlugin is the last step and only in mode publish', () => {
    assert.ok(checkSteps(without(real, /^ {8}if: inputs\.mode == 'publish'\n/m)).some((p) => p.includes('publishPlugin')));
    assert.ok(checkSteps(`${real}      - run: echo done\n`).some((p) => p.includes('last')));
    assert.ok(checkSteps(real.replace('run: gradle -p jetbrains --no-configuration-cache signPlugin', 'run: gradle -p jetbrains --no-configuration-cache signPlugin publishPlugin')).length > 0);
});

test('AC-004 secrets are only the four, mapped by env, to their own steps', () => {
    assert.deepEqual(checkSecrets(real), []);
    assert.ok(checkSecrets(real.replace('secrets.PUBLISH_TOKEN', 'secrets.OTHER_TOKEN').replace('PUBLISH_TOKEN:', 'OTHER_TOKEN:')).length > 0);
    assert.ok(checkSecrets(`${real}        run: echo "\${{ secrets.PRIVATE_KEY }}"\n`).length > 0);
    assert.ok(checkSecrets(real.replace('run: gradle -p jetbrains --no-configuration-cache verifyPluginSignature', 'run: echo $PRIVATE_KEY_PASSWORD; gradle -p jetbrains verifyPluginSignature')).length > 0);
    const leaked = real.replace(
        '        run: gradle -p jetbrains --no-configuration-cache verifyPluginSignature',
        '          PUBLISH_TOKEN: ${{ secrets.PUBLISH_TOKEN }}\n        run: gradle -p jetbrains --no-configuration-cache verifyPluginSignature',
    );
    assert.ok(checkSecrets(leaked).some((p) => p.includes('PUBLISH_TOKEN')));
    assert.ok(checkSecrets(without(real, /^ {10}PRIVATE_KEY_PASSWORD: .*\n/m)).length > 0);
    assert.ok(checkSecrets(`${real}\nenv2: set -x\n`).length > 0);
});

test('AC-004 no other workflow names a secret of the release', () => {
    const files = readWorkflows(repoRoot);
    assert.ok(files.some(({ name }) => name === 'jetbrains.yml'));
    assert.deepEqual(checkOtherWorkflows(files), []);
    assert.ok(checkOtherWorkflows([...files, { name: 'x.yml', text: 'a: ${{ secrets.PUBLISH_TOKEN }}' }]).length > 0);
    assert.ok(checkOtherWorkflows([{ name: 'jetbrains.yml', text: 'PRIVATE_KEY' }]).length > 0);
});

test('AC-007 ci.yml and publish.yml equal the start commit', (t) => {
    const result = unchangedAgainstStart(repoRoot);
    if (result === null) {
        t.skip('start commit not in this clone');
        return;
    }
    assert.equal(result, true);
});
