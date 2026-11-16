import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import * as path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';

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

    it('control: a script that throws at start-up is reported through the same harness', () => {
        const { errors } = boot('throw new Error("broken bundle");');
        expect(errors.length).toBeGreaterThan(0);
    });
});
