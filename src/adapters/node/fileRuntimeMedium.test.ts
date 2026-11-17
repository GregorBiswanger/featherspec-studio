import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createFakeNotices, createFakeRuntimeClock, createSequentialIds } from '../../core/runtime/testing/fakes';
import { describeRuntimeStoreContract, type MediumHarness } from '../../core/runtime/testing/contract';
import { snapshotTree } from '../../core/discovery/testing/snapshotTree';
import { openRuntimeStore } from '../../core/runtime/runtimeStore';
import { createTempDirectories } from '../../core/runtime/testing/tempDirectories';
import { createFileRuntimeMedium, createProjectStoreOpener, projectStoreDirectory, type MediumFileSystem } from './fileRuntimeMedium';

async function listRecursive(root: string, directory = ''): Promise<string[]> {
    const names: string[] = [];
    for (const entry of await fs.readdir(path.join(root, directory), { withFileTypes: true })) {
        const relative = directory === '' ? entry.name : `${directory}/${entry.name}`;
        if (entry.isDirectory()) {
            names.push(...(await listRecursive(root, relative)));
        } else if (!entry.name.includes('.tmp-')) {
            names.push(relative);
        }
    }
    return names.sort();
}

describeRuntimeStoreContract('Node file-system medium', async (): Promise<MediumHarness> => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-runtime-'));
    const directory = (project: string): string => projectStoreDirectory(root, project);
    return {
        openMedium: (project) => createFileRuntimeMedium(directory(project)),
        readRaw: async (project, name) => {
            try {
                return await fs.readFile(path.join(directory(project), ...name.split('/')), 'utf8');
            } catch {
                return undefined;
            }
        },
        writeRaw: async (project, name, text) => {
            const full = path.join(directory(project), ...name.split('/'));
            await fs.mkdir(path.dirname(full), { recursive: true });
            await fs.writeFile(full, text, 'utf8');
        },
        listRaw: async (project) => {
            try {
                return await listRecursive(directory(project));
            } catch {
                return [];
            }
        },
        cleanup: async () => fs.rm(root, { recursive: true, force: true }),
    };
});

type Operation = 'writeFile' | 'readFile' | 'rename' | 'appendFile' | 'unlink';

function windowsLike(failures: Partial<Record<Operation, { code: string; times: number }>>): MediumFileSystem & { calls: Record<string, number> } {
    const calls: Record<string, number> = {};
    function gate(operation: Operation, exclusiveOnly = false, flag?: unknown): void {
        calls[operation] = (calls[operation] ?? 0) + 1;
        const failure = failures[operation];
        if (failure === undefined || failure.times <= 0 || (exclusiveOnly && flag !== 'wx')) {
            return;
        }
        failure.times -= 1;
        throw Object.assign(new Error(`${failure.code}: simulated Windows ${operation}`), { code: failure.code });
    }
    return {
        calls,
        mkdir: fs.mkdir.bind(fs),
        access: fs.access.bind(fs),
        readdir: fs.readdir.bind(fs),
        rm: fs.rm.bind(fs),
        readFile: (async (...args: Parameters<typeof fs.readFile>) => {
            gate('readFile');
            return fs.readFile(...args);
        }) as typeof fs.readFile,
        writeFile: (async (...args: Parameters<typeof fs.writeFile>) => {
            const options = args[2];
            gate('writeFile', true, typeof options === 'object' && options !== null ? options.flag : undefined);
            return fs.writeFile(...args);
        }) as typeof fs.writeFile,
        appendFile: (async (...args: Parameters<typeof fs.appendFile>) => {
            gate('appendFile');
            return fs.appendFile(...args);
        }) as typeof fs.appendFile,
        rename: (async (...args: Parameters<typeof fs.rename>) => {
            gate('rename');
            return fs.rename(...args);
        }) as typeof fs.rename,
        unlink: (async (...args: Parameters<typeof fs.unlink>) => {
            gate('unlink');
            return fs.unlink(...args);
        }) as typeof fs.unlink,
    };
}

