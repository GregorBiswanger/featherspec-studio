import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const BUNDLE_PATHS = ['dist/extension.js', 'dist/webview/main.js', 'dist/webview/main.css'];

const NEUTRAL_PREFIXES = [
    'jetbrains/',
    '.specs/',
    '.memory-bank/',
    '.architecture/',
    'docs/',
    '.github/workflows/jetbrains',
    '.github/instructions/jetbrains.instructions.md',
];

const NEUTRAL_FILES = ['AGENTS.md', 'CLAUDE.md'];

const isNeutralOrJetBrains = (path) =>
    NEUTRAL_FILES.includes(path) || NEUTRAL_PREFIXES.some((prefix) => path.startsWith(prefix));

export const isJetBrainsOnly = (paths) => paths.length > 0 && paths.every(isNeutralOrJetBrains);

export const compareDigests = (a, b) => {
    const names = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    return names.filter((name) => a[name] !== b[name]);
};

const digestsOf = (baseDir) =>
    Object.fromEntries(
        BUNDLE_PATHS.map((path) => [
            path,
            createHash('sha256').update(readFileSync(join(baseDir, path))).digest('hex'),
        ]),
    );

const main = () => {
    const [baseDir, headDir] = process.argv.slice(2);
    if (!baseDir || !headDir) {
        console.error('usage: sameBundles.mjs <baseDir> <headDir>');
        return 2;
    }
    const differing = compareDigests(digestsOf(baseDir), digestsOf(headDir));
    if (differing.length === 0) {
        console.log(`bundles are identical: ${BUNDLE_PATHS.join(', ')}`);
        return 0;
    }
    for (const path of differing) {
        console.log(`bundle differs: ${path}`);
    }
    return 1;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exitCode = main();
}
