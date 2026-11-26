import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkGitignore, checkGradle, checkVerifierMatrix, findKeyBlocks, trackedFiles } from './releaseConfig.mjs';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8');
const gradle = read('jetbrains/build.gradle.kts');

test('AC-009 the Gradle file passes: signing and token from the environment, channel, failure levels', () => {
    assert.deepEqual(checkGradle(gradle), []);
});

test('AC-009 negative controls on edited copies of the Gradle file', () => {
    assert.ok(checkGradle(gradle.replace('providers.environmentVariable("PRIVATE_KEY_PASSWORD")', '"hunter2"')).length > 0);
    assert.ok(checkGradle(gradle.replace('providers.environmentVariable("PUBLISH_TOKEN")', 'providers.gradleProperty("token")')).length > 0);
    assert.ok(checkGradle(gradle.replace('hidden = false', 'hidden = true')).length > 0);
    assert.ok(checkGradle(gradle.replace('listOf("default")', 'listOf("eap")')).length > 0);
    assert.ok(checkGradle(gradle.replace('            VerifyPluginTask.FailureLevel.INTERNAL_API_USAGES,\n', '')).length > 0);
    assert.ok(checkGradle(gradle.replace('            VerifyPluginTask.FailureLevel.INVALID_PLUGIN,\n', '            VerifyPluginTask.FailureLevel.EXPERIMENTAL_API_USAGES,\n')).length > 0);
    assert.ok(checkGradle(gradle.replace('version = "0.1.0"', 'version = "0.2.0"')).length > 0);
    assert.ok(checkGradle(gradle.replace('sinceBuild = "253.29346"', 'sinceBuild = "253.1"')).length > 0);
    assert.ok(checkGradle(gradle.replace('untilBuild = provider { null }', 'untilBuild = "263.*"')).length > 0);
    assert.ok(checkGradle(gradle.replace('    "goland" to IntelliJPlatformType.GoLand,\n', '')).length > 0);
    assert.ok(checkGradle(`${gradle}\n// PRIVATE_KEY = "x"\n`).length > 0);
});

test('AC-012 every verifier product of the Gradle file is a job of jetbrains.yml and the reverse', () => {
    const workflow = read('.github/workflows/jetbrains.yml');
    assert.deepEqual(checkVerifierMatrix(workflow), []);
    assert.ok(checkVerifierMatrix(workflow.replace('rustrover, ', '').replace(', rustrover', '')).some((p) => p.includes('rustrover')));
    assert.ok(checkVerifierMatrix(workflow.replace('recommended]', 'recommended, eap]')).some((p) => p.includes('eap')));
    assert.ok(checkVerifierMatrix('jobs: {}').length > 0);
});

test('AC-009 .gitignore excludes the key and certificate files', () => {
    assert.deepEqual(checkGitignore(read('.gitignore')), []);
    assert.equal(checkGitignore(read('.gitignore').replace('*.pfx', '')).length, 1);
    assert.equal(checkGitignore('').length, 5);
});

test('AC-009 no tracked file holds a PEM block', () => {
    assert.deepEqual(findKeyBlocks(trackedFiles(repoRoot)), []);
    const block = ['-----BEGIN', 'ENCRYPTED PRIVATE KEY-----'].join(' ');
    assert.deepEqual(findKeyBlocks([{ path: 'x.txt', text: `a\n${block}\n` }]), ['PEM block in x.txt:2']);
});

test('AC-009 git would ignore a key file', () => {
    for (const name of ['a.pem', 'b.crt', 'c.key', 'd.p12', 'e.pfx']) {
        assert.doesNotThrow(() => execFileSync('git', ['check-ignore', '-q', name], { cwd: repoRoot }), name);
    }
});
