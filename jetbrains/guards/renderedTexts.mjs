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

const renderFixture = async (bundle, name, views) => {
    const errors = [];
    const texts = {};
    if (views.board !== undefined) {
        const dom = boot(bundle, errors);
        await settle();
        send(dom, { ...evt('shell', { view: SHELL }), seq: 1 });
        send(dom, evt('board', { view: views.board }));
        await settle();
        texts[`${name} board`] = textOf(dom);
    }
    const detail = boot(bundle, errors);
    await settle();
    let seq = 2;
    for (const [stem, view] of Object.entries(views.details ?? {})) {
        if (view === null || view === undefined) {
            continue;
        }
        send(detail, { ...evt('shell', { view: { ...SHELL, selection: { stem, number: view.number } } }), seq: seq++ });
        send(detail, evt('board', { view: views.board }));
        send(detail, evt('detail', { view }));
        await settle();
        texts[`${name} detail ${stem}`] = textOf(detail);
    }
    if (errors.length > 0) {
        throw new Error(`${name}: the webview reported errors: ${errors.join(' | ')}`);
    }
    return texts;
};

const renderAll = async (bundleDir, expectedDir, names) => {
    const bundle = readFileSync(path.join(bundleDir, 'dist', 'webview', 'main.js'), 'utf8');
    const texts = {};
    for (const name of names) {
        const views = JSON.parse(readFileSync(path.join(expectedDir, `${name}.json`), 'utf8'));
        Object.assign(texts, await renderFixture(bundle, name, views));
    }
    return texts;
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
        execFileSync(process.execPath, [path.join(headDir, 'jetbrains', 'scripts', 'conformanceExpected.mjs'), out], {
            stdio: 'pipe',
            timeout: 900_000,
        });
        const expectedDir = path.join(out, 'expected');
        const names = readdirSync(expectedDir)
            .filter((file) => file.endsWith('.json'))
            .map((file) => file.slice(0, -'.json'.length))
            .filter((name) => !SKIPPED.has(name))
            .sort();
        const startTexts = await renderAll(startDir, expectedDir, names);
        const headTexts = await renderAll(headDir, expectedDir, names);
        const differing = differingAreas(startTexts, headTexts);
        if (differing.length === 0) {
            console.log(`rendered texts are identical in ${Object.keys(headTexts).length} areas`);
            return 0;
        }
        for (const area of differing) {
            console.log(`rendered text differs: ${area}`);
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
