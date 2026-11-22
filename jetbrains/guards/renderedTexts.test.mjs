import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { conformanceCommand, renderFixture } from './renderedTexts.mjs';
import { protocolVersionOf } from './sharedGuard.mjs';

const FAKE_BUNDLE = `
window.addEventListener('message', (event) => {
    const data = event.data;
    const body = document.body;
    if (data.payload && 'view' in data.payload && (data.payload.view === undefined || data.payload.view.poison === true)) {
        const section = document.createElement('section');
        section.className = 'panel-state';
        section.setAttribute('data-state', 'S5');
        body.appendChild(section);
        return;
    }
    const line = document.createElement('p');
    line.textContent = data.type + ' ' + JSON.stringify(data.payload && data.payload.view && data.payload.view.area !== undefined ? data.payload.view.area : '') + ';';
    body.appendChild(line);
});
`;

const STATE_BUNDLE = `
window.addEventListener('message', (event) => {
    const view = event.data.payload && event.data.payload.view;
    if (event.data.type === 'shell' && view && view.state) {
        const section = document.createElement('section');
        section.className = 'panel-state';
        section.setAttribute('data-state', view.state.id);
        document.body.appendChild(section);
    }
});
`;

const RESTRICTED_BUNDLE = `
window.addEventListener('message', (event) => {
    const view = event.data.payload && event.data.payload.view;
    if (event.data.type === 'shell' && view && view.restricted) {
        const note = document.createElement('div');
        note.setAttribute('role', 'note');
        note.setAttribute('data-state', 'S7');
        note.textContent = 'Restricted Mode note';
        document.body.appendChild(note);
    }
});
`;

const LOADING_BUNDLE = `
window.addEventListener('message', () => {
    document.body.innerHTML = '<header>Studio areas</header><main><h1>Board</h1><div role="progressbar" class="loading">Loading project…</div></main>';
});
`;

const CONTENT_BUNDLE = `
window.addEventListener('message', () => {
    document.body.innerHTML = '<header>Studio areas</header><main><h1>Board</h1><p>Three specs are active.</p></main>';
});
`;

const WITH_BOARD = { board: { columns: [] }, overview: { header: {} }, details: { '0001-a': { number: '0001' } } };

const withRestricted = (names) => names.flatMap((name) => [name, `${name} restricted`]).sort();

test('AC-039 a fixture without a board view renders its shell and the detail, with and without the S7 note, and sends no board event', async () => {
    const { texts, problems } = await renderFixture(FAKE_BUNDLE, 'repo-x', { details: { '0001-a': { number: '0001' } } });
    assert.deepEqual(problems, []);
    assert.deepEqual(Object.keys(texts).sort(), withRestricted(['repo-x shell', 'repo-x detail 0001-a']));
    assert.ok(!texts['repo-x detail 0001-a'].includes('board "";'));
});

test('AC-039 negative control: a body that shows the S5 state is reported as a problem', async () => {
    const { problems } = await renderFixture(FAKE_BUNDLE, 'repo-y', { board: { poison: true }, overview: { header: {} }, details: {} });
    assert.ok(problems.some((problem) => problem.includes('repo-y board') && problem.includes('S5')), problems.join('|'));
});

test('AC-039 a fixture with a board renders the shell, board, overview, plan map and detail areas, with and without the S7 note', async () => {
    const { texts, problems } = await renderFixture(FAKE_BUNDLE, 'fx', WITH_BOARD);
    assert.deepEqual(problems, []);
    assert.deepEqual(Object.keys(texts).sort(), withRestricted(['fx board', 'fx detail 0001-a', 'fx overview', 'fx planMap', 'fx planMap 0001-a', 'fx shell']));
    assert.ok(texts['fx overview'].includes('overview'));
    assert.ok(texts['fx planMap'].includes('planMap'));
});

test('AC-039 negative control: a board without an overview view is reported as missing coverage', async () => {
    const { texts, problems } = await renderFixture(FAKE_BUNDLE, 'fx', { board: { columns: [] }, details: {} });
    assert.ok(problems.some((problem) => problem.includes('fx') && problem.includes('overview') && problem.includes('missing')), problems.join('|'));
    assert.ok(!('fx overview' in texts));
});

