import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const normaliseListing = (text) =>
    text
        .split(/\r?\n/)
        .map((line) => line.trim().replace(/\\/g, '/'))
        .filter((line) => line.length > 0);

export const compareFileLists = (actual, expected) => {
    const actualSet = new Set(actual);
    const expectedSet = new Set(expected);
    return {
        added: actual.filter((path) => !expectedSet.has(path)),
        missing: expected.filter((path) => !actualSet.has(path)),
    };
};

export const runSelfTest = (expected) => {
    if (expected.length === 0) {
        return false;
    }
    const [removed] = expected;
    const injected = 'injected/self-test.js';
    const { added, missing } = compareFileLists([...expected.slice(1), injected], expected);
    return added.includes(injected) && missing.includes(removed);
};

const readSnapshot = () =>
    normaliseListing(readFileSync(new URL('./vsix-files.txt', import.meta.url), 'utf8'));

const listPackagedFiles = () => {
    const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const output = execFileSync(npx, ['--yes', '@vscode/vsce', 'ls'], {
        cwd: repoRoot,
        encoding: 'utf8',
        shell: process.platform === 'win32',
    });
    return normaliseListing(output);
};

const main = () => {
    const expected = readSnapshot();
    if (process.argv.includes('--self-test')) {
        const passed = runSelfTest(expected);
        console.log(passed ? 'self-test passed: the added and the removed path were both reported' : 'self-test FAILED');
        return passed ? 0 : 1;
    }
    const { added, missing } = compareFileLists(listPackagedFiles(), expected);
    if (added.length === 0 && missing.length === 0) {
        console.log(`.vsix file list matches the snapshot (${expected.length} files)`);
        return 0;
    }
    for (const path of added) {
        console.log(`added: ${path}`);
    }
    for (const path of missing) {
        console.log(`missing: ${path}`);
    }
    return 1;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exitCode = main();
}
