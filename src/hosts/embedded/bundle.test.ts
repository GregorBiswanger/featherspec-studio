import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as vm from 'node:vm';
import { build, type BuildOptions } from 'esbuild';
import { beforeAll, describe, expect, it } from 'vitest';
import { browserContext } from './testing/browserContext';

const root = path.resolve(__dirname, '..', '..', '..');
const esbuildScript = path.join(root, 'esbuild.js');
const corePath = path.join(root, 'dist', 'embedded', 'core.js');
const hostOptions = createRequire(esbuildScript)('./esbuild.js').hostBuildOptions as BuildOptions;

interface Frame {
    k: string;
    channel?: string;
}

interface EmbeddedGlobal {
    start(configJson: string): Promise<void>;
}

const CONFIG = {
    host: 'jetbrains',
    platform: 'linux',
    studioVersion: '0.1.0',
    settings: {},
    trusted: true,
    folders: [],
    memory: {},
};

function sha256(content: string | Buffer): string {
    return createHash('sha256').update(content).digest('hex');
}

async function waitUntil(predicate: () => boolean): Promise<void> {
    const deadline = Date.now() + 10_000;
    while (!predicate()) {
        if (Date.now() > deadline) {
            throw new Error('The embedded core did not send its ready frame in time.');
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
}

describe('embedded bundle (0034 R-1, R-6, AC-006)', () => {
    beforeAll(() => {
        execFileSync(process.execPath, [esbuildScript], { cwd: root, stdio: 'pipe' });
    }, 120_000);

    it('R-6: node esbuild.js writes dist/embedded/core.js as a third target', () => {
        expect(readFileSync(corePath, 'utf8').length).toBeGreaterThan(1000);
    });

    it('R-6: the bundle reads no Node.js global: no require(, process, Buffer or __dirname', () => {
        const text = readFileSync(corePath, 'utf8');
        expect(text).not.toMatch(/\brequire\(/);
        expect(text).not.toMatch(/\bprocess\b/);
        expect(text).not.toMatch(/\bBuffer\b/);
        expect(text).not.toMatch(/__dirname/);
    });

    it('R-6: in a context with Web APIs only, start emits the tree and then one ready frame', async () => {
        const frames: Frame[] = [];
        const context = browserContext({
            __featherspecNative: (frame: string) => {
                frames.push(JSON.parse(frame) as Frame);
            },
        });
        vm.runInContext(readFileSync(corePath, 'utf8'), context);
        const host = context.FeatherSpecHost as EmbeddedGlobal;
        await host.start(JSON.stringify(CONFIG));
        await waitUntil(() => frames.some((frame) => frame.k === 'ready'));
        const tree = frames.findIndex((frame) => frame.k === 'emit' && frame.channel === 'tree');
        const ready = frames.findIndex((frame) => frame.k === 'ready');
        expect(tree).toBeGreaterThanOrEqual(0);
        expect(tree).toBeLessThan(ready);
        expect(frames.filter((frame) => frame.k === 'ready')).toHaveLength(1);
    });

    it('AC-006: dist/extension.js equals a build of the host target alone', async () => {
        const built = await build({
            ...hostOptions,
            write: false,
            logLevel: 'silent',
            plugins: [],
        });
        const script = built.outputFiles?.find((file) => file.path.endsWith('extension.js'));
        expect(script).toBeDefined();
        expect(sha256(script?.text ?? '')).toBe(sha256(readFileSync(path.join(root, 'dist', 'extension.js'))));
    });
});
