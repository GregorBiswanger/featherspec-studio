import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    ZIP_LIMIT_BYTES,
    checkIconsPresent,
    checkPluginXml,
    checkZipSize,
    compareDigests,
    findForbiddenEntries,
    findSecrets,
    findStrayClasses,
    isBinary,
    missingEntries,
    pickMainJar,
    sha256,
} from './pluginZip.mjs';

const goodXml = `<idea-plugin>
    <id>com.gregorbiswanger.featherspec.studio</id>
    <name>FeatherSpec Studio</name>
    <vendor>Gregor Biswanger</vendor>
    <depends>com.intellij.modules.platform</depends>
    <depends>com.intellij.modules.jcef</depends>
    <idea-version since-build="253.29346"/>
</idea-plugin>`;

const pem = (kind) => ['-----BEGIN', kind, '-----'].join(' ').replace(' -----', '-----');

test('AC-035 a ZIP at the limit passes and one byte more fails', () => {
    assert.deepEqual(checkZipSize(ZIP_LIMIT_BYTES), []);
    assert.equal(checkZipSize(ZIP_LIMIT_BYTES + 1).length, 1);
});

test('AC-035 entries naming GraalJS, Truffle, polyglot or ICU4J are reported', () => {
    const names = ['a/lib/ok.jar', 'a/lib/graal-sdk-24.jar', 'x/Truffle.class', 'p/polyglot/Engine.class', 'icu4j-74.jar'];
    assert.equal(findForbiddenEntries(names).length, 4);
    assert.deepEqual(findForbiddenEntries(['a/lib/ok.jar', 'embedded/core.js']), []);
});

test('AC-014 the required jar entries are reported when missing', () => {
    const present = ['embedded/core.js', 'webview/main.js', 'webview/main.css', 'icons/toolWindow.svg', 'icons/toolWindow_dark.svg', 'META-INF/plugin.xml', 'com/gregorbiswanger/featherspec/studio/studio-version.txt'];
    assert.deepEqual(missingEntries(present), []);
    assert.deepEqual(missingEntries(present.filter((name) => name !== 'webview/main.css')), ['missing in the plugin jar: webview/main.css']);
    const noVersion = present.filter((name) => !name.endsWith('studio-version.txt'));
    assert.deepEqual(missingEntries(noVersion), ['missing in the plugin jar: com/gregorbiswanger/featherspec/studio/studio-version.txt']);
});

test('icons need at least one entry below icons/', () => {
    assert.deepEqual(checkIconsPresent(['icons/', 'a.class']).length, 1);
    assert.deepEqual(checkIconsPresent(['icons/', 'icons/a.svg']), []);
});

test('spike and test classes are reported, plugin classes are not', () => {
    assert.deepEqual(findStrayClasses(['com/x/probe/ProbeAutoRun.class', 'com/x/tree/SpecTreeMapping.class']), []);
    assert.equal(findStrayClasses(['com/x/HostRouterTest.class', 'spikes/ide/Main.class', 'com/x/spike/A.class']).length, 3);
});

test('AC-014 differing digests are reported by name', () => {
    assert.deepEqual(compareDigests([{ name: 'a', jar: '1', dist: '1' }]), []);
    assert.deepEqual(compareDigests([{ name: 'webview/main.js', jar: '1', dist: '2' }]), ['not byte-identical to the dist file: webview/main.js']);
});

test('sha256 of a known input', () => {
    assert.equal(sha256(Buffer.from('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('AC-033 a correct plugin.xml passes', () => {
    assert.deepEqual(checkPluginXml(goodXml), []);
});

test('AC-033 negative controls: until-build, extra depends, wrong since-build, wrong id', () => {
    assert.ok(checkPluginXml(goodXml.replace('since-build="253.29346"', 'since-build="253.29346" until-build="261.*"')).some((p) => p.includes('until-build')));
    assert.ok(checkPluginXml(goodXml.replace('</idea-plugin>', '<depends>com.intellij.java</depends></idea-plugin>')).some((p) => p.includes('depend')));
    assert.ok(checkPluginXml(goodXml.replace('253.29346', '253.1')).some((p) => p.includes('since-build')));
    assert.ok(checkPluginXml(goodXml.replace('com.gregorbiswanger.featherspec.studio', 'x.y')).some((p) => p.includes('id')));
});

test('0035 OP-009 the optional Terminal dependency passes; another optional one or a required Terminal one does not', () => {
    const withTerminal = goodXml.replace('</idea-plugin>', '<depends optional="true" config-file="t.xml">org.jetbrains.plugins.terminal</depends></idea-plugin>');
    assert.deepEqual(checkPluginXml(withTerminal), []);
    assert.ok(checkPluginXml(goodXml.replace('</idea-plugin>', '<depends optional="true" config-file="x.xml">com.intellij.java</depends></idea-plugin>')).some((p) => p.includes('optional')));
    assert.ok(checkPluginXml(goodXml.replace('</idea-plugin>', '<depends>org.jetbrains.plugins.terminal</depends></idea-plugin>')).some((p) => p.includes('depend')));
});

test('AC-035 a PEM header and a token assignment are found, with file and line', () => {
    const found = findSecrets([
        { path: 'a.txt', text: `ok\n${pem('RSA PRIVATE KEY')}\n` },
        { path: 'b.yml', text: `${'PUBLISH' + '_TOKEN'}=abcd1234efgh` },
        { path: 'c.yml', text: `${'PRIVATE_KEY' + '_PASSWORD'}: s3cretvalue1` },
    ]);
    assert.deepEqual(found, ['PEM header in a.txt:2', 'secret assignment in b.yml:1', 'secret assignment in c.yml:1']);
});

test('AC-035 negative control: references without a value are not secrets', () => {
    const name = 'PUBLISH' + '_TOKEN';
    assert.deepEqual(
        findSecrets([
            { path: 'a.yml', text: `${name}: \${{ secrets.${name} }}` },
            { path: 'b.md', text: `a \`${name}=\`-style assignment` },
            { path: 'c.md', text: 'no secrets here' },
        ]),
        [],
    );
});

test('binary buffers are recognised by a NUL byte', () => {
    assert.equal(isBinary(Buffer.from([65, 0, 66])), true);
    assert.equal(isBinary(Buffer.from('text')), false);
});

test('the main jar is the one holding META-INF/plugin.xml', () => {
    const jars = [{ entry: 'a/lib/x-searchableOptions.jar', entries: ['a'] }, { entry: 'a/lib/x.jar', entries: ['META-INF/plugin.xml'] }];
    assert.equal(pickMainJar(jars).entry, 'a/lib/x.jar');
    assert.equal(pickMainJar([]), undefined);
});

test('0036 a vendor with a url attribute passes and a wrong vendor name still fails', () => {
    const withUrl = goodXml.replace('<vendor>', '<vendor url="https://github.com/GregorBiswanger/featherspec-studio">');
    assert.deepEqual(checkPluginXml(withUrl), []);
    assert.ok(checkPluginXml(withUrl.replace('Gregor Biswanger', 'Someone')).some((p) => p.includes('vendor')));
});
