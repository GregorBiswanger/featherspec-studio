import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createStatusHistory } from '../../core/lifecycle/statusHistory';
import { projectActivity } from '../../core/overview/activity';
import { createSpecResolver } from '../../core/overview/specRefs';
import { modelFor } from '../../core/overview/testing/projects';
import { AGENT_CENTER_STATE_KEY, removeEarlierRunData } from '../../core/runtime/earlierRunData';
import { openRuntimeStore } from '../../core/runtime/runtimeStore';
import { createFakeNotices, createFakeRuntimeClock, createSequentialIds } from '../../core/runtime/testing/fakes';
import { createTempDirectories } from '../../core/runtime/testing/tempDirectories';
import { createEarlierRunDataFiles } from './earlierRunDataFiles';
import { createFileRuntimeMedium, projectStoreDirectory } from './fileRuntimeMedium';

const directories = createTempDirectories();
afterEach(async () => {
    await directories.removeAll();
});

const PROJECT = 'file:///work/project-a';
const CHANGE = {
    observedAt: '2026-11-15T09:00:00.000Z',
    stem: '0001-thing',
    old: 'Backlog',
    new: 'Ready',
    rule: 'S-READY',
    cause: { kind: 'files', paths: ['.specs/backlog/0001-thing.md'] },
    flow: 'not checked',
};

function historyLine(entry: Record<string, unknown>): string {
    return `${JSON.stringify({ v: 1, stem: entry.stem, observedAt: entry.observedAt, entry })}\n`;
}

async function write(directory: string, relative: string, content: string): Promise<void> {
    const full = path.join(directory, ...relative.split('/'));
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

function relativeTo(root: string, absolute: string): string {
    return path.relative(root, absolute).split(path.sep).join('/');
}

async function seedTagBuild(root: string): Promise<{ folder: string; newer: string }> {
    const folder = projectStoreDirectory(root, PROJECT);
    const newer = projectStoreDirectory(root, 'file:///work/from-the-future');
    const base = relativeTo(root, folder);
    const future = relativeTo(root, newer);
    await write(root, 'copilot-home/session/state.json', '{}');
    await write(root, `${base}/store.json`, JSON.stringify({ storeVersion: 1, projectRoot: PROJECT }));
    await write(root, `${base}/spec-status-history.jsonl`, historyLine(CHANGE));
    await write(root, `${base}/index.json`, '{"v":1,"runs":[{"runId":"r1"}]}');
    await write(root, `${base}/index.json.tmp-3`, 'half written');
    await write(root, `${base}/runs/r1.run.jsonl`, '{"v":1,"k":"created"}\n');
    await write(root, `${base}/runs/r1.events.jsonl`, '{"v":1,"seq":1}\n');
    await write(root, `${future}/store.json`, JSON.stringify({ storeVersion: 99, projectRoot: 'future' }));
    await write(root, `${future}/index.json`, 'newer index');
    await write(root, `${future}/runs/r9.run.jsonl`, 'newer run');
    return { folder, newer };
}

function workspaceState(keys: string[]) {
    const held = new Set(keys);
    return { has: (key: string) => held.has(key), remove: async (key: string) => void held.delete(key), held };
}

describe('0015 AC-023, AC-024: the earlier-data removal, then the narrowed store, end to end', () => {
    it('removes the data of the tag build, keeps the history and a newer folder, and Activity shows the kept entry', async () => {
        const root = await directories.make('earlier-run-data-e2e-');
        const { folder, newer } = await seedTagBuild(root);
        const newerBefore = await tree(newer);
        const state = workspaceState([AGENT_CENTER_STATE_KEY, 'featherspec-studio.shell']);
        const lines: string[] = [];

        const result = await removeEarlierRunData({
            files: createEarlierRunDataFiles(root),
            state,
            output: { appendBlock: (block) => void lines.push(...block) },
        });

        expect(result.kept).toEqual([]);
        expect(await fs.readdir(path.join(root, 'copilot-home')).catch(() => 'gone')).toBe('gone');
        expect(Object.keys(await tree(folder)).sort()).toEqual(['spec-status-history.jsonl', 'store.json']);
        expect(await tree(newer)).toEqual(newerBefore);
        expect([...state.held]).toEqual(['featherspec-studio.shell']);
        expect(lines.join('\n')).toContain('Removed run data of an earlier build');

        const clock = createFakeRuntimeClock(Date.UTC(2026, 10, 16, 8, 0, 0));
        const store = await openRuntimeStore({
            medium: createFileRuntimeMedium(folder),
            ids: createSequentialIds(),
            clock,
            notices: createFakeNotices(),
            projectRoot: PROJECT,
        });
        directories.closeBeforeRemoval(() => store.dispose());
        expect(store.state()).toEqual({ kind: 'writable', reason: undefined });
        expect(Object.keys(await tree(folder)).sort()).toEqual(['lock.json', 'spec-status-history.jsonl', 'store.json']);

        const view = await createStatusHistory({ store, clock: { now: () => new Date(clock.epochMs()).toISOString(), setTimeout: (callback, milliseconds) => clock.setTimeout(callback, milliseconds) } }).read();
        const model = await modelFor([{ number: '0001', kind: 'Ready', title: 'Alpha' }]);
        const activity = projectActivity(view, createSpecResolver(model));
        expect(activity).toEqual({
            available: true,
            open: false,
            entries: [
                {
                    at: '2026-11-15T09:00:00.000Z',
                    spec: { stem: '0001-thing', number: '0001', title: 'Alpha', found: true },
                    change: { kind: 'state', old: 'Backlog', new: 'Ready', whileClosed: false },
                },
            ],
        });
        await store.dispose();
        expect(Object.keys(await tree(folder)).sort()).toEqual(['spec-status-history.jsonl', 'store.json']);
        expect(await tree(newer)).toEqual(newerBefore);
    });

    it('a second activation on the cleaned storage removes nothing and changes no byte', async () => {
        const root = await directories.make('earlier-run-data-e2e-');
        await seedTagBuild(root);
        const files = createEarlierRunDataFiles(root);
        const output = { appendBlock: () => undefined };
        await removeEarlierRunData({ files, state: workspaceState([]), output });
        const once = await tree(root);
        const second = await removeEarlierRunData({ files, state: workspaceState([]), output });
        expect(second).toEqual({ removed: [], kept: [] });
        expect(await tree(root)).toEqual(once);
    });

    it('the composition root removes the earlier data before the runtime session starts, in every window', async () => {
        const source = await fs.readFile(path.resolve(process.cwd(), 'src', 'hosts', 'compose.ts'), 'utf8');
        const removal = source.indexOf('await removeEarlierRunData(');
        const start = source.indexOf('await session.start()');
        expect(removal).toBeGreaterThan(-1);
        expect(start).toBeGreaterThan(removal);
    });

    it('negative control: a composition root that starts the session first would be found by the order check', () => {
        const wrong = 'await session.start();\nawait removeEarlierRunData({});';
        expect(wrong.indexOf('await session.start()')).toBeLessThan(wrong.indexOf('await removeEarlierRunData('));
    });
});
