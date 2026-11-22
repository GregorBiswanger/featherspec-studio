import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { differingAreas, protocolVersionOf } from './sharedGuard.mjs';

const envelopeSource = (dir) => readFileSync(path.join(dir, 'src', 'shared', 'protocol', 'envelope.ts'), 'utf8');
const HEAD_PROTOCOL_VERSION = protocolVersionOf(envelopeSource(path.resolve(import.meta.dirname, '..', '..')));
const SETTLE_MS = 50;
const SKIPPED = new Set(['gen-200', 'setup-expected']);
const LOADING_TEXT = 'Loading project…';
const SHELL = { state: undefined, restricted: false, area: 'board', target: undefined, selection: undefined, notice: undefined };
const VARIANTS = [
    { restricted: false, suffix: '' },
    { restricted: true, suffix: ' restricted' },
];

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

const evt = (version, type, payload) => ({ v: version, kind: 'evt', type, payload });

const textOf = (dom) => dom.window.document.body.textContent ?? '';

const contentOf = (dom) => {
    const main = dom.window.document.querySelector('main') ?? dom.window.document.body;
    const content = main.cloneNode(true);
    content.querySelectorAll('h1').forEach((heading) => heading.remove());
    return (content.textContent ?? '').replace(/\s+/g, ' ').trim();
};

const PANEL_STATE_SELECTOR = 'section.panel-state[data-state]';

const stateProblem = (dom, area, expected) => {
    const rendered = [...dom.window.document.querySelectorAll(PANEL_STATE_SELECTOR)].map((element) => element.getAttribute('data-state'));
    if (rendered.length === 0 && expected === undefined) {
        return [];
    }
    if (rendered.length === 1 && rendered[0] === expected) {
        return [];
    }
    return [`${area}: the webview shows the panel state ${rendered.join(', ') || 'none'} but the shell view expects ${expected ?? 'none'}`];
};

const sendIfPresent = (dom, version, type, view) => {
    if (view !== undefined && view !== null) {
        send(dom, evt(version, type, { view }));
    }
};

export const renderFixture = async (bundle, name, views, version = HEAD_PROTOCOL_VERSION) => {
    const errors = [];
    const texts = {};
    const problems = [];
    const shellView = { ...SHELL, ...(views.shell ?? {}) };
    if (views.board !== undefined && views.overview === undefined) {
        problems.push(`${name}: missing coverage, the conformance output has a board but no overview view`);
    }
    for (const variant of VARIANTS) {
        const base = { ...shellView, restricted: variant.restricted };
        const label = (area) => `${name} ${area}${variant.suffix}`;
        const record = (dom, area) => {
            texts[label(area)] = textOf(dom);
            problems.push(...stateProblem(dom, label(area), base.state?.id));
            if (contentOf(dom) === LOADING_TEXT) {
                problems.push(`${label(area)}: the area shows only the loading text (${LOADING_TEXT}), so its view was not compared`);
            }
        };
        let seq = 1;
        const shell = (dom, view) => send(dom, { ...evt(version, 'shell', { view }), seq: seq++ });
        const shellOnly = boot(bundle, errors);
        await settle();
        shell(shellOnly, { ...base, area: 'board' });
        await settle();
        record(shellOnly, 'shell');
        if (views.board !== undefined) {
            const board = boot(bundle, errors);
            await settle();
            shell(board, { ...base, area: 'board' });
            sendIfPresent(board, version, 'board', views.board);
            await settle();
            record(board, 'board');
            if (views.overview !== undefined) {
                const overview = boot(bundle, errors);
                await settle();
                shell(overview, { ...base, area: 'overview' });
                sendIfPresent(overview, version, 'overview', views.overview);
                await settle();
                record(overview, 'overview');
            }
            const planMap = boot(bundle, errors);
            await settle();
            shell(planMap, { ...base, area: 'planMap' });
            sendIfPresent(planMap, version, 'board', views.board);
            await settle();
            record(planMap, 'planMap');
        }
        const detail = boot(bundle, errors);
        const mapDetail = boot(bundle, errors);
        await settle();
        for (const [stem, view] of Object.entries(views.details ?? {})) {
            if (view === null || view === undefined) {
                continue;
            }
            shell(detail, { ...base, area: 'board', selection: { stem, number: view.number } });
            sendIfPresent(detail, version, 'board', views.board);
            sendIfPresent(detail, version, 'detail', view);
            await settle();
            record(detail, `detail ${stem}`);
            if (views.board !== undefined) {
                shell(mapDetail, { ...base, area: 'planMap', selection: { stem, number: view.number } });
                sendIfPresent(mapDetail, version, 'board', views.board);
                sendIfPresent(mapDetail, version, 'detail', view);
                await settle();
                record(mapDetail, `planMap ${stem}`);
            }
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
    const version = protocolVersionOf(envelopeSource(bundleDir));
    const bundle = readFileSync(path.join(bundleDir, 'dist', 'webview', 'main.js'), 'utf8');
    const texts = {};
    const problems = [];
    for (const name of names) {
        const views = JSON.parse(readFileSync(path.join(expectedDir, `${name}.json`), 'utf8'));
        const rendered = await renderFixture(bundle, name, views, version);
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
