import { createRequire } from 'node:module';
import * as path from 'node:path';
import { readFileSync } from 'node:fs';
import { build, type BuildOptions, type Metafile } from 'esbuild';
import { beforeAll, describe, expect, it } from 'vitest';
import { SECRET_PATTERNS } from '../../core/runtime/masking';
import { sampleOf } from '../../core/runtime/testing/secretSamples';

const root = path.resolve(__dirname, '..', '..', '..');
const hostOptions = createRequire(path.join(root, 'esbuild.js'))('./esbuild.js').hostBuildOptions as BuildOptions;

let inputs: string[] = [];
let externals: string[] = [];
let source = '';

async function bundle(entry: string): Promise<{ inputs: string[]; externals: string[]; source: string }> {
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
    const output = Object.values(meta.outputs)[0];
    return {
        inputs: Object.keys(meta.inputs),
        externals: [...new Set(Object.values(meta.inputs).flatMap((input) => input.imports.filter((entryImport) => entryImport.external).map((entryImport) => entryImport.path)))],
        source: result.outputFiles?.[0]?.text ?? (output === undefined ? '' : ''),
    };
}

describe('universal bundle (ADR-001 Decision 1)', () => {
    beforeAll(async () => {
        const built = await bundle('src/extension.ts');
        inputs = built.inputs;
        externals = built.externals;
        source = built.source;
    }, 60_000);

    it('0004 AC-013 follow-up: no secret sample reaches the bundle, so the package secret scan of vsce passes', () => {
        for (const pattern of SECRET_PATTERNS) {
            expect(source, pattern.name).not.toContain(sampleOf(pattern.name));
        }
        expect(source).not.toMatch(/\bgh[pousr]_[A-Za-z0-9]{36,}/);
        expect(source).not.toMatch(/github_pat_[A-Za-z0-9_]{22,}/);
    });

    it('AC-005: the SDK JavaScript is part of the bundle', () => {
        expect(inputs.some((input) => input.includes('node_modules/@github/copilot-sdk/dist/'))).toBe(true);
        expect(inputs.some((input) => input.includes('node_modules/lossless-json/'))).toBe(true);
        expect(inputs.some((input) => input.includes('node_modules/vscode-jsonrpc/'))).toBe(true);
    });

    it('AC-005: no per-platform runtime package and no native module gets into the bundle', () => {
        expect(inputs.filter((input) => /@github\/copilot-sdk-[a-z0-9]+/.test(input))).toEqual([]);
        expect(inputs.filter((input) => input.endsWith('.node'))).toEqual([]);
        expect(inputs.filter((input) => input.includes('node_modules/koffi/'))).toEqual([]);
    });

    it('AC-005: koffi stays an external of the bundle, never bundled', () => {
        expect(externals).toContain('koffi');
        expect(source).toContain('koffi');
    });

    it('AC-005: .vscodeignore drops node_modules and does not re-include any of it', () => {
        const lines = readFileSync(path.join(root, '.vscodeignore'), 'utf8').split(/\r?\n/).map((line) => line.trim());
        expect(lines).toContain('node_modules/**');
        expect(lines.filter((line) => line.startsWith('!') && line.includes('node_modules'))).toEqual([]);
    });

    it('AC-005: negative control, a bundle without the koffi external would pull the native package in or fail', async () => {
        const result = await build({
            ...hostOptions,
            external: ['vscode'],
            entryPoints: [path.join(root, 'src/extension.ts')],
            outfile: path.join(root, 'dist', 'bundle-test.js'),
            write: false,
            metafile: true,
            logLevel: 'silent',
            plugins: [],
        }).then(
            (built) => ({ ok: true as const, inputs: Object.keys(built.metafile.inputs) }),
            (error: unknown) => ({ ok: false as const, error }),
        );
        expect(!result.ok || result.inputs.some((input) => input.includes('node_modules/koffi/'))).toBe(true);
    }, 60_000);
});