describe('file runtime medium on Windows file semantics (transient EPERM, EBUSY, EACCES)', () => {
    async function rig(failures: Parameters<typeof windowsLike>[0]) {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-runtime-win-'));
        const fileSystem = windowsLike(failures);
        const medium = createFileRuntimeMedium(root, fileSystem);
        await medium.open();
        return { root, fileSystem, medium, done: () => fs.rm(root, { recursive: true, force: true }) };
    }

    it('AC-024: the exclusive create of the lock waits out a delete that is still pending (EPERM) instead of failing the activation', async () => {
        const { medium, fileSystem, done } = await rig({ writeFile: { code: 'EPERM', times: 2 } });
        expect(await medium.createExclusive('lock.json', 'mine')).toBe(true);
        expect(await medium.read('lock.json')).toBe('mine');
        expect(fileSystem.calls['writeFile']).toBe(3);
        await done();
    });

    it('AC-024: reading the lock while its delete is pending (EPERM) is retried and then reads what is there', async () => {
        const { medium, done } = await rig({ readFile: { code: 'EPERM', times: 2 } });
        expect(await medium.read('lock.json')).toBeUndefined();
        await done();
    });

    it('AC-024: a heartbeat replace onto a lock another process holds open (EACCES) is retried and lands', async () => {
        const { medium, root, done } = await rig({ rename: { code: 'EACCES', times: 2 } });
        await medium.replace('lock.json', 'beat-1');
        expect(await fs.readFile(path.join(root, 'lock.json'), 'utf8')).toBe('beat-1');
        expect((await fs.readdir(root)).filter((name) => name.includes('.tmp-'))).toEqual([]);
        await done();
    });

    it('AC-021: an append refused by a sharing violation (EBUSY) is retried and stored exactly once', async () => {
        const { medium, root, done } = await rig({ appendFile: { code: 'EBUSY', times: 2 } });
        await medium.append('runs/a.events.jsonl', 'one\n');
        expect(await fs.readFile(path.join(root, 'runs', 'a.events.jsonl'), 'utf8')).toBe('one\n');
        await done();
    });

    it('AC-014: negative control, a lasting EPERM still fails within the retry bound and leaves the old bytes', async () => {
        const { medium, root, done } = await rig({ rename: { code: 'EPERM', times: 100 } });
        await fs.writeFile(path.join(root, 'index.json'), 'old');
        const started = performance.now();
        await expect(medium.replace('index.json', 'new')).rejects.toMatchObject({ code: 'EPERM' });
        expect(performance.now() - started).toBeLessThan(2000);
        expect(await fs.readFile(path.join(root, 'index.json'), 'utf8')).toBe('old');
        expect((await fs.readdir(root)).filter((name) => name.includes('.tmp-'))).toEqual([]);
        await done();
    });

    it('AC-024: on this platform a replace onto a file another handle holds open ends within the bound, with either the new or the old bytes and no temp file', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-runtime-open-'));
        const medium = createFileRuntimeMedium(root);
        await medium.open();
        await fs.writeFile(path.join(root, 'lock.json'), 'old');
        const holder = await fs.open(path.join(root, 'lock.json'), 'r');
        const started = performance.now();
        const outcome = await medium.replace('lock.json', 'new').then(
            () => 'replaced',
            (error: unknown) => String((error as { code?: unknown }).code),
        );
        const elapsed = performance.now() - started;
        await holder.close();
        expect(['replaced', 'EPERM', 'EBUSY', 'EACCES']).toContain(outcome);
        expect(elapsed).toBeLessThan(2000);
        expect(await fs.readFile(path.join(root, 'lock.json'), 'utf8')).toBe(outcome === 'replaced' ? 'new' : 'old');
        expect((await fs.readdir(root)).filter((name) => name.includes('.tmp-'))).toEqual([]);
        await medium.replace('lock.json', 'after-close');
        expect(await medium.read('lock.json')).toBe('after-close');
        await fs.rm(root, { recursive: true, force: true });
    });

    it('AC-023: a lock removed while another handle still reads it can be created again once that handle closes', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-runtime-release-'));
        const medium = createFileRuntimeMedium(root);
        await medium.open();
        expect(await medium.createExclusive('lock.json', 'first')).toBe(true);
        const holder = await fs.open(path.join(root, 'lock.json'), 'r');
        const closing = new Promise<void>((resolve) => setTimeout(() => void holder.close().then(resolve), 100));
        await medium.remove('lock.json');
        const created = await medium.createExclusive('lock.json', 'second');
        await closing;
        expect(created).toBe(true);
        expect(await medium.read('lock.json')).toBe('second');
        await fs.rm(root, { recursive: true, force: true });
    });
});

