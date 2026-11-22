import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import * as path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';
import { fixturePath } from '../../core/discovery/testing/fixtures';
import { arrangeBoard } from '../../core/board/filters';
import { buildBanner, buildCards } from '../../core/board/cards';
import { buildDetail } from '../../core/board/detail';
import { buildPlanSpecs } from '../../core/planMap/planSpecs';
import { deriveLifecycle } from '../../core/lifecycle/deriveLifecycle';
import { buildOverviewView } from '../../core/overview/overviewView';
import { readProject } from '../../core/specs/readProject';
import { parseStepTipSettings, type StepTipSettings } from '../../core/settings/stepTipSettings';
import type { Offer } from '../../core/assistant/offer';
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

interface ElementLike {
    textContent: string | null;
    getAttribute(name: string): string | null;
}

interface Rendered {
    where: string;
    buttons: Array<{ text: string; name: string }>;
    texts: string[];
    coaches: number;
    html: string;
    splits: string[];
    menus: number;
    words: number;
}

function inspect(dom: JSDOM, where: string): Rendered {
    const document = dom.window.document as unknown as { body: ElementLike & { innerHTML: string }; querySelectorAll(selector: string): Iterable<ElementLike> };
    const place = (element: ElementLike): string => {
        const closest = (element as unknown as { closest(selector: string): unknown }).closest.bind(element);
        return closest('[data-plan-map]') !== null ? 'plan map' : closest('[data-card], [data-board-state]') !== null ? 'board' : closest('[data-up-next]') !== null ? 'up next' : closest('[data-now]') !== null ? 'now' : closest('.spec-detail') !== null ? 'detail' : closest('[data-zero-specs], .board-empty:not([data-welcome])') !== null ? 'empty state' : 'other';
    };
    const buttons = [...document.querySelectorAll('button')].map((button) => ({ text: button.textContent ?? '', name: button.getAttribute('aria-label') ?? '' }));
    const attributes = [...document.querySelectorAll('[title], [aria-label]')].flatMap((element) => [element.getAttribute('title'), element.getAttribute('aria-label')]).filter((value): value is string => value !== null);
    return { where, buttons, texts: [document.body.textContent ?? '', ...attributes], coaches: [...document.querySelectorAll('.step-coach, .ov-coach')].length, html: document.body.innerHTML, splits: [...document.querySelectorAll('.send-split')].map(place), menus: [...document.querySelectorAll('[role="menu"]')].length, words: (document.body.textContent ?? '').split(/\s+/).filter((word) => word !== '').length };
}

const SHELL_BOARD = { state: undefined, restricted: false, projectName: 'fixture', area: 'board', target: undefined, selection: undefined, notice: undefined, rows: [] };

async function renderFixture(name: string, tips?: StepTipSettings, offer?: Offer): Promise<Rendered[]> {
    const project = await readProject(createNodeSpecSource(), fixturePath(name), '1.10.0');
    const lifecycle = deriveLifecycle(project);
    const model = { project, lifecycle };
    const history = { available: true as const, label: 'Observed', entries: [] };
    const send = (dom: JSDOM, data: unknown) => dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data }));
    const rendered: Rendered[] = [];
    const cards = buildCards(project, lifecycle);
    const board = { columns: arrangeBoard(cards, {}, 'number'), banner: buildBanner(project, lifecycle), filter: {}, sort: 'number', sortKeys: ['number', 'title', 'lastChange'], noSpecs: cards.length === 0, planSpecs: [] };
    const boardDom = boot(readFileSync(bundlePath, 'utf8'));
    await settle();
    send(boardDom.dom, { v: 12, kind: 'evt', seq: 1, type: 'shell', payload: { view: SHELL_BOARD } });
    send(boardDom.dom, { v: 12, kind: 'evt', type: 'board', payload: { view: board } });
    await settle();
    rendered.push(inspect(boardDom.dom, `${name} board`));
    expect(boardDom.errors).toEqual([]);
    const overviewDom = boot(readFileSync(bundlePath, 'utf8'));
    await settle();
    send(overviewDom.dom, { v: 12, kind: 'evt', seq: 1, type: 'shell', payload: { view: { ...SHELL_BOARD, area: 'overview' } } });
    send(overviewDom.dom, { v: 12, kind: 'evt', type: 'overview', payload: { view: buildOverviewView({ model, history, ...(tips === undefined ? {} : { tips }), ...(offer === undefined ? {} : { offer }) }) } });
    await settle();
    rendered.push(inspect(overviewDom.dom, `${name} overview`));
    expect(overviewDom.errors).toEqual([]);
    const detailDom = boot(readFileSync(bundlePath, 'utf8'));
    await settle();
    for (const entry of lifecycle.entries) {
        const selection = { stem: entry.stem, number: entry.number };
        send(detailDom.dom, { v: 12, kind: 'evt', seq: rendered.length + 1, type: 'shell', payload: { view: { ...SHELL_BOARD, selection } } });
        send(detailDom.dom, { v: 12, kind: 'evt', type: 'board', payload: { view: board } });
        send(detailDom.dom, { v: 12, kind: 'evt', type: 'detail', payload: { view: buildDetail({ selection: { stem: entry.stem, path: entry.key }, model, history, ...(tips === undefined ? {} : { tips }), ...(offer === undefined ? {} : { offer }) }) } });
        await settle();
        rendered.push(inspect(detailDom.dom, `${name} detail ${entry.key}`));
    }
    expect(detailDom.errors).toEqual([]);
    return rendered;
}

