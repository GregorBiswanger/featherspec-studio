import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { differingAreas } from './sharedGuard.mjs';

const PROTOCOL_VERSION = 11;
const SETTLE_MS = 50;
const SKIPPED = new Set(['gen-200', 'setup-expected']);
const SHELL = { state: undefined, restricted: false, projectName: 'fixture', area: 'board', target: undefined, selection: undefined, notice: undefined, rows: [] };

const settle = () => new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

const boot = (script, errors) => {
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (error) => errors.push(error.message));
    virtualConsole.on('error', (...args) => errors.push(args.join(' ')));
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
        runScripts: 'outside-only',
        pretendToBeVisual: true,
        virtualConsole,
    });
    dom.window.acquireVsCodeApi = () => ({ postMessage: () => undefined });
    dom.window.addEventListener('error', (event) => errors.push(String(event.message)));
    try {
        dom.window.eval(script);
    } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
    }
    return dom;
};

const send = (dom, message) => dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: message }));

const evt = (type, payload) => ({ v: PROTOCOL_VERSION, kind: 'evt', type, payload });

const textOf = (dom) => dom.window.document.body.textContent ?? '';

const PROBLEM_SELECTOR = 'section.panel-state[data-state]';

const problemsOf = (dom, area) =>
    [...dom.window.document.querySelectorAll(PROBLEM_SELECTOR)].map(
        (element) => `${area}: the webview shows the panel state ${element.getAttribute('data-state')} (S5 is the protocol error screen)`,
    );

const sendIfPresent = (dom, type, view) => {
    if (view !== undefined && view !== null) {
        send(dom, evt(type, { view }));
    }
};

export const renderFixture = async (bundle, name, views) => {
    const errors = [];
    const texts = {};
    const problems = [];
    const record = (dom, area) => {
        texts[area] = textOf(dom);
        problems.push(...problemsOf(dom, area));
    };
    let seq = 1;
    const shell = (dom, view) => send(dom, { ...evt('shell', { view }), seq: seq++ });
    if (views.board !== undefined) {
        const board = boot(bundle, errors);
        await settle();
        shell(board, SHELL);
        sendIfPresent(board, 'board', views.board);
        await settle();
        record(board, `${name} board`);
        if (views.overview === undefined) {
            problems.push(`${name}: missing coverage, the conformance output has a board but no overview view`);
        } else {
            const overview = boot(bundle, errors);
            await settle();
            shell(overview, { ...SHELL, area: 'overview' });
            sendIfPresent(overview, 'overview', views.overview);
            await settle();
            record(overview, `${name} overview`);
        }
        const planMap = boot(bundle, errors);
        await settle();
        shell(planMap, { ...SHELL, area: 'planMap' });
        sendIfPresent(planMap, 'board', views.board);
        await settle();
        record(planMap, `${name} planMap`);
    }
    const detail = boot(bundle, errors);
    const mapDetail = boot(bundle, errors);
    await settle();
    for (const [stem, view] of Object.entries(views.details ?? {})) {
        if (view === null || view === undefined) {
            continue;
        }
        shell(detail, { ...SHELL, selection: { stem, number: view.number } });
        sendIfPresent(detail, 'board', views.board);
        sendIfPresent(detail, 'detail', view);
        await settle();
        record(detail, `${name} detail ${stem}`);
        if (views.board !== undefined) {
            shell(mapDetail, { ...SHELL, area: 'planMap', selection: { stem, number: view.number } });
            sendIfPresent(mapDetail, 'board', views.board);
            sendIfPresent(mapDetail, 'detail', view);
            await settle();
            record(mapDetail, `${name} planMap ${stem}`);
        }
    }
    if (errors.length > 0) {
        throw new Error(`${name}: the webview reported errors: ${errors.join(' | ')}`);
    }
    return { texts, problems };
};

export const conformanceCommand = (headDir, outDir) => ({
    file: process.execPath,
    args: [path.join(headDir, 'jetbrains', 'scripts', 'conformanceExpected.mjs'), outDir],
    cwd: headDir,
});

const renderAll = async (bundleDir, expectedDir, names) => {
    const bundle = readFileSync(path.join(bundleDir, 'dist', 'webview', 'main.js'), 'utf8');
    const texts = {};
    const problems = [];
    for (const name of names) {
        const views = JSON.parse(readFileSync(path.join(expectedDir, `${name}.json`), 'utf8'));
        const rendered = await renderFixture(bundle, name, views);
        Object.assign(texts, rendered.texts);
        problems.push(...rendered.problems);
    }
    return { texts, problems };
};

const main = async () => {
    const [startArg, headArg] = process.argv.slice(2);
    if (!startArg || !headArg) {
        console.error('usage: renderedTexts.mjs <startDir> <headDir>');
        return 2;
    }
    const startDir = path.resolve(startArg);
    const headDir = path.resolve(headArg);
    const out = mkdtempSync(path.join(os.tmpdir(), 'rendered-texts-'));
    try {
        const command = conformanceCommand(headDir, out);
        execFileSync(command.file, command.args, { cwd: command.cwd, stdio: 'pipe', timeout: 900_000 });
        const expectedDir = path.join(out, 'expected');
        const names = readdirSync(expectedDir)
            .filter((file) => file.endsWith('.json'))
            .map((file) => file.slice(0, -'.json'.length))
            .filter((name) => !SKIPPED.has(name))
            .sort();
        const start = await renderAll(startDir, expectedDir, names);
        const head = await renderAll(headDir, expectedDir, names);
        const differing = differingAreas(start.texts, head.texts);
        const problems = [...new Set([...start.problems.map((problem) => `start ${problem}`), ...head.problems.map((problem) => `head ${problem}`)])];
        for (const problem of problems) {
            console.log(`render problem: ${problem}`);
        }
        for (const area of differing) {
            console.log(`rendered text differs: ${area}`);
        }
        if (differing.length === 0 && problems.length === 0) {
            const kinds = {};
            for (const area of Object.keys(head.texts)) {
                const kind = area.split(' ')[1];
                kinds[kind] = (kinds[kind] ?? 0) + 1;
            }
            const summary = Object.entries(kinds).map(([kind, count]) => `${kind} ${count}`).join(', ');
            console.log(`rendered texts are identical in ${Object.keys(head.texts).length} areas (${summary})`);
            return 0;
        }
        return 1;
    } finally {
        rmSync(out, { recursive: true, force: true });
    }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().then(
        (code) => {
            process.exitCode = code;
        },
        (error) => {
            console.error(error);
            process.exitCode = 1;
        },
    );
}
