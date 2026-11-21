import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conformanceCommand, renderFixture } from './renderedTexts.mjs';

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

const WITH_BOARD = { board: { columns: [] }, overview: { header: {} }, details: { '0001-a': { number: '0001' } } };

test('AC-039 a fixture without a board view sends no board event and shows no protocol error', async () => {
    const { texts, problems } = await renderFixture(FAKE_BUNDLE, 'repo-x', { details: { '0001-a': { number: '0001' } } });
    assert.deepEqual(problems, []);
    assert.deepEqual(Object.keys(texts), ['repo-x detail 0001-a']);
    assert.ok(!texts['repo-x detail 0001-a'].includes('board "";'));
});

test('AC-039 negative control: a body that shows the S5 state is reported as a problem', async () => {
    const { problems } = await renderFixture(FAKE_BUNDLE, 'repo-y', { board: { poison: true }, overview: { header: {} }, details: {} });
    assert.ok(problems.some((problem) => problem.includes('repo-y board') && problem.includes('S5')), problems.join('|'));
});

test('AC-039 a fixture with a board renders the board, overview, plan map and detail areas', async () => {
    const { texts, problems } = await renderFixture(FAKE_BUNDLE, 'fx', WITH_BOARD);
    assert.deepEqual(problems, []);
    assert.deepEqual(Object.keys(texts).sort(), ['fx board', 'fx detail 0001-a', 'fx overview', 'fx planMap', 'fx planMap 0001-a']);
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

test('AC-039 the conformance output is computed from the head tree, not the current directory', () => {
    const command = conformanceCommand('/work/head', '/tmp/out');
    assert.equal(command.cwd, '/work/head');
    assert.ok(command.args[0].replaceAll('\\', '/').endsWith('/work/head/jetbrains/scripts/conformanceExpected.mjs'));
    assert.equal(command.args[1], '/tmp/out');
});