function oldCopyLabels(rendered: Rendered[]): string[] {
    return rendered.flatMap((surface) => surface.buttons.filter((button) => button.text === 'Copy' || button.name.startsWith('Copy: ')).map((button) => `${surface.where}: ${button.text} / ${button.name}`));
}

const SWEPT_FIXTURES = ['fs110-ready-synthetic', 'fs110-de-active-review', 'fs110-parallel-synthetic', 'fs170-brownfield-mixed', 'fs180-de-baselines', 'fs180-en-done-archived', 'studio-0015', 'studio-0002', 'incomplete-specs-only', 'not-fs-agents-only', 'fs-broken'];

describe('0021 AC-008: no rendered surface of any fixture offers the old Copy', () => {
    beforeAll(() => {
        execFileSync(process.execPath, ['esbuild.js'], { cwd: root, stdio: 'pipe' });
    }, 60000);

    it.each(SWEPT_FIXTURES.map((name) => [name]))('%s: Board, Overview and every detail hold no button named Copy or Copy: <line>', async (name) => {
        const rendered = await renderFixture(name);
        expect(rendered.length).toBeGreaterThanOrEqual(2);
        expect(oldCopyLabels(rendered)).toEqual([]);
    }, 60000);

    it('the empty states, the Board and the Overview of a project with no spec, offer Copy prompt of /sdd-specify', async () => {
        const rendered = await renderFixture('incomplete-specs-only');
        const names = rendered.flatMap((surface) => surface.buttons.map((button) => button.name));
        expect(names.filter((name) => name === 'Copy prompt: /sdd-specify').length).toBeGreaterThanOrEqual(1);
    }, 60000);

    it('a project with steps offers Copy prompt named with the line on cards, rows and in the detail', async () => {
        const rendered = await renderFixture('fs110-ready-synthetic');
        const names = new Set(rendered.flatMap((surface) => surface.buttons.map((button) => button.name)));
        expect([...names].some((name) => /^Copy prompt: (?:Start|Implement|\/sdd-)/.test(name))).toBe(true);
        expect(rendered.flatMap((surface) => surface.buttons.map((button) => button.text)).filter((text) => text.startsWith('Copy'))).toContain('Copy prompt');
    }, 60000);

    it('negative control: the check finds a button that reads Copy and one named Copy: <line>', () => {
        const stale: Rendered[] = [{ where: 'x', buttons: [{ text: 'Copy', name: 'Copy: /sdd-plan k' }, { text: 'Copy prompt', name: 'Copy prompt: /sdd-plan k' }], texts: [], coaches: 0, html: '', splits: [], menus: 0, words: 0 }];
        expect(oldCopyLabels(stale)).toEqual(['x: Copy / Copy: /sdd-plan k']);
    });
});

const MODEL_NAME = /opus|sonnet|haiku|gpt-|gemini|llama|mistral/i;

