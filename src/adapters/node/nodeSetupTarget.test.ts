import { existsSync, mkdtempSync, promises as fs, rmSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { applySetup } from '../../core/setup/applySetup';
import { classifyFiles } from '../../core/setup/fileClasses';
import { loadRealRelease } from '../../core/setup/testing/realRelease';
import { createTempDirectories } from '../../core/runtime/testing/tempDirectories';
import { createNodeSetupTarget, type NodeSetupFs } from './nodeSetupTarget';

const directories = createTempDirectories();
const onWindows = process.platform === 'win32';

function tempDirectoryIgnoresCase(): boolean {
    const probe = mkdtempSync(path.join(os.tmpdir(), 'fs-setup-case-probe-'));
    try {
        writeFileSync(path.join(probe, 'Probe-A'), '');
        return existsSync(path.join(probe, 'probe-a'));
    } finally {
        rmSync(probe, { recursive: true, force: true });
    }
}

const caseInsensitiveTemp = tempDirectoryIgnoresCase();

afterEach(async () => {
    await directories.removeAll();
});

const enc = (text: string) => new TextEncoder().encode(text);

async function folder(): Promise<{ dir: string; root: string }> {
    const dir = await directories.make('fs-setup-target-');
    return { dir, root: pathToFileURL(dir).href };
}

async function tree(dir: string): Promise<string[]> {
    const lines: string[] = [];
    async function walk(current: string): Promise<void> {
        for (const entry of await fs.readdir(current, { withFileTypes: true })) {
            const full = path.join(current, entry.name);
            const relative = path.relative(dir, full).split(path.sep).join('/');
            lines.push(entry.isDirectory() ? `${relative}/` : relative);
            if (entry.isDirectory()) {
                await walk(full);
            }
        }
    }
    await walk(dir);
    return lines.sort();
}

function failingWrite(match: string, partial: boolean): NodeSetupFs {
    return {
        ...fs,
        async open(target: Parameters<typeof fs.open>[0], flags?: Parameters<typeof fs.open>[1], mode?: Parameters<typeof fs.open>[2]) {
            const handle = await fs.open(target, flags, mode);
            if (!String(target).includes(match)) {
                return handle;
            }
            return new Proxy(handle, {
                get(source, property) {
                    if (property === 'writeFile') {
                        return async (data: Uint8Array) => {
                            if (partial) {
                                await source.write(data.subarray(0, Math.max(1, Math.floor(data.length / 2))));
                            }
                            throw Object.assign(new Error("ENOSPC: no space left on device, write 'x'"), { code: 'ENOSPC' });
                        };
                    }
                    const value = Reflect.get(source, property) as unknown;
                    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(source) : value;
                },
            });
        },
    } as NodeSetupFs;
}

describe('0014 AC-010, BR-04: kind and readBytes on the real file system', () => {
    it('tells file, folder and absent apart, also below a file', async () => {
        const { dir, root } = await folder();
        await fs.writeFile(path.join(dir, 'a.txt'), 'x');
        await fs.mkdir(path.join(dir, 'sub'));
        const target = createNodeSetupTarget();
        expect(await target.kind(root, 'a.txt')).toBe('file');
        expect(await target.kind(root, 'sub')).toBe('directory');
        expect(await target.kind(root, 'missing.txt')).toBeUndefined();
        expect(await target.kind(root, 'a.txt/below')).toBeUndefined();
        expect([...(await target.readBytes(root, 'a.txt'))]).toEqual([0x78]);
    });

    it.skipIf(onWindows)('a link to a file is a file, a dangling link is other (the path exists)', async () => {
        const { dir, root } = await folder();
        await fs.writeFile(path.join(dir, 'real.md'), 'x');
        await fs.symlink('real.md', path.join(dir, 'link.md'));
        await fs.symlink('gone.md', path.join(dir, 'dangling.md'));
        const target = createNodeSetupTarget();
        expect(await target.kind(root, 'link.md')).toBe('file');
        expect(await target.kind(root, 'dangling.md')).toBe('other');
    });
});

describe('0014 AC-009, AC-010: createExclusive', () => {
    it('creates the file and the folders its path needs, with the exact bytes (no line ending translation)', async () => {
        const { dir, root } = await folder();
        const bytes = new Uint8Array([0x61, 0x0d, 0x0a, 0x00, 0xff, 0x0a]);
        expect(await createNodeSetupTarget().createExclusive(root, '.claude/rules/deep/a.md', bytes)).toBe('created');
        expect([...(await fs.readFile(path.join(dir, '.claude', 'rules', 'deep', 'a.md')))]).toEqual([...bytes]);
    });

    it('never replaces an existing file: the answer is exists and the bytes stay', async () => {
        const { dir, root } = await folder();
        await fs.writeFile(path.join(dir, 'AGENTS.md'), 'mine');
        expect(await createNodeSetupTarget().createExclusive(root, 'AGENTS.md', enc('theirs'))).toBe('exists');
        expect(await fs.readFile(path.join(dir, 'AGENTS.md'), 'utf8')).toBe('mine');
    });

    it('an existing folder at the path is exists, too', async () => {
        const { dir, root } = await folder();
        await fs.mkdir(path.join(dir, 'AGENTS.md'));
        expect(await createNodeSetupTarget().createExclusive(root, 'AGENTS.md', enc('x'))).toBe('exists');
    });

    it.skipIf(onWindows)('a dangling link at the path is exists and nothing is created behind it', async () => {
        const { dir, root } = await folder();
        await fs.symlink('elsewhere.md', path.join(dir, 'AGENTS.md'));
        expect(await createNodeSetupTarget().createExclusive(root, 'AGENTS.md', enc('x'))).toBe('exists');
        expect(await tree(dir)).toEqual(['AGENTS.md']);
    });

    it('of many creates of one path at once exactly one wins and its bytes are the file', async () => {
        const { dir, root } = await folder();
        const target = createNodeSetupTarget();
        const answers = await Promise.all(Array.from({ length: 20 }, (_unused, index) => target.createExclusive(root, 'race/file.txt', enc(`writer ${index}`))));
        expect(answers.filter((answer) => answer === 'created')).toHaveLength(1);
        const winner = answers.indexOf('created');
        expect(await fs.readFile(path.join(dir, 'race', 'file.txt'), 'utf8')).toBe(`writer ${winner}`);
    });

    it('a parent that is a file is a write error with the reason of the file system and no path', async () => {
        const { dir, root } = await folder();
        await fs.writeFile(path.join(dir, '.claude'), 'a file');
        const failure = await createNodeSetupTarget().createExclusive(root, '.claude/rules/a.md', enc('x')).then(
            () => undefined,
            (error: unknown) => error,
        );
        expect(failure).toBeInstanceOf(Error);
        expect((failure as Error).message).toMatch(/^(EEXIST|ENOTDIR)\b/);
        expect((failure as Error).message).not.toContain(dir);
    });

    it('AC-009: a write that fails half-way leaves the file absent, not half-written, and reports the reason', async () => {
        const { dir, root } = await folder();
        const target = createNodeSetupTarget(failingWrite('boom.txt', true));
        const failure = await target.createExclusive(root, 'sub/boom.txt', enc('abcdefgh')).then(
            () => undefined,
            (error: unknown) => error,
        );
        expect((failure as Error).message).toBe('ENOSPC: no space left on device');
        expect(await tree(dir)).toEqual(['sub/']);
    });

    it('AC-009: negative control, a write that does not fail is whole', async () => {
        const { dir, root } = await folder();
        const target = createNodeSetupTarget(failingWrite('boom.txt', true));
        await target.createExclusive(root, 'sub/fine.txt', enc('abcdefgh'));
        expect(await fs.readFile(path.join(dir, 'sub', 'fine.txt'), 'utf8')).toBe('abcdefgh');
    });
});

describe('0014 AC-010, AC-012, AC-013: replaceIfUnchanged', () => {
    it('replaces the content when the file still has the expected bytes and leaves no temporary file', async () => {
        const { dir, root } = await folder();
        await fs.writeFile(path.join(dir, '.gitignore'), 'a\r\n');
        expect(await createNodeSetupTarget().replaceIfUnchanged(root, '.gitignore', enc('a\r\n'), enc('a\r\nb\r\n'))).toBe('replaced');
        expect(await fs.readFile(path.join(dir, '.gitignore'), 'utf8')).toBe('a\r\nb\r\n');
        expect(await tree(dir)).toEqual(['.gitignore']);
    });

    it('answers changed and writes nothing when the content differs, the file is gone or is a folder', async () => {
        const { dir, root } = await folder();
        await fs.writeFile(path.join(dir, '.gitignore'), 'a\nuser added\n');
        await fs.mkdir(path.join(dir, 'folder'));
        const target = createNodeSetupTarget();
        expect(await target.replaceIfUnchanged(root, '.gitignore', enc('a\n'), enc('a\nb\n'))).toBe('changed');
        expect(await target.replaceIfUnchanged(root, 'gone.txt', enc('a'), enc('b'))).toBe('changed');
        await expect(target.replaceIfUnchanged(root, 'folder', enc('a'), enc('b'))).rejects.toThrow();
        expect(await fs.readFile(path.join(dir, '.gitignore'), 'utf8')).toBe('a\nuser added\n');
        expect(await tree(dir)).toEqual(['.gitignore', 'folder/']);
    });

    it.skipIf(onWindows)('keeps the file mode', async () => {
        const { dir, root } = await folder();
        await fs.writeFile(path.join(dir, 'run.sh'), 'a', { mode: 0o755 });
        await createNodeSetupTarget().replaceIfUnchanged(root, 'run.sh', enc('a'), enc('ab'));
        expect((await fs.stat(path.join(dir, 'run.sh'))).mode & 0o777).toBe(0o755);
    });

    it.skipIf(onWindows)('writes through a link and keeps the link', async () => {
        const { dir, root } = await folder();
        await fs.writeFile(path.join(dir, 'real.json'), '{}');
        await fs.symlink('real.json', path.join(dir, 'settings.json'));
        expect(await createNodeSetupTarget().replaceIfUnchanged(root, 'settings.json', enc('{}'), enc('{"a": 1}'))).toBe('replaced');
        expect((await fs.lstat(path.join(dir, 'settings.json'))).isSymbolicLink()).toBe(true);
        expect(await fs.readFile(path.join(dir, 'real.json'), 'utf8')).toBe('{"a": 1}');
    });

    it('a failing temporary write leaves the original whole and no temporary file', async () => {
        const { dir, root } = await folder();
        await fs.writeFile(path.join(dir, '.gitignore'), 'a\n');
        const target = createNodeSetupTarget(failingWrite('.tmp', true));
        await expect(target.replaceIfUnchanged(root, '.gitignore', enc('a\n'), enc('a\nb\n'))).rejects.toThrow('ENOSPC: no space left on device');
        expect(await fs.readFile(path.join(dir, '.gitignore'), 'utf8')).toBe('a\n');
        expect(await tree(dir)).toEqual(['.gitignore']);
    });

    it('a rename that keeps failing leaves the original whole, removes the temporary file and reports the reason', async () => {
        const { dir, root } = await folder();
        await fs.writeFile(path.join(dir, '.gitignore'), 'a\n');
        let attempts = 0;
        const target = createNodeSetupTarget({
            ...fs,
            async rename() {
                attempts += 1;
                throw Object.assign(new Error("EPERM: operation not permitted, rename 'x' -> 'y'"), { code: 'EPERM' });
            },
        } as NodeSetupFs);
        await expect(target.replaceIfUnchanged(root, '.gitignore', enc('a\n'), enc('a\nb\n'))).rejects.toThrow('EPERM: operation not permitted');
        expect(attempts).toBe(5);
        expect(await fs.readFile(path.join(dir, '.gitignore'), 'utf8')).toBe('a\n');
        expect(await tree(dir)).toEqual(['.gitignore']);
    });

    it('a rename that fails once with EBUSY and then works replaces the file', async () => {
        const { dir, root } = await folder();
        await fs.writeFile(path.join(dir, '.gitignore'), 'a\n');
        let attempts = 0;
        const target = createNodeSetupTarget({
            ...fs,
            async rename(from: Parameters<typeof fs.rename>[0], to: Parameters<typeof fs.rename>[1]) {
                attempts += 1;
                if (attempts === 1) {
                    throw Object.assign(new Error('EBUSY: resource busy or locked'), { code: 'EBUSY' });
                }
                await fs.rename(from, to);
            },
        } as NodeSetupFs);
        expect(await target.replaceIfUnchanged(root, '.gitignore', enc('a\n'), enc('a\nb\n'))).toBe('replaced');
        expect(attempts).toBe(2);
        expect(await fs.readFile(path.join(dir, '.gitignore'), 'utf8')).toBe('a\nb\n');
    });
});

describe('0014 BR-05: clearSetupFolder', () => {
    it('removes .featherspec-setup/ with everything in it and nothing else', async () => {
        const { dir, root } = await folder();
        await fs.mkdir(path.join(dir, '.featherspec-setup', 'deep'), { recursive: true });
        await fs.writeFile(path.join(dir, '.featherspec-setup', 'deep', 'a.md'), 'x');
        await fs.writeFile(path.join(dir, '.featherspec-setup', '.gitignore'), '*\n');
        await fs.writeFile(path.join(dir, 'AGENTS.md'), 'mine');
        await fs.mkdir(path.join(dir, '.featherspec-setup-other'));
        await createNodeSetupTarget().clearSetupFolder(root);
        expect(await tree(dir)).toEqual(['.featherspec-setup-other/', 'AGENTS.md']);
    });

    it('does nothing when the folder is absent', async () => {
        const { dir, root } = await folder();
        await createNodeSetupTarget().clearSetupFolder(root);
        expect(await tree(dir)).toEqual([]);
    });

    it('does not touch a file of that name', async () => {
        const { dir, root } = await folder();
        await fs.writeFile(path.join(dir, '.featherspec-setup'), 'the user\'s file');
        await createNodeSetupTarget().clearSetupFolder(root);
        expect(await fs.readFile(path.join(dir, '.featherspec-setup'), 'utf8')).toBe('the user\'s file');
    });

    it.skipIf(onWindows)('does not follow a link of that name', async () => {
        const { dir, root } = await folder();
        const elsewhere = await directories.make('fs-setup-elsewhere-');
        await fs.writeFile(path.join(elsewhere, 'keep.txt'), 'keep');
        await fs.symlink(elsewhere, path.join(dir, '.featherspec-setup'));
        await createNodeSetupTarget().clearSetupFolder(root);
        expect(await fs.readFile(path.join(elsewhere, 'keep.txt'), 'utf8')).toBe('keep');
    });
});

describe('0014 AC-009, AC-010, AC-014, AC-024: a whole setup of the real 1.10.0 release on the real file system', () => {
    it('into an empty folder: the 63 release files with their bytes and nothing else', async () => {
        const real = await loadRealRelease();
        const { dir, root } = await folder();
        const target = createNodeSetupTarget();
        const classes = await classifyFiles(target, root, real.files);
        const outcome = await applySetup(target, root, classes);
        expect(outcome).toMatchObject({ completed: [], kept: [], notWritten: [], stopped: undefined });
        expect(outcome.created).toHaveLength(63);
        for (const file of real.files) {
            expect([...(await fs.readFile(path.join(dir, ...file.path.split('/'))))]).toEqual([...file.bytes]);
        }
        const folders = new Set(real.files.flatMap((file) => file.path.split('/').slice(0, -1).map((_part, index, parts) => `${parts.slice(0, index + 1).join('/')}/`)));
        expect(await tree(dir)).toEqual([...real.files.map((file) => file.path), ...folders].sort());
    });

    it('a second setup into the same folder finds every file the same and writes nothing', async () => {
        const real = await loadRealRelease();
        const { dir, root } = await folder();
        const target = createNodeSetupTarget();
        await applySetup(target, root, await classifyFiles(target, root, real.files));
        const before = await Promise.all((await tree(dir)).filter((name) => !name.endsWith('/')).map(async (name) => [name, (await fs.stat(path.join(dir, name))).mtimeMs] as const));
        const classes = await classifyFiles(target, root, real.files);
        expect(classes.every((entry) => entry.kind === 'same')).toBe(true);
        const outcome = await applySetup(target, root, classes);
        expect(outcome).toMatchObject({ created: [], completed: [], kept: [], notWritten: [], stopped: undefined });
        const after = await Promise.all(before.map(async ([name]) => [name, (await fs.stat(path.join(dir, name))).mtimeMs] as const));
        expect(after).toEqual(before);
    });

    it('AC-010 example: with their own AGENTS.md and CLAUDE.md both stay byte-identical, the release copies are parked, .gitignore and settings.json are completed', async () => {
        const real = await loadRealRelease();
        const { dir, root } = await folder();
        const agents = new Uint8Array([0xef, 0xbb, 0xbf, ...enc('# My project\r\n\r\nHand-written rules.\r\n')]);
        const claude = enc('See AGENTS.md\n');
        await fs.writeFile(path.join(dir, 'AGENTS.md'), agents);
        await fs.writeFile(path.join(dir, 'CLAUDE.md'), claude);
        await fs.writeFile(path.join(dir, 'main.ts'), 'export {};\n');
        await fs.writeFile(path.join(dir, '.gitignore'), 'node_modules/\r\ndist/\r\n');
        await fs.mkdir(path.join(dir, '.vscode'));
        await fs.writeFile(path.join(dir, '.vscode', 'settings.json'), '{\r\n\t// my editor\r\n\t"editor.tabSize": 2\r\n}\r\n');
        const target = createNodeSetupTarget();
        const outcome = await applySetup(target, root, await classifyFiles(target, root, real.files));
        expect(outcome.stopped).toBeUndefined();
        expect(outcome.kept).toEqual(['AGENTS.md', 'CLAUDE.md']);
        expect(outcome.completed.sort()).toEqual(['.gitignore', '.vscode/settings.json']);
        expect([...(await fs.readFile(path.join(dir, 'AGENTS.md')))]).toEqual([...agents]);
        expect([...(await fs.readFile(path.join(dir, 'CLAUDE.md')))]).toEqual([...claude]);
        expect(await fs.readFile(path.join(dir, 'main.ts'), 'utf8')).toBe('export {};\n');
        const gitignore = await fs.readFile(path.join(dir, '.gitignore'), 'utf8');
        expect(gitignore.startsWith('node_modules/\r\ndist/\r\n# Local, machine-specific agent configuration')).toBe(true);
        expect(gitignore.includes('\r\n')).toBe(true);
        expect(gitignore.replace(/\r\n/g, '')).not.toContain('\n');
        const settings = await fs.readFile(path.join(dir, '.vscode', 'settings.json'), 'utf8');
        expect(settings.startsWith('{\r\n\t// my editor\r\n\t"editor.tabSize": 2,\r\n\t"chat.useAgentsMdFile": true')).toBe(true);
        const parked = (await tree(dir)).filter((name) => name.startsWith('.featherspec-setup/') && !name.endsWith('/'));
        expect(parked).toEqual(['.featherspec-setup/.gitignore', '.featherspec-setup/AGENTS.md', '.featherspec-setup/CLAUDE.md']);
        expect(await fs.readFile(path.join(dir, '.featherspec-setup', '.gitignore'), 'utf8')).toBe('*\n');
        const parkedAgents = real.files.find((file) => file.path === 'AGENTS.md');
        expect([...(await fs.readFile(path.join(dir, '.featherspec-setup', 'AGENTS.md')))]).toEqual([...(parkedAgents?.bytes ?? [])]);
        expect((await tree(dir)).some((name) => name.endsWith('.tmp'))).toBe(false);
    });

    it('AC-020: a write that fails stops the setup, keeps what is written and leaves no AGENTS.md', async () => {
        const real = await loadRealRelease();
        const { dir, root } = await folder();
        await fs.mkdir(path.join(dir, '.github'));
        await fs.writeFile(path.join(dir, '.github', 'agents'), 'a file where a folder belongs');
        const target = createNodeSetupTarget();
        const outcome = await applySetup(target, root, await classifyFiles(target, root, real.files));
        expect(outcome.stopped?.path.startsWith('.github/agents/')).toBe(true);
        expect(outcome.stopped?.reason).toMatch(/^(EEXIST|ENOTDIR)\b/);
        expect(outcome.created.length).toBeGreaterThan(0);
        expect(outcome.created.length + outcome.notWritten.length).toBe(63);
        expect(await fs.stat(path.join(dir, 'AGENTS.md')).then(() => true, () => false)).toBe(false);
        expect(await fs.readFile(path.join(dir, '.github', 'agents'), 'utf8')).toBe('a file where a folder belongs');
    });
});

describe.runIf(caseInsensitiveTemp)('0014 BR-03, AC-010: letter case on a case-insensitive file system (runs only where the temp directory ignores case)', () => {
    it('an own agents.md is never replaced and is classed by its content: other content is kept and parked, release content in CRLF is the same', async () => {
        const real = await loadRealRelease();
        const { dir, root } = await folder();
        const mine = enc('# my own constitution\r\n');
        const releaseClaude = real.files.find((file) => file.path === 'CLAUDE.md');
        const claudeInCrlf = enc(new TextDecoder().decode(releaseClaude?.bytes).replace(/\n/g, '\r\n'));
        await fs.writeFile(path.join(dir, 'agents.md'), mine);
        await fs.writeFile(path.join(dir, 'claude.md'), claudeInCrlf);
        const target = createNodeSetupTarget();
        const classes = await classifyFiles(target, root, real.files);
        expect(classes.find((entry) => entry.file.path === 'AGENTS.md')?.kind).toBe('kept');
        expect(classes.find((entry) => entry.file.path === 'CLAUDE.md')?.kind).toBe('same');
        const outcome = await applySetup(target, root, classes);
        expect(outcome.stopped).toBeUndefined();
        expect(outcome.kept).toEqual(['AGENTS.md']);
        expect(outcome.created).toHaveLength(61);
        const names = await fs.readdir(dir);
        expect(names).toEqual(expect.arrayContaining(['agents.md', 'claude.md']));
        expect(names).not.toContain('AGENTS.md');
        expect(names).not.toContain('CLAUDE.md');
        expect([...(await fs.readFile(path.join(dir, 'agents.md')))]).toEqual([...mine]);
        expect([...(await fs.readFile(path.join(dir, 'claude.md')))]).toEqual([...claudeInCrlf]);
        const releaseAgents = real.files.find((file) => file.path === 'AGENTS.md');
        expect([...(await fs.readFile(path.join(dir, '.featherspec-setup', 'AGENTS.md')))]).toEqual([...(releaseAgents?.bytes ?? [])]);
    });
});

describe('temp directory hygiene', () => {
    it('the helper removes what it made (negative control for the others)', async () => {
        const made = await directories.make('fs-setup-hygiene-');
        expect(made.startsWith(os.tmpdir())).toBe(true);
        await directories.removeAll();
        expect(await fs.stat(made).then(() => true, () => false)).toBe(false);
    });
});
