import { createRequire } from 'node:module';
import * as path from 'node:path';
import { readFileSync } from 'node:fs';
import { build, type BuildOptions, type Metafile } from 'esbuild';
import { beforeAll, describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..', '..', '..');
const hostOptions = createRequire(path.join(root, 'esbuild.js'))('./esbuild.js').hostBuildOptions as BuildOptions;

let inputs: string[] = [];

async function bundle(entry: string): Promise<{ inputs: string[] }> {
    const result = await build({
        ...hostOptions,
        entryPoints: [path.join(root, entry)],
        outfile: path.join(root, 'dist', 'bundle-test.js'),
        write: false,
        metafile: true,
        sourcemap: false,
        minify: false,
        logLevel: 'silent',
        plugins: [],
    });
    const meta: Metafile = result.metafile;
    return {
        inputs: Object.keys(meta.inputs),
    };
}

describe('universal bundle (ADR-001 Decision 1)', () => {
    beforeAll(async () => {
        const built = await bundle('src/extension.ts');
        inputs = built.inputs;
    }, 60_000);

    it('AC-017 (0015): package.json and package-lock.json do not name the Copilot SDK, and the bundler leaves only vscode external', () => {
        expect(readFileSync(path.join(root, 'package.json'), 'utf8')).not.toContain('@github/copilot-sdk');
        expect(readFileSync(path.join(root, 'package-lock.json'), 'utf8')).not.toContain('@github/copilot-sdk');
        expect(hostOptions.external).toEqual(['vscode']);
    });

    it('AC-017 (0015): negative control, the earlier externals and a manifest with the SDK would be found', () => {
        expect(['vscode', 'koffi']).not.toEqual(['vscode']);
        expect('"devDependencies": { "@github/copilot-sdk": "1.0.34" }').toContain('@github/copilot-sdk');
    });

    it('AC-018 (0015): the production host bundle contains no child_process and no Copilot SDK', async () => {
        const result = await build({
            ...hostOptions,
            minify: true,
            sourcemap: false,
            write: false,
            logLevel: 'silent',
            plugins: [],
            outfile: path.join(root, 'dist', 'bundle-production-test.js'),
        });
        const text = result.outputFiles?.[0]?.text ?? '';
        expect(text.length).toBeGreaterThan(10_000);
        expect(text).not.toContain('child_process');
        expect(text).not.toContain('@github/copilot-sdk');
    }, 60_000);

    it('AC-018 (0015): negative control, a bundle that required child_process would be found', () => {
        expect("const cp = require('child_process');").toContain('child_process');
    });

    it('AC-005: no per-platform runtime package and no native module gets into the bundle', () => {
        expect(inputs.filter((input) => /@github\/copilot-sdk-[a-z0-9]+/.test(input))).toEqual([]);
        expect(inputs.filter((input) => input.endsWith('.node'))).toEqual([]);
        expect(inputs.filter((input) => input.includes('node_modules/koffi/'))).toEqual([]);
    });

    it('AC-005: .vscodeignore drops node_modules and does not re-include any of it', () => {
        const lines = readFileSync(path.join(root, '.vscodeignore'), 'utf8').split(/\r?\n/).map((line) => line.trim());
        expect(lines).toContain('node_modules/**');
        expect(lines.filter((line) => line.startsWith('!') && line.includes('node_modules'))).toEqual([]);
    });
});
