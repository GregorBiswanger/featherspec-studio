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
