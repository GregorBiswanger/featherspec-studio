import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareTreeFixture, driftedFixtures } from './treeFixtures.mjs';

const expected = JSON.stringify({ board: {}, tree: { items: [{ label: 'a' }], badge: 1 } });

test('a pretty-printed fixture equal to the tree of a fresh reply passes', () => {
    assert.equal(compareTreeFixture(JSON.stringify({ items: [{ label: 'a' }], badge: 1 }, null, 1), expected), true);
});

test('negative control: a changed label is reported as drift', () => {
    assert.equal(compareTreeFixture(JSON.stringify({ items: [{ label: 'b' }], badge: 1 }), expected), false);
});

test('a fixture without fresh output is reported', () => {
    assert.deepEqual(driftedFixtures([{ name: 'x.json', text: '{}' }], {}), ['x.json: no fresh conformance output']);
});

test('drifted fixtures are named', () => {
    const fixtures = [
        { name: 'ok.json', text: JSON.stringify({ items: [{ label: 'a' }], badge: 1 }) },
        { name: 'bad.json', text: '{"items":[]}' },
    ];
    assert.deepEqual(driftedFixtures(fixtures, { 'ok.json': expected, 'bad.json': expected }), ['bad.json: differs from a fresh conformanceExpected.mjs run']);
});
