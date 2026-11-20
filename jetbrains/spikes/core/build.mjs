import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));

export async function buildCoreSpike() {
    const outfile = path.join(here, '..', 'build', 'core-spike.js');
    await esbuild.build({
        entryPoints: [path.join(here, 'entry.mjs')],
        outfile,
        bundle: true,
        format: 'iife',
        globalName: 'FeatherSpecSpike',
        platform: 'neutral',
        target: 'es2022',
        plugins: [
            {
                name: 'posix-path',
                setup(build) {
                    build.onResolve({ filter: /^(node:)?path$/ }, () => ({ path: path.join(here, 'pathPosix.mjs') }));
                },
            },
        ],
        inject: [path.join(here, 'polyfills.mjs')],
        logLevel: 'silent',
    });
    return outfile;
}
