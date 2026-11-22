import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const keyOf = (test) => `${test.file}\u0000${test.title}`;

export const missingTests = (startList, headList) => {
    const present = new Set(headList.map(keyOf));
    return startList.filter((test) => !present.has(keyOf(test)));
};

export const vitestInventory = (json, root) =>
    JSON.parse(json).map((entry) => ({
        file: path.relative(root, entry.file).split(path.sep).join('/'),
        title: entry.name,
    }));

export const mochaTitles = (source) =>
    [...source.matchAll(/\b(?:suite|test|it)\(\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g)].map((match) => match[2]);

export const protocolVersionOf = (envelopeSource) => {
    const match = /export const PROTOCOL_VERSION = (\d+);/.exec(envelopeSource);
    return match === null ? undefined : Number(match[1]);
};

export const differingAreas = (startTexts, headTexts) =>
    [...new Set([...Object.keys(startTexts), ...Object.keys(headTexts)])]
        .filter((area) => startTexts[area] !== headTexts[area])
        .sort();

const isWindows = process.platform === 'win32';

const vitestTests = (dir) => {
    const output = execFileSync(isWindows ? 'npx.cmd' : 'npx', ['vitest', 'list', '--json', '--no-staticParse'], {
        cwd: dir,
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
        shell: isWindows,
        timeout: 600_000,
    });
    return vitestInventory(output, dir);
};

const mochaSources = (dir) =>
    readdirSync(path.join(dir, 'src', 'test'), { recursive: true })
        .filter((entry) => entry.endsWith('.ts'))
        .map((entry) => path.join('src', 'test', entry).split(path.sep).join('/'));

const mochaTests = (dir) =>
    mochaSources(dir).flatMap((file) =>
        mochaTitles(readFileSync(path.join(dir, file), 'utf8')).map((title) => ({ file, title })),
    );

const inventoryOf = (dir) => [...vitestTests(dir), ...mochaTests(dir)];

const main = () => {
    const [startDir, headDir] = process.argv.slice(2);
    if (!startDir || !headDir) {
        console.error('usage: sharedGuard.mjs <startDir> <headDir>');
        return 2;
    }
    const missing = missingTests(inventoryOf(path.resolve(startDir)), inventoryOf(path.resolve(headDir)));
    if (missing.length === 0) {
        console.log('no test of the start commit is missing in the head');
        return 0;
    }
    for (const test of missing) {
        console.log(`missing: ${test.file} :: ${test.title}`);
    }
    return 1;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    process.exitCode = main();
}
