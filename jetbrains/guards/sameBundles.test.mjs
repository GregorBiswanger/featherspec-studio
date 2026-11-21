import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUNDLE_PATHS, compareDigests, isJetBrainsOnly } from './sameBundles.mjs';

test('AC-038 a change confined to JetBrains paths is JetBrains-only', () => {
    assert.equal(
        isJetBrainsOnly(['jetbrains/build.gradle.kts', 'docs/jetbrains/parity.md', '.github/workflows/jetbrains.yml']),
        true,
    );
});

test('AC-038 negative control: one VS Code path makes the change not JetBrains-only', () => {
    assert.equal(isJetBrainsOnly(['jetbrains/build.gradle.kts', 'src/core/specs/readProject.ts']), false);
});

test('AC-038 a path that only shares the prefix text is not JetBrains-only', () => {
    assert.equal(isJetBrainsOnly(['jetbrains-notes/todo.md']), false);
});

test('AC-038 an empty change list is not JetBrains-only', () => {
    assert.equal(isJetBrainsOnly([]), false);
});

test('AC-039 the bundle paths are the three VS Code bundles of the .vsix', () => {
    assert.deepEqual(BUNDLE_PATHS, ['dist/extension.js', 'dist/webview/main.js', 'dist/webview/main.css']);
});

test('AC-039 identical digests have no differences', () => {
    const digests = { 'dist/extension.js': 'aa', 'dist/webview/main.js': 'bb' };
    assert.deepEqual(compareDigests(digests, { ...digests }), []);
});

test('AC-039 negative control: one changed digest is reported by name', () => {
    assert.deepEqual(
        compareDigests({ 'dist/extension.js': 'aa', 'dist/webview/main.js': 'bb' }, { 'dist/extension.js': 'aa', 'dist/webview/main.js': 'cc' }),
        ['dist/webview/main.js'],
    );
});

test('AC-039 negative control: a bundle missing on one side is reported', () => {
    assert.deepEqual(compareDigests({ 'dist/extension.js': 'aa' }, {}), ['dist/extension.js']);
});
