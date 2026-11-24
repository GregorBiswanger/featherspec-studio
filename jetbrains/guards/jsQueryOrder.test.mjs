import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { directQueryCalls, kotlinFiles, orderViolations } from './jsQueryOrder.mjs';

const root = new URL('../src/main/kotlin', import.meta.url);
const sources = kotlinFiles(root.pathname.replace(/^\/([A-Za-z]:)/, '$1')).map((name) => ({ name, source: readFileSync(name, 'utf8') }));
const read = (suffix) => sources.find(({ name }) => name.split('\\').join('/').endsWith(suffix)).source;

test('AC-034 JBCefJSQuery.create appears only in the JsQueries factory', () => {
    assert.deepEqual(directQueryCalls(sources), []);
});

test('AC-034 the factory file calls JBCefJSQuery.create', () => {
    assert.match(read('jcef/JsQueries.kt'), /JBCefJSQuery\.create\(browser\)/);
});

test('AC-034 the core browser creates its query before the native browser', () => {
    assert.deepEqual(orderViolations(read('runtime/CoreRuntime.kt')), []);
});

test('AC-034 the panel browser defers the native browser and creates its query first', () => {
    const source = read('panel/PanelBrowser.kt');
    assert.match(source, /\.setCreateImmediately\(false\)\.build\(\)/);
    assert.match(source, /JsQueries\.create\(browser\)/);
    assert.doesNotMatch(source, /createImmediately\(\)/);
});

test('AC-034 a direct JBCefJSQuery.create outside the factory is reported', () => {
    assert.deepEqual(directQueryCalls([{ name: 'a/B.kt', source: 'val q = JBCefJSQuery.create(b)' }]), ['a/B.kt']);
});

test('AC-034 the old order (native browser first) is reported', () => {
    const old = 'JBCefBrowser.createBuilder().build()\ncreated.createImmediately()\nJsQueries.create(created)';
    assert.deepEqual(orderViolations(old), [
        'the builder does not defer the native browser',
        'createImmediately() comes before JsQueries.create',
    ]);
});

test('AC-034 the new order passes', () => {
    const next = 'createBuilder().setCreateImmediately(false).build()\nJsQueries.create(created)\ncreated.createImmediately()';
    assert.deepEqual(orderViolations(next), []);
});