describe('0021 AC-009, AC-010, AC-013: the coach line in the rendered bundle, over the fixtures', () => {
    beforeAll(() => {
        execFileSync(process.execPath, ['esbuild.js'], { cwd: root, stdio: 'pipe' });
    }, 60000);

    const SHOW = parseStepTipSettings(true, {});

    it.each(SWEPT_FIXTURES.map((name) => [name]))('%s: tips on and no model hint, at most one coach line per Overview and per detail, none on the Board, and no model name in any text or title', async (name) => {
        const rendered = await renderFixture(name, SHOW);
        for (const surface of rendered) {
            if (surface.where.endsWith(' board')) {
                expect(surface.coaches, surface.where).toBe(0);
            } else {
                expect(surface.coaches, surface.where).toBeLessThanOrEqual(1);
            }
            for (const text of surface.texts) {
                expect(text, surface.where).not.toMatch(MODEL_NAME);
            }
        }
    }, 60000);

    it('a project with steps shows the coach line in its Overview and in the detail of a spec with a step; with tips off no surface shows one', async () => {
        const on = await renderFixture('fs110-de-active-review', SHOW);
        expect(on.filter((surface) => surface.where.endsWith(' overview') && surface.coaches === 1)).toHaveLength(1);
        expect(on.filter((surface) => surface.where.includes(' detail ') && surface.coaches === 1).length).toBeGreaterThan(0);
        const off = await renderFixture('fs110-de-active-review', parseStepTipSettings(false, { strong: 'X' }));
        expect(off.every((surface) => surface.coaches === 0)).toBe(true);
        const none = await renderFixture('fs110-de-active-review');
        expect(none.every((surface) => surface.coaches === 0)).toBe(true);
    }, 60000);

    it('a model hint shows in a coach line and nowhere else in the product text', async () => {
        const named = await renderFixture('fs110-ready-synthetic', parseStepTipSettings(true, { strong: 'MyStrong', fast: 'MyFast' }));
        const joined = named.flatMap((surface) => surface.texts).join('\n');
        expect(joined).toMatch(/strong model \(MyStrong\)|fast model \(MyFast\)/);
    }, 60000);
});

interface MapRendered {
    where: string;
    primaries: number;
    headerPrimaries: number;
    headerSends: number;
    unnamedCopies: string[];
    texts: string[];
    cards: number;
    splits: number;
}

async function renderMap(name: string, offer?: Offer): Promise<MapRendered[]> {
    const project = await readProject(createNodeSpecSource(), fixturePath(name), '1.10.0');
    const lifecycle = deriveLifecycle(project);
    const model = { project, lifecycle };
    const history = { available: true as const, label: 'Observed', entries: [] };
    const send = (dom: JSDOM, data: unknown) => dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data }));
    const cards = buildCards(project, lifecycle);
    const board = { columns: arrangeBoard(cards, {}, 'number'), banner: buildBanner(project, lifecycle), filter: {}, sort: 'number', sortKeys: ['number', 'title', 'lastChange'], noSpecs: cards.length === 0, planSpecs: buildPlanSpecs(model, cards) };
    const rendered: MapRendered[] = [];
    const dom = boot(readFileSync(bundlePath, 'utf8'));
    await settle();
    let seq = 0;
    const look = (where: string): void => {
        const document = dom.dom.window.document as unknown as { body: ElementLike; querySelectorAll(selector: string): Iterable<ElementLike & { classList: { contains(name: string): boolean } }> };
        const copies = [...document.querySelectorAll('[data-plan-map] button.copy-button, [data-plan-map] button.copy-icon')];
        const attributes = [...document.querySelectorAll('[data-plan-map] [title], [data-plan-map] [aria-label]')].flatMap((element) => [element.getAttribute('title'), element.getAttribute('aria-label')]).filter((value): value is string => value !== null);
        const mapText = [...document.querySelectorAll('[data-plan-map]')].map((element) => element.textContent ?? '').join('\n');
        const isPrimary = (button: ElementLike & { classList: { contains(name: string): boolean } }): boolean => button.classList.contains('copy-button') && !button.classList.contains('copy-secondary');
        const header = [...document.querySelectorAll('[data-plan-map] .plan-map-header button.copy-button, [data-plan-map] .plan-map-header button.copy-icon')];
        const headerSplit = [...document.querySelectorAll('[data-plan-map] .plan-map-header .send-split, [data-plan-map] .plan-map-header .send-arrow, [data-plan-map] .plan-map-header [role="menu"]')].length;
        rendered.push({
            where,
            primaries: copies.filter(isPrimary).length - header.filter(isPrimary).length,
            headerPrimaries: header.filter(isPrimary).length,
            headerSends: headerSplit,
            unnamedCopies: copies.map((button) => button.getAttribute('aria-label') ?? '').filter((label) => !label.startsWith('Copy prompt: ')),
            texts: [mapText, ...attributes],
            cards: [...document.querySelectorAll('[data-step-card]')].length,
            splits: [...document.querySelectorAll('[data-plan-map] .send-split, [data-plan-map] .send-arrow, [data-plan-map] [role="menu"]')].length - headerSplit,
        });
    };
    for (const entry of lifecycle.entries) {
        seq += 1;
        const selection = { stem: entry.stem, number: entry.number };
        send(dom.dom, { v: 12, kind: 'evt', seq, type: 'shell', payload: { view: { ...SHELL_BOARD, area: 'planMap', selection } } });
        send(dom.dom, { v: 12, kind: 'evt', type: 'board', payload: { view: board } });
        send(dom.dom, { v: 12, kind: 'evt', type: 'detail', payload: { view: buildDetail({ selection: { stem: entry.stem, path: entry.key }, model, history, ...(offer === undefined ? {} : { offer }) }) } });
        await settle();
        look(`${name} map ${entry.key}`);
    }
    seq += 1;
    send(dom.dom, { v: 12, kind: 'evt', seq, type: 'shell', payload: { view: { ...SHELL_BOARD, area: 'planMap' } } });
    await settle();
    look(`${name} map without selection`);
    expect(dom.errors).toEqual([]);
    return rendered;
}

