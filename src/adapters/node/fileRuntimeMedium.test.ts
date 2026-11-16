import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFakeCredentials, createFakeNotices, createFakeRuntimeClock, createSequentialIds } from '../../core/runtime/testing/fakes';
import { describeRuntimeStoreContract, type MediumHarness } from '../../core/runtime/testing/contract';
import { snapshotTree } from '../../core/discovery/testing/snapshotTree';
import { openRuntimeStore } from '../../core/runtime/runtimeStore';
import { createFileRuntimeMedium, projectStoreDirectory } from './fileRuntimeMedium';

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

    it('AC-013: neither a sample token nor the credential is in the bytes the file medium wrote', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-runtime-mask-'));
        const store = await openRuntimeStore({
            medium: createFileRuntimeMedium(root),
            ids: createSequentialIds(),
            clock: createFakeRuntimeClock(),
            notices: createFakeNotices(),
            credentials: createFakeCredentials('credential-value-9876'),
            projectRoot: 'p',
            maxAgeDays: () => undefined,
        });
        const run = await store.createRun({ providerId: 'fake', spec: { stem: '0009-x', path: 'p' } });
        await store.appendEvent(run.runId, { type: 'm', payload: 'ghp_0123456789abcdefghijklmnopqrstuvwxyz and credential-value-9876' });
        await store.dispose();
        const bytes = (await Promise.all((await listRecursive(root)).map((name) => fs.readFile(path.join(root, ...name.split('/')), 'utf8')))).join('\n');
        expect(bytes).not.toContain('ghp_0123');
        expect(bytes).not.toContain('credential-value-9876');
        expect(bytes).toContain('[masked]');
        await fs.rm(root, { recursive: true, force: true });
    });

    it('AC-016: no file or folder in a workspace changes while storing, restoring, clearing and failing', async () => {
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
                credentials: createFakeCredentials(),
                projectRoot: workspace,
                maxAgeDays: () => undefined,
            });
        const directory = projectStoreDirectory(storage, workspace);
        const first = await open(directory);
        const run = await first.createRun({ providerId: 'fake', spec: { stem: '0007-board', path: '.specs/active/0007-board.md' } });
        await first.appendEvent(run.runId, { type: 'message', payload: 'x' });
        await first.reportStatus(run.runId, 'Completed');
        await first.appendSpecStatusEntry('0007-board', { to: 'done' });
        await first.dispose();
        const second = await open(directory);
        await second.listRuns();
        await second.clear();
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
