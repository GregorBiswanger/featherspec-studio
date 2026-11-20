import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildBanner, buildCards } from '../../core/board/cards';
import { buildDetail } from '../../core/board/detail';
import { arrangeBoard } from '../../core/board/filters';
import { CASE_FIXTURES } from '../../core/board/testing/caseFixtures';
import { modelOf } from '../../core/board/testing/boardWorld';
import { buildOverviewView } from '../../core/overview/overviewView';
import { parseStepTipSettings } from '../../core/settings/stepTipSettings';
import { buildPlanSpecs } from '../../core/planMap/planSpecs';

const root = path.resolve(__dirname, '..', '..', '..');
const bundlePath = path.join(root, 'dist', 'webview', 'main.js');
const SHELL = { state: undefined, restricted: false, projectName: 'fixture', area: 'board', target: undefined, selection: undefined, notice: undefined, rows: [] };
const HISTORY = { available: true as const, label: 'Observed', entries: [] };
const OLD_TEXT = 'Let the agent report where the plan stands';
const REPORT = 'Let the agent report first — the plan and the ticks may differ';

function boot(): { dom: JSDOM; errors: string[] } {
    const errors: string[] = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (error) => errors.push(error.message));
    virtualConsole.on('error', (...args) => errors.push(args.join(' ')));
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
    (dom.window as unknown as Record<string, unknown>).acquireVsCodeApi = () => ({ postMessage: () => undefined });
    dom.window.eval(readFileSync(bundlePath, 'utf8'));
    return { dom, errors };
}

async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50));
}

function textOf(dom: JSDOM): string {
    const document = dom.window.document as unknown as { body: { textContent: string | null }; querySelectorAll(selector: string): Iterable<{ getAttribute(name: string): string | null }> };
    const attributes = [...document.querySelectorAll('[title], [aria-label]')].flatMap((element) => [element.getAttribute('title') ?? '', element.getAttribute('aria-label') ?? '']);
    return [document.body.textContent ?? '', ...attributes].join('\n');
}

async function render(files: Record<string, string>): Promise<string[]> {
    const model = await modelOf(files);
    const tips = parseStepTipSettings(true, {});
    const cards = buildCards(model.project, model.lifecycle);
    const board = { columns: arrangeBoard(cards, {}, 'number'), banner: buildBanner(model.project, model.lifecycle), filter: {}, sort: 'number', sortKeys: ['number', 'title', 'lastChange'], noSpecs: false, planSpecs: buildPlanSpecs(model, cards) };
    const send = (dom: JSDOM, data: unknown) => dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data }));
    const entry = model.lifecycle.entries[0]!;
    const selection = { stem: entry.stem, number: entry.number };
    const texts: string[] = [];
    for (const area of ['board', 'overview', 'planMap']) {
        const { dom, errors } = boot();
        await settle();
        send(dom, { v: 11, kind: 'evt', seq: 1, type: 'shell', payload: { view: { ...SHELL, area, selection: area === 'board' ? selection : undefined } } });
        send(dom, { v: 11, kind: 'evt', type: 'board', payload: { view: board } });
        send(dom, { v: 11, kind: 'evt', type: 'overview', payload: { view: buildOverviewView({ model, history: HISTORY, tips }) } });
        send(dom, { v: 11, kind: 'evt', type: 'detail', payload: { view: buildDetail({ selection: { stem: entry.stem, path: entry.key }, model, history: HISTORY, tips }) } });
        await settle();
        texts.push(textOf(dom));
        expect(errors).toEqual([]);
    }
    return texts;
}

describe('0028 AC-006: the rendered bundle shows Review and Report first, never the old report text', () => {
    beforeAll(() => {
        execFileSync(process.execPath, ['esbuild.js'], { cwd: root, stdio: 'pipe' });
    }, 60000);

    it('AC-001 fixture: Board with its detail, Overview and Plan map show /sdd-compile and Review', async () => {
        const texts = await render(CASE_FIXTURES['ac001-plan-in-progress']!);
        const joined = texts.join('\n');
        expect(joined).toContain('/sdd-compile');
        expect(joined).toContain('Have the result verified');
        expect(joined).toContain('Review');
        for (const text of texts) {
            expect(text).not.toContain(OLD_TEXT);
        }
    }, 60000);

    it('AC-004 fixture: the Board detail and the Overview show Let the agent report first, then the continue line', async () => {
        const texts = await render(CASE_FIXTURES['ac004-report-first']!);
        expect(texts[0]).toContain(REPORT);
        expect(texts[1]).toContain(REPORT);
        expect(texts[0]).toContain('Then: continue with T-003 Reject money values');
        for (const text of texts) {
            expect(text).not.toContain(OLD_TEXT);
        }
    }, 60000);

    it('negative control: a plan with only struck steps still renders the old text, so the check can fail', async () => {
        const texts = await render(CASE_FIXTURES['ac002-struck-only']!);
        expect(texts.join('\n')).toContain(OLD_TEXT);
    }, 60000);
});