const MAP_FORBIDDEN = /\b(?:S-[A-Z]{3,}|R-[1-7]|NS-\d|struck|sibling|kind|stem|parsing)\b/;

describe('0023 AC-010, AC-015: the rendered Plan map over the fixtures', () => {
    beforeAll(() => {
        execFileSync(process.execPath, ['esbuild.js'], { cwd: root, stdio: 'pipe' });
    }, 60000);

    it.each(SWEPT_FIXTURES.map((name) => [name]))('%s: no primary button below the header (0025 AC-010: at most one in it), every Copy named "Copy prompt: <line>", and no rule ID or internal word in any text or title', async (name) => {
        const rendered = await renderMap(name);
        expect(rendered.length).toBeGreaterThanOrEqual(1);
        for (const surface of rendered) {
            expect(surface.primaries, surface.where).toBe(0);
            expect(surface.headerPrimaries, surface.where).toBeLessThanOrEqual(1);
            expect(surface.unnamedCopies, surface.where).toEqual([]);
            for (const text of surface.texts) {
                expect(text, surface.where).not.toMatch(MAP_FORBIDDEN);
            }
        }
    }, 60000);

    it('a fixture with a plan renders cards in the map', async () => {
        const rendered = await renderMap('fs110-parallel-synthetic');
        expect(rendered.some((surface) => surface.cards > 0)).toBe(true);
    }, 60000);

    it('negative control: the pattern finds a rule ID and an internal word', () => {
        expect('Stage 2 R-3').toMatch(MAP_FORBIDDEN);
        expect('a struck step').toMatch(MAP_FORBIDDEN);
        expect('sibling of kind stem parsing NS-6').toMatch(MAP_FORBIDDEN);
        expect('Stage 2 — add and subtract').not.toMatch(MAP_FORBIDDEN);
    });
});

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
            'Plan map',
        ]);
        expect(document.body.textContent).toContain('Loading project…');
        expect(posted[0]).toMatchObject({ v: 12, kind: 'req', type: 'hello' });
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
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 12, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        await settle();
        expect(dom.window.document.body.textContent).not.toContain('Loading project…');
        expect(dom.window.document.querySelector('h1')?.textContent).toBe('Board');
        expect(errors).toEqual([]);
    });

    it('mounts the Board with a snapshot of a fixture project: six columns, the cards, no start-up error', async () => {
        const project = await readProject(createNodeSpecSource(), fixturePath('fs110-ready-synthetic'), '1.10.0');
        const lifecycle = deriveLifecycle(project);
        const cards = buildCards(project, lifecycle);
        const board = { columns: arrangeBoard(cards, {}, 'number'), banner: buildBanner(project, lifecycle), filter: {}, sort: 'number', sortKeys: ['number', 'title', 'lastChange'], noSpecs: false, planSpecs: [] };
        const { dom, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const view = { state: undefined, restricted: false, projectName: 'demo', area: 'board', target: undefined, selection: undefined, notice: undefined, rows: [] };
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 12, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 12, kind: 'evt', type: 'board', payload: { view: board } } }));
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
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 12, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 12, kind: 'evt', type: 'overview', payload: { view: mission } } }));
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
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 12, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 12, kind: 'evt', type: 'overview', payload: { view: { header: {}, extra: 1 } } } }));
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
            tips: parseStepTipSettings(true, {}),
        });
        expect(detail.kind).toBe('spec');
        const { dom, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const view = { state: undefined, restricted: false, projectName: 'fixture', area: 'board', target: undefined, selection: { stem: '0015-focus-on-visibility', number: '0015' }, notice: undefined, rows: [] };
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 12, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 12, kind: 'evt', type: 'detail', payload: { view: detail } } }));
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

    it('0027 AC-003: the same detail at FeatherSpec 1.11.0 with Claude Code (a Send with its attachment line) stays within 300 words', async () => {
        const project = await readProject(createNodeSpecSource(), fixturePath('studio-0015'), '1.11.0');
        const lifecycle = deriveLifecycle(project);
        const detail = buildDetail({
            selection: { stem: '0015-focus-on-visibility' },
            model: { project, lifecycle },
            history: { available: true, label: 'Observed', entries: [] },
            tips: parseStepTipSettings(true, {}),
            offer: { assistant: 'claudeCode' },
        });
        expect(detail.kind === 'spec' && 'send' in detail.nextStep ? detail.nextStep.send?.attach?.name : undefined).toBe('0015-focus-on-visibility.md');
        const { dom, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const view = { state: undefined, restricted: false, projectName: 'fixture', area: 'board', target: undefined, selection: { stem: '0015-focus-on-visibility', number: '0015' }, notice: undefined, rows: [] };
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 12, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 12, kind: 'evt', type: 'detail', payload: { view: detail } } }));
        await settle();
        const section = dom.window.document.querySelector('.spec-detail') as unknown as QueryRoot | null;
        expect(section).not.toBeNull();
        const clone = section!.cloneNode(true);
        [...clone.querySelectorAll('.visually-hidden, [hidden]')].forEach((hidden) => hidden.remove());
        const text = (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
        expect(text).not.toContain('attached when sent');
        expect(text.split(' ').filter((word) => word !== '').length).toBeLessThanOrEqual(300);
        expect(errors).toEqual([]);
    });

    it('control: a script that throws at start-up is reported through the same harness', () => {
        const { errors } = boot('throw new Error("broken bundle");');
        expect(errors.length).toBeGreaterThan(0);
    });
});

