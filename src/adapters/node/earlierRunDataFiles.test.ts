import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { removeEarlierRunData } from '../../core/runtime/earlierRunData';
import { createTempDirectories } from '../../core/runtime/testing/tempDirectories';
import { createEarlierRunDataFiles } from './earlierRunDataFiles';

const directories = createTempDirectories();
afterEach(async () => {
    await directories.removeAll();
});

const PROJECTS = path.join('featherspec-studio', 'projects');

async function write(root: string, relative: string, content: string): Promise<void> {
    const full = path.join(root, ...relative.split('/'));
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content);
}

async function tree(root: string, relative = ''): Promise<Record<string, string>> {
    const found: Record<string, string> = {};
    for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
        const child = relative === '' ? entry.name : `${relative}/${entry.name}`;
        if (entry.isDirectory()) {
            Object.assign(found, await tree(root, child));
        } else {
            found[child] = (await fs.readFile(path.join(root, child), 'utf8')).replace(/\r\n/g, '\n');
        }
    }
    return found;
}

const state = { has: () => false, remove: async () => undefined };
const output = { appendBlock: () => undefined };

describe('0015 AC-023: the Node file system adapter of the earlier-data removal', () => {
    it('removes the earlier data on real directories and leaves every other byte as it was', async () => {
        const root = await directories.make('earlier-run-data-');
        const a = 'featherspec-studio/projects/aaaa';
        const newer = 'featherspec-studio/projects/9999';
        await write(root, 'copilot-home/session/x.json', '{}');
        await write(root, `${a}/store.json`, '{"storeVersion":1}');
        await write(root, `${a}/lock.json`, 'lock');
        await write(root, `${a}/spec-status-history.jsonl`, '{"a":1}\n{"b":2}\n');
        await write(root, `${a}/index.json`, '{"v":1}');
        await write(root, `${a}/index.json.tmp-1`, 'half');
        await write(root, `${a}/runs/r1.json`, 'run');
        await write(root, `${newer}/store.json`, '{"storeVersion":99}');
        await write(root, `${newer}/index.json`, 'keep');
        await write(root, `${newer}/runs/r.json`, 'keep');
        await write(root, 'other-extension/data.txt', 'not ours');
        const before = await tree(root);

        const result = await removeEarlierRunData({ files: createEarlierRunDataFiles(root), state, output });

        const after = await tree(root);
        const expected = Object.fromEntries(
            Object.entries(before).filter(([key]) => !key.startsWith('copilot-home/') && !key.startsWith(`${a}/runs/`) && key !== `${a}/index.json` && key !== `${a}/index.json.tmp-1`),
        );
        expect(after).toEqual(expected);
        expect(Object.keys(after)).toContain(`${newer}/runs/r.json`);
        expect(after['other-extension/data.txt']).toBe('not ours');
        expect(result.kept).toEqual([]);
        expect(result.removed).toEqual(['copilot-home', `${a}/index.json`, `${a}/index.json.tmp-1`, `${a}/runs`]);
        expect(await fs.readFile(path.join(root, ...`${a}/spec-status-history.jsonl`.split('/')))).toEqual(Buffer.from('{"a":1}\n{"b":2}\n'));
    });

    it('a second run on the cleaned storage removes nothing; a storage without the folders is not an error', async () => {
        const root = await directories.make('earlier-run-data-');
        await write(root, 'copilot-home/x', '1');
        const files = createEarlierRunDataFiles(root);
        expect((await removeEarlierRunData({ files, state, output })).removed).toEqual(['copilot-home']);
        expect(await removeEarlierRunData({ files, state, output })).toEqual({ removed: [], kept: [] });
        const empty = await directories.make('earlier-run-data-empty-');
        expect(await removeEarlierRunData({ files: createEarlierRunDataFiles(empty), state, output })).toEqual({ removed: [], kept: [] });
    });

    it('a path that cannot be removed is kept and reported with the reason from the file system', async () => {
        const root = await directories.make('earlier-run-data-');
        await write(root, 'copilot-home/x', '1');
        await write(root, `${PROJECTS}/aaaa/runs/r.json`, 'r'.replace(/r/, 'run'));
        const held = path.join(root, PROJECTS, 'aaaa', 'runs');
        const files = createEarlierRunDataFiles(root, {
            ...fs,
            async rm(target, options) {
                if (path.resolve(String(target)) === held) {
                    throw Object.assign(new Error('EBUSY: resource busy or locked'), { code: 'EBUSY' });
                }
                return fs.rm(target, options);
            },
        });
        const result = await removeEarlierRunData({ files, state, output });
        expect(result.removed).toEqual(['copilot-home']);
        expect(result.kept).toEqual([{ path: 'featherspec-studio/projects/aaaa/runs', reason: 'EBUSY: resource busy or locked' }]);
        expect(await fs.readFile(path.join(held, 'r.json'), 'utf8')).toBe('run');
    });

    it('refuses a path that leaves the global storage (negative control for the guard)', async () => {
        const root = await directories.make('earlier-run-data-');
        const files = createEarlierRunDataFiles(root);
        await expect(files.remove('../outside')).rejects.toThrow('not allowed');
        await expect(files.exists('a/../../b')).rejects.toThrow('not allowed');
        await expect(files.entries('a\\b')).rejects.toThrow('not allowed');
    });
});
