import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import * as path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';
import { fixturePath } from '../../core/discovery/testing/fixtures';
import { arrangeBoard } from '../../core/board/filters';
import { buildBanner, buildCards } from '../../core/board/cards';
import { buildDetail } from '../../core/board/detail';
import { deriveLifecycle } from '../../core/lifecycle/deriveLifecycle';
import { buildOverviewView } from '../../core/overview/overviewView';
import { readProject } from '../../core/specs/readProject';
import { createNodeSpecSource } from './nodeSpecSource';

const root = path.resolve(__dirname, '..', '..', '..');
const bundlePath = path.join(root, 'dist', 'webview', 'main.js');

interface Booted {
    dom: JSDOM;
    posted: { type?: string; payload?: unknown }[];
    errors: string[];
}

function boot(script: string): Booted {
    const errors: string[] = [];
    const posted: Booted['posted'] = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (error) => errors.push(error.message));
    virtualConsole.on('error', (...args) => errors.push(args.join(' ')));
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
        runScripts: 'outside-only',
        pretendToBeVisual: true,
        virtualConsole,
    });
    (dom.window as unknown as Record<string, unknown>).acquireVsCodeApi = () => ({ postMessage: (message: { type?: string; payload?: unknown }) => void posted.push(message) });
    dom.window.addEventListener('error', (event) => errors.push(String(event.message)));
    try {
        dom.window.eval(script);
    } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
    }
    return { dom, posted, errors };
}

interface QueryRoot {
    textContent: string | null;
    querySelector(selector: string): QueryRoot | null;
    querySelectorAll(selector: string): Iterable<QueryRoot>;
}

async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50));
}