const OFFERS: Offer[] = [{ assistant: 'copilot' }, { assistant: 'claudeCode' }];

describe('0024 AC-002, AC-003: Send in the rendered bundle, over the fixtures', () => {
    beforeAll(() => {
        execFileSync(process.execPath, ['esbuild.js'], { cwd: root, stdio: 'pipe' });
    }, 60000);

    const stray = (rendered: Rendered[]): string[] => rendered.flatMap((surface) => surface.splits.filter((place) => place !== 'detail' && place !== 'now' && place !== 'empty state').map((place) => `${surface.where}: ${place}`));

    it.each(SWEPT_FIXTURES.flatMap((name) => OFFERS.map((offer) => [name, offer.assistant, offer] as const)))('%s with %s: split buttons sit in a detail or the first Now row only, one per surface, none open', async (name, _assistant, offer) => {
        const rendered = await renderFixture(name, undefined, offer);
        expect(stray(rendered)).toEqual([]);
        for (const surface of rendered) {
            // 0031 §6.1 (amends 0024 §6.3): a detail may hold the first line's split button and one for its follow-up line.
            expect(surface.splits.length, surface.where).toBeLessThanOrEqual(surface.where.includes(' detail ') ? 2 : 1);
            expect(surface.menus, surface.where).toBe(0);
            if (surface.where.endsWith('board')) {
                // 0035 AC-007 (amends 0024 AC-003): the empty state No specs yet holds the one step action.
                expect(surface.splits.filter((place) => place !== 'empty state'), surface.where).toEqual([]);
            }
            if (surface.where.endsWith('overview')) {
                expect(surface.splits.filter((place) => place === 'detail'), surface.where).toEqual([]);
            }
        }
    }, 60000);

    it.each(OFFERS.map((offer) => [offer.assistant, offer] as const))('the Plan map of the fixtures holds no Send control below its header, and at most one in it (0025 AC-010), with %s offered', async (_assistant, offer) => {
        for (const name of ['studio-0015', 'studio-0002', 'fs110-ready-synthetic']) {
            const rendered = await renderMap(name, offer);
            expect(rendered.length, name).toBeGreaterThan(0);
            expect(rendered.filter((surface) => surface.splits > 0).map((surface) => surface.where), name).toEqual([]);
            // 0031 §6.1: a split button counts its main/arrow wrapper and its arrow; the header may hold one for the first line and one for a follow-up line.
            expect(rendered.every((surface) => surface.headerSends <= 6), name).toBe(true);
        }
    }, 120000);

    it('a project with steps shows Send to <Name> on the first Now row and in the detail for each assistant', async () => {
        for (const [offer, label] of [[OFFERS[0]!, 'Send to Copilot'], [OFFERS[1]!, 'Send to Claude Code']] as const) {
            const rendered = (await Promise.all(['fs110-ready-synthetic', 'fs110-de-active-review', 'studio-0015', 'fs170-brownfield-mixed'].map((name) => renderFixture(name, undefined, offer)))).flat();
            const buttons = rendered.flatMap((surface) => surface.buttons.map((button) => button.text));
            expect(buttons, label).toContain(label);
            expect(rendered.some((surface) => surface.splits.includes('now')), label).toBe(true);
            expect(rendered.some((surface) => surface.splits.includes('detail')), label).toBe(true);
        }
    }, 60000);

    it('with no offer the DOM holds no Send control and equals the render with the offer left out', async () => {
        for (const name of ['fs110-ready-synthetic', 'studio-0015']) {
            const plain = await renderFixture(name);
            const none = await renderFixture(name, undefined, undefined);
            expect(plain.flatMap((surface) => surface.splits), name).toEqual([]);
            expect(plain.map((surface) => surface.html), name).toEqual(none.map((surface) => surface.html));
            expect(plain.flatMap((surface) => surface.buttons.map((button) => `${button.text}|${button.name}`)).filter((text) => /Send to|More actions/.test(text)), name).toEqual([]);
        }
    }, 120000);

    it('0019 AC-010 also with Send offered: the detail of spec 0015 holds at most 300 words, closed sections, for each assistant', async () => {
        for (const offer of OFFERS) {
            const project = await readProject(createNodeSpecSource(), fixturePath('studio-0015'), '1.10.0');
            const lifecycle = deriveLifecycle(project);
            const detail = buildDetail({ selection: { stem: '0015-focus-on-visibility' }, model: { project, lifecycle }, history: { available: true, label: 'Observed', entries: [] }, tips: parseStepTipSettings(true, {}), offer });
            const { dom, errors } = boot(readFileSync(bundlePath, 'utf8'));
            await settle();
            const view = { state: undefined, restricted: false, projectName: 'fixture', area: 'board', target: undefined, selection: { stem: '0015-focus-on-visibility', number: '0015' }, notice: undefined, rows: [] };
            dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 12, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
            dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 12, kind: 'evt', type: 'detail', payload: { view: detail } } }));
            await settle();
            const section = dom.window.document.querySelector('.spec-detail') as unknown as QueryRoot | null;
            expect(section).not.toBeNull();
            const clone = section!.cloneNode(true);
            const sends = [...clone.querySelectorAll('.send-split')].length;
            [...clone.querySelectorAll('.visually-hidden, [hidden]')].forEach((hidden) => hidden.remove());
            const words = (clone.textContent ?? '').replace(/\s+/g, ' ').trim().split(' ').filter((word) => word !== '');
            expect(sends, offer.assistant).toBeLessThanOrEqual(2);
            expect(words.length, offer.assistant).toBeLessThanOrEqual(300);
            expect(errors).toEqual([]);
        }
    }, 60000);

    it('negative control: the sweep sees a split button outside the detail and the first Now row', () => {
        const planted: Rendered[] = [{ where: 'x board', buttons: [], texts: [], coaches: 0, html: '', splits: ['board', 'detail'], menus: 0, words: 0 }];
        expect(stray(planted)).toEqual(['x board: board']);
    });
});
