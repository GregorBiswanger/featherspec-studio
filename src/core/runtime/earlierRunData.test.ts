import { describe, expect, it } from 'vitest';
import type { EarlierRunDataFilesPort, EarlierRunDataStatePort } from '../ports/earlierRunData';
import { removeEarlierRunData } from './earlierRunData';

const A = 'featherspec-studio/projects/aaaaaaaaaaaaaaaa';
const B = 'featherspec-studio/projects/bbbbbbbbbbbbbbbb';
const NEWER = 'featherspec-studio/projects/9999999999999999';

function tagBuild(): Record<string, string> {
    return {
        'copilot-home/session/state.json': '{}',
        'copilot-home/config.json': '{}',
        [`${A}/store.json`]: '{"storeVersion":1,"projectRoot":"file:///a"}',
        [`${A}/lock.json`]: 'lock-a',
        [`${A}/index.json`]: '{"v":1,"runs":[]}',
        [`${A}/index.json.tmp-3`]: 'half',
        [`${A}/runs/r1.json`]: 'run',
        [`${A}/runs/r1.events.jsonl`]: 'events',
        [`${A}/spec-status-history.jsonl`]: 'history-a',
        [`${B}/store.json`]: '{"storeVersion":1,"projectRoot":"file:///b"}',
        [`${B}/spec-status-history.jsonl`]: 'history-b',
        [`${NEWER}/store.json`]: '{"storeVersion":99,"projectRoot":"file:///n"}',
        [`${NEWER}/index.json`]: 'newer index',
        [`${NEWER}/runs/r9.json`]: 'newer run',
    };
}

function fakeFiles(initial: Record<string, string>, failing: string[] = []) {
    const tree = new Map(Object.entries(initial));
    const removals: string[] = [];
    const port: EarlierRunDataFilesPort = {
        async exists(path) {
            return [...tree.keys()].some((key) => key === path || key.startsWith(`${path}/`));
        },
        async entries(path) {
            const names = new Set<string>();
            for (const key of tree.keys()) {
                if (key.startsWith(`${path}/`)) {
                    names.add(key.slice(path.length + 1).split('/')[0]!);
                }
            }
            return [...names];
        },
        async read(path) {
            return tree.get(path);
        },
        async remove(path) {
            removals.push(path);
            if (failing.includes(path)) {
                throw new Error('EBUSY: resource busy or locked');
            }
            for (const key of [...tree.keys()]) {
                if (key === path || key.startsWith(`${path}/`)) {
                    tree.delete(key);
                }
            }
        },
    };
    return { port, tree, removals };
}

function fakeState(keys: string[] = ['featherspec-studio.agentCenter', 'featherspec-studio.other']) {
    const held = new Set(keys);
    const removed: string[] = [];
    const port: EarlierRunDataStatePort = {
        has: (key) => held.has(key),
        async remove(key) {
            removed.push(key);
            held.delete(key);
        },
    };
    return { port, held, removed };
}

function fakeOutput() {
    const blocks: string[][] = [];
    return { port: { appendBlock: (lines: readonly string[]) => void blocks.push([...lines]) }, blocks };
}