describe('file runtime medium', () => {
    it('AC-001: paths outside the store directory or with odd segments are rejected', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-runtime-paths-'));
        const medium = createFileRuntimeMedium(path.join(root, 'store'));
        await medium.open();
        for (const bad of ['../escape.json', 'runs/../../escape.json', '/etc/passwd', 'runs//x', 'a\\b', '']) {
            await expect(medium.append(bad, 'x'), bad).rejects.toThrow();
            await expect(medium.read(bad), bad).rejects.toThrow();
        }
        await medium.append('runs/ok.jsonl', 'fine\n');
        expect(await medium.read('runs/ok.jsonl')).toBe('fine\n');
        expect(await listRecursive(root)).toEqual(['store/runs/ok.jsonl']);
        await fs.rm(root, { recursive: true, force: true });
    });

    it('AC-001: the exclusive create fails when the file exists, replace overwrites atomically, lines marks a half-written tail', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-runtime-ops-'));
        const medium = createFileRuntimeMedium(root);
        await medium.open();
        expect(await medium.createExclusive('lock.json', 'one')).toBe(true);
        expect(await medium.createExclusive('lock.json', 'two')).toBe(false);
        await medium.replace('lock.json', 'three');
        expect(await medium.read('lock.json')).toBe('three');
        await medium.append('runs/a.jsonl', 'first\nsecond\nthird-without-newline');
        const lines: { text: string; terminated: boolean }[] = [];
        for await (const line of medium.lines('runs/a.jsonl')) {
            lines.push(line);
        }
        expect(lines).toEqual([
            { text: 'first', terminated: true },
            { text: 'second', terminated: true },
            { text: 'third-without-newline', terminated: false },
        ]);
        expect(await medium.list('runs')).toEqual(['runs/a.jsonl']);
        await medium.remove('runs/a.jsonl');
        await medium.remove('runs/a.jsonl');
        expect(await medium.list('runs')).toEqual([]);
        expect(await medium.read('missing.json')).toBeUndefined();
        for await (const line of medium.lines('runs/missing.jsonl')) {
            throw new Error(`unexpected line ${line.text}`);
        }
        await fs.rm(root, { recursive: true, force: true });
    });

    it('AC-016: no file or folder in a workspace changes while storing, restoring and failing', async () => {
        const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-runtime-workspace-'));
        await fs.cp(path.resolve(process.cwd(), 'test/fixtures/fs110-de-active-review'), workspace, { recursive: true });
        const storage = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-runtime-storage-'));
        expect(storage.startsWith(workspace)).toBe(false);
        const before = await snapshotTree(workspace);
        expect(before.length).toBeGreaterThan(3);
        const clock = createFakeRuntimeClock();
        const open = (directory: string) =>
            openRuntimeStore({
                medium: createFileRuntimeMedium(directory),
                ids: createSequentialIds(),
                clock,
                notices: createFakeNotices(),
                projectRoot: workspace,
            });
        const directory = projectStoreDirectory(storage, workspace);
        const first = await open(directory);
        await first.appendSpecStatusEntry('0007-board', { to: 'done' });
        await first.dispose();
        const second = await open(directory);
        await second.readSpecStatusHistory();
        await second.dispose();
        const blocker = path.join(storage, 'a-file-not-a-directory');
        await fs.writeFile(blocker, 'x');
        const broken = await open(path.join(blocker, 'store'));
        expect(broken.state().kind).toBe('unavailable');
        await broken.dispose();
        expect(await snapshotTree(workspace)).toEqual(before);
        expect((await listRecursive(storage)).length).toBeGreaterThan(1);
        await fs.writeFile(path.join(workspace, 'stray.txt'), 'x');
        expect(await snapshotTree(workspace)).not.toEqual(before);
        await fs.rm(workspace, { recursive: true, force: true });
        await fs.rm(storage, { recursive: true, force: true });
    });
});

describe('0004 AC-009: the status history has one folder per project root', () => {
    const temp = createTempDirectories();
    afterEach(async () => temp.removeAll());

    async function openerFor(platform: NodeJS.Platform) {
        const storage = await temp.make('fs-roots-');
        const opener = createProjectStoreOpener({
            storage: { kind: 'directory', path: storage },
            platform,
            ids: createSequentialIds(),
            clock: createFakeRuntimeClock(),
            notices: createFakeNotices(),
        });
        return async (projectRoot: string) => {
            const store = await opener(projectRoot);
            temp.closeBeforeRemoval(() => store.dispose());
            return store;
        };
    }

    it('0004 AC-009: different keys give different folders, the same key the same folder', () => {
        expect(projectStoreDirectory('/s', 'file:///work/app')).toBe(projectStoreDirectory('/s', 'file:///work/app'));
        expect(projectStoreDirectory('/s', 'file:///work/app')).not.toBe(projectStoreDirectory('/s', 'file:///work/app-renamed'));
    });

    it('0004 AC-009: a project opened under another root reads none of the history of the first root', async () => {
        const open = await openerFor('linux');
        const original = await open('file:///work/app');
        await original.appendSpecStatusEntry('0007-board', { from: 'Draft', to: 'Ready' });
        await original.dispose();
        const renamed = await open('file:///work/app-renamed');
        expect(await renamed.readSpecStatusHistory()).toEqual({ available: true, value: [] });
        await renamed.dispose();
        const again = await open('file:///work/app');
        const history = await again.readSpecStatusHistory();
        expect(history.available && history.value.map((record) => record.entry)).toEqual([{ from: 'Draft', to: 'Ready' }]);
    });

    it('0004 AC-009: on Windows a root that differs only in letter case is the same project; elsewhere it is another', async () => {
        for (const [platform, shared] of [
            ['win32', true],
            ['linux', false],
        ] as const) {
            const open = await openerFor(platform);
            const first = await open('file:///c%3A/Work/App');
            await first.appendSpecStatusEntry('0007-board', { to: platform });
            await first.dispose();
            const other = await open('file:///c%3A/work/app');
            const history = await other.readSpecStatusHistory();
            expect(history.available && history.value.length, platform).toBe(shared ? 1 : 0);
            await other.dispose();
        }
    });

    it('an unavailable storage location opens an unavailable store with its reason', async () => {
        const store = await createProjectStoreOpener({
            storage: { kind: 'unavailable', reason: 'not local' },
            platform: 'linux',
            ids: createSequentialIds(),
            clock: createFakeRuntimeClock(),
            notices: createFakeNotices(),
        })('file:///work/app');
        temp.closeBeforeRemoval(() => store.dispose());
        expect(store.state().kind).toBe('unavailable');
        expect(await store.readSpecStatusHistory()).toMatchObject({ available: false });
    });
});
