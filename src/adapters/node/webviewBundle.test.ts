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
    cloneNode(deep: boolean): QueryRoot;
    remove(): void;
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

    it('starts without a runtime error, renders the frame with the two areas and the loading state, and says hello', async () => {
        const { dom, posted, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const document = dom.window.document;
        expect([...document.querySelectorAll('nav button')].map((button) => button.textContent?.replace('▸', ''))).toEqual([
            'Overview',
            'Board',
        ]);
        expect(document.body.textContent).toContain('Loading project…');
        expect(posted[0]).toMatchObject({ v: 5, kind: 'req', type: 'hello' });
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
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 5, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        await settle();
        expect(dom.window.document.body.textContent).not.toContain('Loading project…');
        expect(dom.window.document.querySelector('h1')?.textContent).toBe('Board');
        expect(errors).toEqual([]);
    });

    it('mounts the Board with a snapshot of a fixture project: six columns, the cards, no start-up error', async () => {
        const project = await readProject(createNodeSpecSource(), fixturePath('fs110-ready-synthetic'), '1.10.0');
        const lifecycle = deriveLifecycle(project);
        const cards = buildCards(project, lifecycle);
        const board = { columns: arrangeBoard(cards, {}, 'number'), banner: buildBanner(project, lifecycle), filter: {}, sort: 'number', sortKeys: ['number', 'title', 'lastChange'], noSpecs: false };
        const { dom, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const view = { state: undefined, restricted: false, projectName: 'demo', area: 'board', target: undefined, selection: undefined, notice: undefined, rows: [] };
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 5, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 5, kind: 'evt', type: 'board', payload: { view: board } } }));
        await settle();
        const document = dom.window.document;
        expect(document.querySelector('h1')?.textContent).toBe('Board');
        expect([...document.querySelectorAll('[data-column]')].map((column) => (column as unknown as { getAttribute(name: string): string | null }).getAttribute('data-column'))).toEqual(['Backlog', 'Ready', 'Active', 'Review', 'Done', 'Blocked']);
        expect(document.querySelectorAll('[data-card]')).toHaveLength(cards.length);
        expect(cards.length).toBeGreaterThan(0);
        const attribute = (element: unknown, name: string): string | null | undefined => (element as { getAttribute(name: string): string | null } | null)?.getAttribute(name);
        expect(attribute(document.querySelector('[data-column="Ready"] .column-heading'), 'title')).toBe('Plan written, not started yet · Derived from the files · rule S-READY');
        expect(attribute(document.querySelector('[data-column="Ready"] [data-card]'), 'aria-label')).toMatch(/, Ready$/);
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
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 5, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 5, kind: 'evt', type: 'overview', payload: { view: mission } } }));
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
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 5, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 5, kind: 'evt', type: 'overview', payload: { view: { header: {}, extra: 1 } } } }));
        await settle();
        expect(dom.window.document.querySelector('[data-overview]')).toBeNull();
        expect(dom.window.document.querySelector('[data-overview-empty]')).not.toBeNull();
        expect(errors).toEqual([]);
    });

    it('0019 AC-010: the detail of this repo\'s spec 0015 (fixture studio-0015, real core) shows no FR- row text and at most 300 words with the collapsible sections closed', async () => {
        const project = await readProject(createNodeSpecSource(), fixturePath('studio-0015'), '1.10.0');
        const lifecycle = deriveLifecycle(project);
        const detail = buildDetail({
            selection: { stem: '0015-focus-on-visibility' },
            model: { project, lifecycle },
            history: { available: true, label: 'Observed', entries: [] },
        });
        expect(detail.kind).toBe('spec');
        const { dom, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const view = { state: undefined, restricted: false, projectName: 'fixture', area: 'board', target: undefined, selection: { stem: '0015-focus-on-visibility', number: '0015' }, notice: undefined, rows: [] };
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 5, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 5, kind: 'evt', type: 'detail', payload: { view: detail } } }));
        await settle();
        const section = dom.window.document.querySelector('.spec-detail') as unknown as QueryRoot | null;
        expect(section).not.toBeNull();
        const clone = section!.cloneNode(true);
        [...clone.querySelectorAll('.visually-hidden, [hidden]')].forEach((hidden) => hidden.remove());
        const text = (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
        const requirements = project.specs.find((spec) => spec.key.endsWith('0015-focus-on-visibility.md'))?.parsed?.requirements ?? [];
        expect(requirements.length).toBeGreaterThan(5);
        for (const requirement of requirements) {
            const own = requirement.text.replace(/^\|?\s*FR-[\d.]+\s*\|?\s*/, '').split('|')[0]?.trim() ?? '';
            expect(own.length, requirement.id).toBeGreaterThan(10);
            expect(text, requirement.id).not.toContain(own.slice(0, 40));
        }
        const words = text.split(' ').filter((word) => word !== '');
        expect(words.length).toBeLessThanOrEqual(300);
        expect(text).toContain('28 of 30 verified');
        expect(text).toContain('AC-027');
        expect(text).toContain('AC-030');
        expect([...clone.querySelectorAll('button.file-link')].length).toBeGreaterThan(3);
        expect(errors).toEqual([]);
    });

    it('control: a script that throws at start-up is reported through the same harness', () => {
        const { errors } = boot('throw new Error("broken bundle");');
        expect(errors.length).toBeGreaterThan(0);
    });
});