describe('0015 AC-023: removal of the run data of earlier builds', () => {
    it('removes copilot-home, index.json, its tmp copies and runs/ of every project folder, and the state key, and nothing else', async () => {
        const files = fakeFiles(tagBuild());
        const state = fakeState();
        const output = fakeOutput();
        const result = await removeEarlierRunData({ files: files.port, state: state.port, output: output.port });
        expect([...files.tree.keys()].sort()).toEqual(
            [
                `${A}/store.json`,
                `${A}/lock.json`,
                `${A}/spec-status-history.jsonl`,
                `${B}/store.json`,
                `${B}/spec-status-history.jsonl`,
                `${NEWER}/store.json`,
                `${NEWER}/index.json`,
                `${NEWER}/runs/r9.json`,
            ].sort(),
        );
        expect(files.tree.get(`${A}/lock.json`)).toBe('lock-a');
        expect(files.tree.get(`${A}/spec-status-history.jsonl`)).toBe('history-a');
        expect(state.removed).toEqual(['featherspec-studio.agentCenter']);
        expect(state.held.has('featherspec-studio.other')).toBe(true);
        expect(result.kept).toEqual([]);
        expect(result.removed).toEqual([
            'copilot-home',
            `${A}/index.json`,
            `${A}/index.json.tmp-3`,
            `${A}/runs`,
            'workspace state featherspec-studio.agentCenter',
        ]);
    });

    it('a project folder whose store.json names another format version is left untouched (version 99)', async () => {
        const files = fakeFiles(tagBuild());
        await removeEarlierRunData({ files: files.port, state: fakeState().port, output: fakeOutput().port });
        expect(files.removals.some((path) => path.startsWith(NEWER))).toBe(false);
        expect(files.tree.get(`${NEWER}/index.json`)).toBe('newer index');
    });

    it('a missing, unreadable or broken store.json does not protect a folder (it names no version)', async () => {
        const files = fakeFiles({
            'featherspec-studio/projects/c1/index.json': 'x',
            'featherspec-studio/projects/c2/store.json': '{broken',
            'featherspec-studio/projects/c2/runs/r.json': 'x',
            'featherspec-studio/projects/c3/store.json': '{"projectRoot":"x"}',
            'featherspec-studio/projects/c3/index.json': 'x',
        });
        await removeEarlierRunData({ files: files.port, state: fakeState([]).port, output: fakeOutput().port });
        expect([...files.tree.keys()].sort()).toEqual(['featherspec-studio/projects/c2/store.json', 'featherspec-studio/projects/c3/store.json']);
    });

    it('paths that are already gone count as removed: no failure, no line, a second run does nothing', async () => {
        const files = fakeFiles({ [`${A}/store.json`]: '{"storeVersion":1}', [`${A}/spec-status-history.jsonl`]: 'h' });
        const output = fakeOutput();
        const result = await removeEarlierRunData({ files: files.port, state: fakeState([]).port, output: output.port });
        expect(result).toEqual({ removed: [], kept: [] });
        expect(files.removals).toEqual([]);
        expect(output.blocks).toEqual([]);
    });

    it('with the store location unavailable nothing is removed, the state key included, and nothing is written', async () => {
        const state = fakeState();
        const output = fakeOutput();
        const result = await removeEarlierRunData({ files: undefined, state: state.port, output: output.port });
        expect(result).toEqual({ removed: [], kept: [] });
        expect(state.removed).toEqual([]);
        expect(output.blocks).toEqual([]);
    });

    it('writes one Output line naming what it removed', async () => {
        const files = fakeFiles({ 'copilot-home/a': '1', [`${A}/store.json`]: '{"storeVersion":1}', [`${A}/runs/r.json`]: 'r' });
        const output = fakeOutput();
        await removeEarlierRunData({ files: files.port, state: fakeState([]).port, output: output.port });
        expect(output.blocks).toEqual([[`Removed run data of an earlier build: copilot-home, ${A}/runs.`]]);
    });

    it('writes no line when only the state key was gone already and nothing else existed', async () => {
        const output = fakeOutput();
        await removeEarlierRunData({ files: fakeFiles({}).port, state: fakeState([]).port, output: output.port });
        expect(output.blocks).toEqual([]);
    });
});

describe('0015 AC-024: a path that cannot be removed', () => {
    it('is kept, reported with path and reason, the others are removed, and the next activation retries it', async () => {
        const files = fakeFiles(tagBuild(), [`${A}/runs`]);
        const output = fakeOutput();
        const first = await removeEarlierRunData({ files: files.port, state: fakeState().port, output: output.port });
        expect(first.kept).toEqual([{ path: `${A}/runs`, reason: 'EBUSY: resource busy or locked' }]);
        expect(first.removed).toContain('copilot-home');
        expect(first.removed).toContain(`${A}/index.json`);
        expect(files.tree.has(`${A}/runs/r1.json`)).toBe(true);
        expect(output.blocks).toEqual([
            [expect.stringContaining('Removed run data of an earlier build:')],
            [`Could not remove ${A}/runs: EBUSY: resource busy or locked. Studio tries again at the next activation.`],
        ]);

        const retry = fakeFiles(Object.fromEntries(files.tree));
        const second = await removeEarlierRunData({ files: retry.port, state: fakeState([]).port, output: fakeOutput().port });
        expect(second.removed).toEqual([`${A}/runs`]);
        expect(second.kept).toEqual([]);
    });

    it('a failing state key is reported and does not stop the file removal', async () => {
        const files = fakeFiles({ 'copilot-home/a': '1' });
        const state: EarlierRunDataStatePort = {
            has: () => true,
            async remove() {
                throw new Error('memento locked');
            },
        };
        const result = await removeEarlierRunData({ files: files.port, state, output: fakeOutput().port });
        expect(result.removed).toEqual(['copilot-home']);
        expect(result.kept).toEqual([{ path: 'workspace state featherspec-studio.agentCenter', reason: 'memento locked' }]);
    });

    it('a listing that fails is reported for its path and keeps copilot-home removal', async () => {
        const files = fakeFiles({ 'copilot-home/a': '1' });
        const broken: EarlierRunDataFilesPort = {
            ...files.port,
            async entries() {
                throw new Error('EACCES: permission denied');
            },
        };
        const result = await removeEarlierRunData({ files: broken, state: fakeState([]).port, output: fakeOutput().port });
        expect(result.removed).toEqual(['copilot-home']);
        expect(result.kept).toEqual([{ path: 'featherspec-studio/projects', reason: 'EACCES: permission denied' }]);
    });
});
