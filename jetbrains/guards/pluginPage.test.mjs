import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    checkChangeNotes,
    checkDescription,
    checkIcon,
    checkPage,
    checkVendor,
    checkWords,
    extractBlock,
} from './pluginPage.mjs';

const read = (file) => readFileSync(new URL(`../src/main/resources/META-INF/${file}`, import.meta.url), 'utf8');
const xml = read('plugin.xml');

test('AC-014 to AC-017 the plugin.xml page passes every check', () => {
    assert.deepEqual(checkPage(xml), []);
});

test('AC-017 vendor: name and repository url, no e-mail, not empty', () => {
    assert.deepEqual(checkVendor(xml), []);
    assert.ok(checkVendor(xml.replace(/<vendor[^>]*>[^<]*<\/vendor>/, '<vendor></vendor>')).length > 0);
    assert.ok(checkVendor(xml.replace(/ url="[^"]*"/, '')).length > 0);
    assert.ok(checkVendor(xml.replace('<vendor ', '<vendor email="a@b.c" ')).length > 0);
    assert.ok(checkVendor(xml.replace('>Gregor Biswanger<', '>Someone<')).length > 0);
    assert.ok(checkVendor('<idea-plugin/>').length > 0);
});

test('AC-014 description: assistants, the honest Send sentences, no image, links only to the repository owner', () => {
    assert.deepEqual(checkDescription(xml), []);
    assert.ok(checkDescription(xml.replace(/<description>[\s\S]*<\/description>/, '<description><![CDATA[  ]]></description>')).length > 0);
    assert.ok(checkDescription(xml.replace('It never presses Enter.', '')).length > 0);
    assert.ok(checkDescription(xml.replace('Junie, Claude Code and GitHub Copilot are products', 'They are products')).length > 0);
    assert.ok(checkDescription(xml.replace('RustRover', 'Rust')).length > 0);
    assert.ok(checkDescription(xml.replace('</ul>', '<li><img src="https://github.com/GregorBiswanger/x.png"/></li></ul>')).length > 0);
    assert.ok(checkDescription(xml.replace('<a href="https://github.com/GregorBiswanger/featherspec-studio">', '<a href="https://example.com/x">')).length > 0);
    assert.ok(checkDescription(xml.replace('no account, no telemetry', 'free')).length > 0);
});

test('AC-016 change notes: first release, not empty, no placeholder', () => {
    assert.deepEqual(checkChangeNotes(xml), []);
    assert.ok(checkChangeNotes(xml.replace(/<change-notes>[\s\S]*<\/change-notes>/, '')).length > 0);
    assert.ok(checkChangeNotes(xml.replace(/<change-notes>[\s\S]*<\/change-notes>/, '<change-notes><![CDATA[]]></change-notes>')).length > 0);
    assert.ok(checkChangeNotes(xml.replace('Full history', 'TODO Full history')).length > 0);
    assert.ok(checkChangeNotes(xml.replace('First release on the JetBrains Marketplace', 'Second release')).length > 0);
});

test('AC-015 forbidden words and the name limit', () => {
    assert.deepEqual(checkWords(xml), []);
    for (const word of ['official', 'Endorsed', 'partner', 'certified', 'by Anthropic', 'by GitHub']) {
        assert.ok(checkWords(xml.replace('The Studio sends nothing.', `The Studio is ${word}.`)).length > 0, word);
    }
    assert.ok(checkWords(xml.replace('<name>FeatherSpec Studio</name>', '<name>FeatherSpec Studio Plugin</name>')).length > 0);
    assert.ok(checkWords(xml.replace('<name>FeatherSpec Studio</name>', '<name>JetBrains FeatherSpec Studio</name>')).length > 0);
    assert.ok(checkWords(xml.replace('<name>FeatherSpec Studio</name>', `<name>${'x'.repeat(31)}</name>`)).length > 0);
    assert.equal('FeatherSpec Studio'.length, 18);
});

test('AC-017 both icons are SVGs of 40 by 40', () => {
    assert.deepEqual(checkIcon(read('pluginIcon.svg')), []);
    assert.deepEqual(checkIcon(read('pluginIcon_dark.svg')), []);
    assert.ok(checkIcon(read('pluginIcon.svg').replace('width="40"', 'width="16"')).length > 0);
});

test('extractBlock reads CDATA only', () => {
    assert.equal(extractBlock('<description><![CDATA[ a ]]></description>', 'description'), 'a');
    assert.equal(extractBlock('<description>a</description>', 'description'), undefined);
});

test('0036 the listing texts name the license, source, issues and documentation links and the vendor profile', () => {
    const listing = readFileSync(new URL('../../docs/jetbrains/marketplace-listing.md', import.meta.url), 'utf8');
    for (const needle of [
        'https://plugins.jetbrains.com/vendor/gregor-biswanger',
        'https://github.com/GregorBiswanger/featherspec-studio/blob/main/LICENSE',
        'https://github.com/GregorBiswanger/featherspec-studio/issues',
        'https://github.com/GregorBiswanger/featherspec-studio#jetbrains-ides',
        'AI',
        'Project Management',
    ]) {
        assert.ok(listing.includes(needle), needle);
    }
    assert.ok(!listing.includes(['-----BEGIN', ''].join(' ')));
});
