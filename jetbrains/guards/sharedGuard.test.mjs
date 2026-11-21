import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { differingAreas, missingTests, mochaTitles, vitestInventory } from './sharedGuard.mjs';

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
