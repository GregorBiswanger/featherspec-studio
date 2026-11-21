import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareFileLists, normaliseListing, runSelfTest } from './vsixFiles.mjs';

const snapshot = readFileSync(new URL('./vsix-files.txt', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line.length > 0);

test('AC-037 snapshot lists the 11 packaged paths of 3bc615c, sorted', () => {
    assert.equal(snapshot.length, 11);
    assert.deepEqual(snapshot, [...snapshot].sort());
});

test('AC-037 identical listings have no added and no missing paths', () => {
    assert.deepEqual(compareFileLists(['a.js', 'b.js'], ['a.js', 'b.js']), { added: [], missing: [] });
});

test('AC-037 a path only in the actual listing is reported as added', () => {
    assert.deepEqual(compareFileLists(['a.js', 'jetbrains/x.kt'], ['a.js']), { added: ['jetbrains/x.kt'], missing: [] });
});

test('AC-037 a path only in the expected listing is reported as missing', () => {
    assert.deepEqual(compareFileLists(['a.js'], ['a.js', 'b.js']), { added: [], missing: ['b.js'] });
});

test('AC-037 negative control: one removed and one added path are both reported', () => {
    assert.deepEqual(compareFileLists(['a.js', 'c.js'], ['a.js', 'b.js']), { added: ['c.js'], missing: ['b.js'] });
});

test('AC-037 normaliseListing turns Windows separators into slashes and drops blank lines', () => {
    assert.deepEqual(normaliseListing('dist\\webview\\main.js\r\n\r\nREADME.md\n'), ['dist/webview/main.js', 'README.md']);
});

test('AC-037 the self-test passes on the snapshot', () => {
    assert.equal(runSelfTest(snapshot), true);
});

test('AC-037 negative control: the self-test fails when a difference goes unreported', () => {
    assert.equal(runSelfTest([]), false);
});