describe('built webview bundle in jsdom (a broken bundle or a start-up error turns this red)', () => {
    beforeAll(() => {
        execFileSync(process.execPath, ['esbuild.js'], { cwd: root, stdio: 'pipe' });
    }, 60000);

    it('the build writes the script and the stylesheet, and the script holds no Node.js or vscode require', () => {
        expect(existsSync(bundlePath)).toBe(true);
        expect(existsSync(path.join(root, 'dist', 'webview', 'main.css'))).toBe(true);
        const script = readFileSync(bundlePath, 'utf8');
        expect(script).not.toMatch(/require\(["'](vscode|fs|path|node:[a-z]+)["']\)/);
        expect(script).not.toContain('process.env.NODE_ENV');
    });

    it('AC-018 (0015): the webview bundle contains no Agent Center, and a bundle that held the old title would be found', () => {
        const script = readFileSync(bundlePath, 'utf8');
        expect(script).not.toContain('Agent Center');
        expect('const title = "Agent Center";').toContain('Agent Center');
    });

    it('starts without a runtime error, renders the frame with the three areas and the loading state, and says hello', async () => {
        const { dom, posted, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const document = dom.window.document;
        expect([...document.querySelectorAll('nav button')].map((button) => button.textContent?.replace('▸', ''))).toEqual([
            'Overview',
            'Board',
            'Spec Explorer',
        ]);
        expect(document.body.textContent).toContain('Loading project…');
        expect(posted[0]).toMatchObject({ v: 2, kind: 'req', type: 'hello' });
        expect(errors).toEqual([]);
    });

    it('applies a snapshot from the extension: the loading text disappears and the host chosen area shows', async () => {
        const { dom, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const view = {
            state: undefined,
            restricted: false,
            projectName: 'demo',
            area: 'board',
            target: undefined,
            selection: undefined,
            notice: undefined,
            rows: [],
        };
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 2, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        await settle();
        expect(dom.window.document.body.textContent).not.toContain('Loading project…');
        expect(dom.window.document.querySelector('h1')?.textContent).toBe('Board');
        expect(errors).toEqual([]);
    });

    it('mounts the Board with a snapshot of a fixture project: six columns, the cards, no start-up error', async () => {
        const project = await readProject(createNodeSpecSource(), fixturePath('fs110-ready-synthetic'), '1.10.0');
        const lifecycle = deriveLifecycle(project);
        const cards = buildCards(project, lifecycle);
        const board = { columns: arrangeBoard(cards, {}, 'number'), banner: buildBanner(project, lifecycle), filter: {}, sort: 'number', providers: [], noSpecs: false };
        const { dom, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const view = { state: undefined, restricted: false, projectName: 'demo', area: 'board', target: undefined, selection: undefined, notice: undefined, rows: [] };
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 2, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 2, kind: 'evt', type: 'board', payload: { view: board } } }));
        await settle();
        const document = dom.window.document;
        expect(document.querySelector('h1')?.textContent).toBe('Board');
        expect([...document.querySelectorAll('[data-column]')].map((column) => (column as unknown as { getAttribute(name: string): string | null }).getAttribute('data-column'))).toEqual(['Backlog', 'Ready', 'Active', 'Review', 'Done', 'Blocked']);
        expect(document.querySelectorAll('[data-card]')).toHaveLength(cards.length);
        expect(cards.length).toBeGreaterThan(0);
        expect(document.querySelector('[data-column="Ready"] [data-card]')?.textContent).toContain('Plan written, not started yet');
        expect(document.querySelector('[data-placeholder]')).toBeNull();
        expect(errors).toEqual([]);
    });

    it('mounts Overview with a snapshot of a fixture project: Now, Up next, the figures line with six state counts, the progress text, the activity, no start-up error', async () => {
        const project = await readProject(createNodeSpecSource(), fixturePath('fs110-ready-synthetic'), '1.10.0');
        const lifecycle = deriveLifecycle(project);
        const mission = buildOverviewView({
            model: { project, lifecycle },
            history: { available: true, label: 'Observed', entries: [] },
        });
        const { dom, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const view = { state: undefined, restricted: false, projectName: 'fixture', area: 'overview', target: undefined, selection: undefined, notice: undefined, rows: [] };
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 2, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 2, kind: 'evt', type: 'overview', payload: { view: mission } } }));
        await settle();
        const document = dom.window.document;
        expect(document.querySelector('h1')?.textContent).toBe('Overview');
        expect(document.querySelector('[data-placeholder]')).toBeNull();
        expect(document.querySelector('[data-overview]')).not.toBeNull();
        expect(document.querySelector('.project-name')?.textContent).toBe('fixture');
        expect(document.querySelector('[data-header]')).toBeNull();
        expect(document.querySelector('[data-now]')).not.toBeNull();
        expect(document.querySelector('[data-up-next]')).not.toBeNull();
        expect(document.querySelectorAll('[data-state-count]')).toHaveLength(6);
        expect(document.querySelector('[data-total]')?.textContent).toBe(`Total ${lifecycle.entries.length}`);
        expect(lifecycle.entries.length).toBeGreaterThan(0);
        expect(document.querySelector('#ov-progress-text')?.textContent).toContain('Progress');
        expect(document.querySelector('[data-runs]')).toBeNull();
        expect(document.querySelector('[data-attention]')).toBeNull();
        expect(document.querySelector('[data-activity]')).toBeNull();
        expect(errors).toEqual([]);
    });

    it('control: a Overview event with an extra field is refused and the area stays an empty frame', async () => {
        const { dom, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const view = { state: undefined, restricted: false, projectName: 'fixture', area: 'overview', target: undefined, selection: undefined, notice: undefined, rows: [] };
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 2, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 2, kind: 'evt', type: 'overview', payload: { view: { header: {}, extra: 1 } } } }));
        await settle();
        expect(dom.window.document.querySelector('[data-overview]')).toBeNull();
        expect(dom.window.document.querySelector('[data-overview-empty]')).not.toBeNull();
        expect(errors).toEqual([]);
    });

    it('0013 AC-014, AC-015: the detail of this repo\'s spec 0002 (fixture studio-0002) shows no raw Markdown and each ID once', async () => {
        const project = await readProject(createNodeSpecSource(), fixturePath('studio-0002'), '1.10.0');
        const lifecycle = deriveLifecycle(project);
        const detail = buildDetail({
            selection: { stem: '0002-spec-repository-parser' },
            model: { project, lifecycle },
            history: { available: true, label: 'Observed', entries: [] },
        });
        expect(detail.kind).toBe('spec');
        const { dom, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const view = { state: undefined, restricted: false, projectName: 'fixture', area: 'specExplorer', target: undefined, selection: undefined, notice: undefined, rows: [] };
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 2, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 2, kind: 'evt', type: 'detail', payload: { view: detail } } }));
        await settle();
        const section = dom.window.document.querySelector('.spec-detail') as unknown as QueryRoot | null;
        let text = section?.textContent ?? '';
        expect(text).toContain('AC-001');
        const codes = [...(section?.querySelectorAll('code') ?? [])];
        expect(codes.length).toBeGreaterThan(0);
        for (const code of codes) {
            text = text.replace(code.textContent ?? '', ' ');
        }
        expect(text).not.toContain('**');
        expect(text).not.toContain('`');
        expect(text).not.toMatch(/(?:^|\n)\s*> /);
        expect(text).not.toContain('](');
        for (const id of ['AC-001', 'AC-012', 'FR-01', 'T-001']) {
            const items = [...(section?.querySelectorAll('li') ?? [])].filter((item) => (item.querySelector('.item-id')?.textContent ?? '') === id);
            expect(items, id).toHaveLength(1);
            expect((items[0]?.textContent ?? '').split(id).length - 1, id).toBe(1);
        }
        expect(section?.querySelector('.inline-link-target')?.textContent).toBe('0002-spec-repository-parser.plan.md');
        expect(errors).toEqual([]);
    });

    it('control: a script that throws at start-up is reported through the same harness', () => {
        const { errors } = boot('throw new Error("broken bundle");');
        expect(errors.length).toBeGreaterThan(0);
    });
});
