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
import { buildMissionControlView } from '../../core/missionControl/missionControlView';
import { readProject } from '../../core/specs/readProject';
import { buildStartPrompt } from '../../core/agentStart/startPrompt';
import { isAgentStartView } from '../../shared/protocol/agentStart';
import { isAgentCenterView, isTimelinePayload } from '../../shared/protocol/agentCenter';
import { sampleCenterView, sampleDetail, sampleRow } from '../../shared/protocol/testing/agentCenterSample';
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

    it('starts without a runtime error, renders the frame with the four areas and the loading state, and says hello', async () => {
        const { dom, posted, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const document = dom.window.document;
        expect([...document.querySelectorAll('nav button')].map((button) => button.textContent?.replace('▸', ''))).toEqual([
            'Mission Control',
            'Spec Board',
            'Spec Explorer',
            'Agent Center',
        ]);
        expect(document.body.textContent).toContain('Loading project…');
        expect(posted[0]).toMatchObject({ v: 1, kind: 'req', type: 'hello' });
        expect(errors).toEqual([]);
    });

    it('applies a snapshot from the extension: the loading text disappears and the host chosen area shows', async () => {
        const { dom, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const view = {
            state: undefined,
            restricted: false,
            projectName: 'demo',
            area: 'specBoard',
            target: undefined,
            selection: undefined,
            notice: undefined,
            rows: [],
        };
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 1, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        await settle();
        expect(dom.window.document.body.textContent).not.toContain('Loading project…');
        expect(dom.window.document.querySelector('h1')?.textContent).toBe('Spec Board');
        expect(errors).toEqual([]);
    });

    it('mounts the Spec Board with a snapshot of a fixture project: six columns, the cards, no start-up error', async () => {
        const project = await readProject(createNodeSpecSource(), fixturePath('fs110-ready-synthetic'), '1.10.0');
        const lifecycle = deriveLifecycle(project);
        const cards = buildCards(project, lifecycle);
        const board = { columns: arrangeBoard(cards, {}, 'number'), banner: buildBanner(project, lifecycle), filter: {}, sort: 'number', providers: [], noSpecs: false };
        const { dom, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const view = { state: undefined, restricted: false, projectName: 'demo', area: 'specBoard', target: undefined, selection: undefined, notice: undefined, rows: [] };
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 1, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 1, kind: 'evt', type: 'board', payload: { view: board } } }));
        await settle();
        const document = dom.window.document;
        expect(document.querySelector('h1')?.textContent).toBe('Spec Board');
        expect([...document.querySelectorAll('[data-column]')].map((column) => (column as unknown as { getAttribute(name: string): string | null }).getAttribute('data-column'))).toEqual(['Backlog', 'Ready', 'Active', 'Review', 'Done', 'Blocked']);
        expect(document.querySelectorAll('[data-card]')).toHaveLength(cards.length);
        expect(cards.length).toBeGreaterThan(0);
        expect(document.querySelector('[data-column="Ready"] [data-card]')?.textContent).toContain('Derived: draft with a plan that has not started');
        expect(document.querySelector('[data-placeholder]')).toBeNull();
        expect(errors).toEqual([]);
    });

    it('mounts Mission Control with a snapshot of a fixture project: header, six state counts, progress, the run section, the attention list, the activity, no start-up error', async () => {
        const project = await readProject(createNodeSpecSource(), fixturePath('fs110-ready-synthetic'), '1.10.0');
        const lifecycle = deriveLifecycle(project);
        const mission = buildMissionControlView({
            model: { project, lifecycle },
            active: { name: 'fixture', version: '1.10.0' },
            updatedAt: '2026-11-16T10:00:00.000Z',
            runs: { available: true, runs: [] },
            history: { available: true, label: 'Observed', entries: [] },
        });
        const { dom, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const view = { state: undefined, restricted: false, projectName: 'fixture', area: 'missionControl', target: undefined, selection: undefined, notice: undefined, rows: [] };
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 1, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 1, kind: 'evt', type: 'missionControl', payload: { view: mission } } }));
        await settle();
        const document = dom.window.document;
        expect(document.querySelector('h1')?.textContent).toBe('Mission Control');
        expect(document.querySelector('[data-placeholder]')).toBeNull();
        expect(document.querySelector('[data-mission-control]')).not.toBeNull();
        expect(document.querySelector('[data-header]')?.textContent).toContain('fixture');
        expect(document.querySelector('[data-header]')?.textContent).toContain('FeatherSpec 1.10.0');
        expect(document.querySelectorAll('[data-state-count]')).toHaveLength(6);
        expect(document.querySelector('[data-total]')?.textContent).toBe(`Total ${lifecycle.entries.length}`);
        expect(lifecycle.entries.length).toBeGreaterThan(0);
        expect(document.querySelector('[data-progress]')?.textContent).toContain('Progress');
        expect(document.querySelector('[data-runs]')?.textContent).toContain('Running 0');
        expect(document.querySelector('[data-attention] h2')?.textContent).toContain('Needs attention (');
        expect(document.querySelector('[data-activity] h2')?.textContent).toBe('Recent activity');
        expect(errors).toEqual([]);
    });

    it('0008: mounts the start confirmation dialog and the start lines from a fixture view: modal dialog, prompt collapsed, no start-up error', async () => {
        const prompt = buildStartPrompt({ stem: '0001-ready-feature', specPath: '.specs/backlog/0001-ready-feature.md', planPath: '.specs/backlog/0001-ready-feature.plan.md' });
        const startView = {
            confirmation: {
                token: 'c-1',
                spec: { number: '0001', title: 'Ready feature', stem: '0001-ready-feature' },
                provider: { id: 'fake', displayName: 'Fake provider' },
                permissionMode: 'Asks before every tool action',
                missing: ['userInput'],
                previousRun: { kind: 'none' },
                prompt,
                starting: false,
            },
            refusal: { number: '0001', items: [{ id: 'pending' }] },
        };
        expect(isAgentStartView(startView)).toBe(true);
        const { dom, posted, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const view = { state: undefined, restricted: false, projectName: 'fixture', area: 'specExplorer', target: undefined, selection: undefined, notice: undefined, rows: [] };
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 1, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 1, kind: 'evt', type: 'agentStart', payload: { view: startView } } }));
        await settle();
        const document = dom.window.document;
        const dialog = document.querySelector('[role="dialog"]') as unknown as (QueryRoot & { getAttribute(name: string): string | null }) | null;
        expect(dialog?.getAttribute('aria-modal')).toBe('true');
        expect(dialog?.textContent).toContain('Start an agent on spec 0001?');
        const pre = document.querySelector('pre') as unknown as { hidden: boolean; textContent: string | null };
        expect(pre.hidden).toBe(true);
        expect(pre.textContent).toBe(prompt);
        expect(document.querySelector('[data-start-refusal]')?.textContent).toContain('Another start is still being prepared.');
        const start = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Start') as unknown as { click(): void };
        start.click();
        await settle();
        expect(posted.some((message) => message.type === 'agentStartConfirm')).toBe(true);
        expect(errors).toEqual([]);
    });

    it('0012: mounts the Agent Center with a fixture snapshot: run list, detail with the open request and the timeline, no start-up error', async () => {
        const center = sampleCenterView({ rows: [sampleRow()], detail: sampleDetail() });
        const timeline = { runId: 'run-1', rows: [{ key: 1, kind: 'Message', time: '2026-11-17T10:00:00.000Z', source: 'provider', fields: [{ label: 'Text', text: 'hello' }] }], hasEarlier: false };
        expect(isAgentCenterView(center)).toBe(true);
        expect(isTimelinePayload(timeline)).toBe(true);
        const { dom, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const view = { state: undefined, restricted: false, projectName: 'fixture', area: 'agentCenter', target: undefined, selection: undefined, notice: undefined, rows: [] };
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 1, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 1, kind: 'evt', type: 'agentCenter', payload: { view: center } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 1, kind: 'evt', type: 'agentCenterTimeline', payload: timeline } }));
        await settle();
        const document = dom.window.document;
        expect(document.querySelector('h1')?.textContent).toBe('Agent Center');
        expect(document.querySelector('[data-placeholder]')).toBeNull();
        expect(document.querySelectorAll('[data-run-row]')).toHaveLength(1);
        expect(document.querySelector('[data-run-detail]')).not.toBeNull();
        expect(document.querySelector('[data-request]')?.textContent).toContain('Approve once');
        expect(document.querySelectorAll('[data-timeline-row]')).toHaveLength(1);
        expect(errors).toEqual([]);
    });

    it('control: a Mission Control event with an extra field is refused and the area stays an empty frame', async () => {
        const { dom, errors } = boot(readFileSync(bundlePath, 'utf8'));
        await settle();
        const view = { state: undefined, restricted: false, projectName: 'fixture', area: 'missionControl', target: undefined, selection: undefined, notice: undefined, rows: [] };
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 1, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 1, kind: 'evt', type: 'missionControl', payload: { view: { header: {}, extra: 1 } } } }));
        await settle();
        expect(dom.window.document.querySelector('[data-mission-control]')).toBeNull();
        expect(dom.window.document.querySelector('[data-mission-control-empty]')).not.toBeNull();
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
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 1, kind: 'evt', seq: 1, type: 'shell', payload: { view } } }));
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { v: 1, kind: 'evt', type: 'detail', payload: { view: detail } } }));
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