test('AC-039 an overview view that the webview refuses is reported as a problem', async () => {
    const { problems } = await renderFixture(FAKE_BUNDLE, 'fx', { board: { columns: [] }, overview: { poison: true }, details: {} });
    assert.ok(problems.some((problem) => problem.includes('fx overview') && problem.includes('S5')), problems.join('|'));
});

test('AC-039 the panel state the webview shows is compared with the state the shell view expects, without a mismatch', async () => {
    const { problems } = await renderFixture(STATE_BUNDLE, 'fx', { shell: { state: { id: 'S2' } }, details: {} });
    assert.deepEqual(problems, []);
});

test('AC-039 negative control: a shell view that expects S2 while the webview shows no panel state is reported as a mismatch', async () => {
    const { problems } = await renderFixture(FAKE_BUNDLE, 'fx', { shell: { state: { id: 'S2' } }, details: {} });
    assert.ok(problems.some((problem) => problem.includes('fx shell') && problem.includes('expects S2')), problems.join('|'));
});

test('AC-039 negative control: a webview that shows S5 where the shell view expects S2 is reported as a mismatch', async () => {
    const { problems } = await renderFixture(FAKE_BUNDLE, 'fx', { board: { poison: true }, shell: { state: { id: 'S2' } }, details: {} });
    assert.ok(problems.some((problem) => problem.includes('fx board') && problem.includes('S5') && problem.includes('expects S2')), problems.join('|'));
});

test('AC-039 the restricted pass shows the S7 note only in the restricted variant', async () => {
    const { texts, problems } = await renderFixture(RESTRICTED_BUNDLE, 'fx', { details: {} });
    assert.deepEqual(problems, []);
    assert.ok(texts['fx shell restricted'].includes('Restricted Mode note'));
    assert.ok(!texts['fx shell'].includes('Restricted Mode note'));
});

test('AC-039 an area whose rendered content is only the loading text is reported as a problem', async () => {
    const { problems } = await renderFixture(LOADING_BUNDLE, 'fx', { board: { columns: [] }, overview: { header: {} }, details: {} });
    assert.ok(problems.some((problem) => problem.includes('fx board') && problem.includes('Loading project…')), problems.join('|'));
});

test('AC-039 negative control: an area with content beside the loading text is not reported as loading', async () => {
    const { problems } = await renderFixture(CONTENT_BUNDLE, 'fx', { board: { columns: [] }, overview: { header: {} }, details: {} });
    assert.deepEqual(problems, []);
});

test('AC-039 the conformance output is computed from the head tree, not the current directory', () => {
    const command = conformanceCommand('/work/head', '/tmp/out');
    assert.equal(command.cwd, '/work/head');
    assert.ok(command.args[0].replaceAll('\\', '/').endsWith('/work/head/jetbrains/scripts/conformanceExpected.mjs'));
    assert.equal(command.args[1], '/tmp/out');
});

const VERSION_BUNDLE = `
window.addEventListener('message', (event) => {
    const line = document.createElement('p');
    line.textContent = 'v' + event.data.v + ';';
    document.body.appendChild(line);
});
`;

test('0035 T-008 the events carry the protocol version given for the bundle', async () => {
    const { texts } = await renderFixture(VERSION_BUNDLE, 'fx', { details: {} }, 7);
    assert.ok(texts['fx shell'].includes('v7;'), texts['fx shell']);
    assert.ok(!texts['fx shell'].includes('v12;'));
});

test('0035 T-008 without a version the events carry the version of the head envelope source', async () => {
    const head = protocolVersionOf(readFileSync(path.resolve(import.meta.dirname, '..', '..', 'src', 'shared', 'protocol', 'envelope.ts'), 'utf8'));
    const { texts } = await renderFixture(VERSION_BUNDLE, 'fx', { details: {} });
    assert.ok(texts['fx shell'].includes(`v${head};`), texts['fx shell']);
});
