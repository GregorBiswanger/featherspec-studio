import { readdirSync, readFileSync, statSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applySetup, PARKED_GITIGNORE } from './applySetup';
import { classifyFiles } from './fileClasses';
import type { ReleaseFile } from './releaseArchive';
import { createMemoryTarget, type MemoryTarget } from './testing/memoryTarget';
import { loadRealRelease } from './testing/realRelease';

const ROOT = 'file:///w';
const enc = (text: string) => new TextEncoder().encode(text);
const file = (filePath: string, text: string): ReleaseFile => ({ path: filePath, bytes: enc(text) });

async function setup(target: MemoryTarget, files: readonly ReleaseFile[]) {
    const classes = await classifyFiles(target, ROOT, files);
    return { classes, outcome: await applySetup(target, ROOT, classes) };
}

const SMALL: ReleaseFile[] = [
    file('AGENTS.md', 'FeatherSpecVersion: 2.0.0\n'),
    file('CLAUDE.md', '@AGENTS.md\n'),
    file('.claude/rules/a.md', 'a\n'),
    file('.claude/rules/b.md', 'b\n'),
    file('.gitignore', '# state\n.sdd-scan/\n'),
    file('.vscode/settings.json', '{"x": true}'),
];

describe('0014 AC-009, AC-014, AC-020: the order and the result of a setup', () => {
    it('AC-009: an empty folder gets every release file with the archive bytes, the real 1.10.0 release included, and AGENTS.md is created after every other file', async () => {
        const real = await loadRealRelease();
        const target = createMemoryTarget();
        const { outcome } = await setup(target, real.files);
        expect(outcome.created).toHaveLength(63);
        expect(outcome).toMatchObject({ completed: [], kept: [], notWritten: [], stopped: undefined });
        for (const entry of real.files) {
            expect(target.text(ROOT, entry.path)).toBe(new TextDecoder().decode(entry.bytes));
        }
        const writes = target.log.filter((line) => line.startsWith('create '));
        expect(writes).toHaveLength(63);
        expect(writes[writes.length - 1]).toBe('create AGENTS.md');
        expect(target.log[0]).toBe('clear .featherspec-setup');
        expect(target.files(ROOT).some((name) => name.startsWith('.featherspec-setup/'))).toBe(false);
    });

    it('AC-010: own AGENTS.md and CLAUDE.md stay byte-identical; their release copies are parked, the rest is created', async () => {
        const real = await loadRealRelease();
        const target = createMemoryTarget();
        const mine = new Uint8Array([0xef, 0xbb, 0xbf, 0x23, 0x20, 0x6d, 0x69, 0x6e, 0x65, 0x0d, 0x0a, 0xff]);
        target.setFile(ROOT, 'AGENTS.md', mine);
        target.setFile(ROOT, 'CLAUDE.md', 'my claude\n');
        const { outcome } = await setup(target, real.files);
        expect(outcome.kept).toEqual(['AGENTS.md', 'CLAUDE.md']);
        expect(outcome.created).toHaveLength(61);
        expect([...(await target.readBytes(ROOT, 'AGENTS.md'))]).toEqual([...mine]);
        expect(target.text(ROOT, 'CLAUDE.md')).toBe('my claude\n');
        const agents = real.files.find((entry) => entry.path === 'AGENTS.md');
        expect(target.text(ROOT, '.featherspec-setup/AGENTS.md')).toBe(new TextDecoder().decode(agents?.bytes));
    });

    it('AC-014: the parked copies and their .gitignore (`*`) are written before any file outside .featherspec-setup/, and the folder holds exactly these', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, 'AGENTS.md', 'mine\n');
        target.setFile(ROOT, 'CLAUDE.md', 'mine\n');
        const { outcome } = await setup(target, SMALL);
        const writes = target.log.filter((line) => line.startsWith('create ') || line.startsWith('replace '));
        const firstOutside = writes.findIndex((line) => !line.startsWith('create .featherspec-setup/'));
        expect(writes.slice(0, firstOutside).sort()).toEqual(['create .featherspec-setup/.gitignore', 'create .featherspec-setup/AGENTS.md', 'create .featherspec-setup/CLAUDE.md']);
        expect(writes.slice(firstOutside).some((line) => line.includes('.featherspec-setup/'))).toBe(false);
        expect(target.files(ROOT).filter((name) => name.startsWith('.featherspec-setup/'))).toEqual(['.featherspec-setup/.gitignore', '.featherspec-setup/AGENTS.md', '.featherspec-setup/CLAUDE.md']);
        expect(target.text(ROOT, PARKED_GITIGNORE)).toBe('*\n');
        expect(outcome.kept).toEqual(['AGENTS.md', 'CLAUDE.md']);
    });

    it('AC-014: with no kept file there is no .featherspec-setup/ at all', async () => {
        const target = createMemoryTarget();
        await setup(target, SMALL);
        expect(target.files(ROOT).filter((name) => name.startsWith('.featherspec-setup'))).toEqual([]);
        expect(await target.kind(ROOT, '.featherspec-setup')).toBeUndefined();
    });

    it('§13, BR-05: a second setup replaces .featherspec-setup/ with this run\'s parked copies only', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.featherspec-setup/old-run.md', 'from an earlier run');
        target.setFile(ROOT, '.featherspec-setup/.gitignore', 'old\n');
        target.setFile(ROOT, 'CLAUDE.md', 'mine\n');
        await setup(target, SMALL);
        expect(target.files(ROOT).filter((name) => name.startsWith('.featherspec-setup/'))).toEqual(['.featherspec-setup/.gitignore', '.featherspec-setup/CLAUDE.md']);
        expect(target.text(ROOT, PARKED_GITIGNORE)).toBe('*\n');
    });

    it('§13, BR-05: negative control, a later run with nothing kept removes an earlier .featherspec-setup/', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.featherspec-setup/old-run.md', 'from an earlier run');
        await setup(target, SMALL);
        expect(target.files(ROOT).some((name) => name.startsWith('.featherspec-setup'))).toBe(false);
    });

    it('AC-011: a file that is the same is neither written nor counted', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, 'CLAUDE.md', '@AGENTS.md\r\n');
        const { outcome } = await setup(target, SMALL);
        expect(outcome.created).not.toContain('CLAUDE.md');
        expect(outcome.kept).toEqual([]);
        expect(target.log.some((line) => line.includes('CLAUDE.md'))).toBe(false);
        expect(target.text(ROOT, 'CLAUDE.md')).toBe('@AGENTS.md\r\n');
    });

    it('AC-012, AC-013: .gitignore and settings.json are completed in place and the kept setting keys are reported', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.gitignore', 'node_modules/\n');
        target.setFile(ROOT, '.vscode/settings.json', '{\n  "x": false\n}\n');
        const { outcome } = await setup(target, SMALL);
        expect(outcome.completed).toEqual(['.gitignore']);
        expect(target.text(ROOT, '.gitignore')).toBe('node_modules/\n# state\n.sdd-scan/\n');
        expect(outcome.keptSettingKeys).toEqual(['x']);
        expect(target.text(ROOT, '.vscode/settings.json')).toBe('{\n  "x": false\n}\n');
        expect(target.files(ROOT).filter((name) => name.startsWith('.featherspec-setup'))).toEqual([]);
    });
});

describe('0014 AC-010: a file that appears or changes after the confirmation is never replaced', () => {
    it('a differing file that appears before its create is classed anew and parked, its content untouched', async () => {
        const target = createMemoryTarget();
        const classes = await classifyFiles(target, ROOT, SMALL);
        let appeared = false;
        target.beforeCreate((where) => {
            if (where === '.claude/rules/a.md' && !appeared) {
                appeared = true;
                target.setFile(ROOT, '.claude/rules/a.md', 'written by someone else\n');
            }
        });
        const outcome = await applySetup(target, ROOT, classes);
        expect(target.text(ROOT, '.claude/rules/a.md')).toBe('written by someone else\n');
        expect(target.text(ROOT, '.featherspec-setup/.claude/rules/a.md')).toBe('a\n');
        expect(outcome.kept).toEqual(['.claude/rules/a.md']);
        expect(outcome.created).not.toContain('.claude/rules/a.md');
    });

    it('a file that appears with the same content is left alone, not parked, not counted', async () => {
        const target = createMemoryTarget();
        const classes = await classifyFiles(target, ROOT, SMALL);
        target.beforeCreate((where) => {
            if (where === '.claude/rules/a.md') {
                target.setFile(ROOT, '.claude/rules/a.md', 'a\r\n');
            }
        });
        const outcome = await applySetup(target, ROOT, classes);
        expect(outcome.kept).toEqual([]);
        expect(outcome.created).not.toContain('.claude/rules/a.md');
        expect(target.files(ROOT).some((name) => name.startsWith('.featherspec-setup'))).toBe(false);
    });

    it('a .gitignore that appears is completed, not replaced', async () => {
        const target = createMemoryTarget();
        const classes = await classifyFiles(target, ROOT, SMALL);
        target.beforeCreate((where) => {
            if (where === '.gitignore') {
                target.setFile(ROOT, '.gitignore', 'mine/\n');
            }
        });
        const outcome = await applySetup(target, ROOT, classes);
        expect(target.text(ROOT, '.gitignore')).toBe('mine/\n# state\n.sdd-scan/\n');
        expect(outcome.completed).toEqual(['.gitignore']);
    });

    it('a .gitignore that is a folder or turns into one is left alone, never parked over the .gitignore of .featherspec-setup/', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, 'CLAUDE.md', 'mine\n');
        target.setDirectory(ROOT, '.gitignore');
        const { outcome } = await setup(target, SMALL);
        expect(outcome.kept).toEqual(['CLAUDE.md']);
        expect(await target.kind(ROOT, '.gitignore')).toBe('directory');
        expect(target.text(ROOT, PARKED_GITIGNORE)).toBe('*\n');
    });

    it('a root AGENTS.md that appears last is parked, never replaced', async () => {
        const target = createMemoryTarget();
        const classes = await classifyFiles(target, ROOT, SMALL);
        target.beforeCreate((where) => {
            if (where === 'AGENTS.md') {
                target.setFile(ROOT, 'AGENTS.md', 'another window was faster\n');
            }
        });
        const outcome = await applySetup(target, ROOT, classes);
        expect(target.text(ROOT, 'AGENTS.md')).toBe('another window was faster\n');
        expect(target.text(ROOT, '.featherspec-setup/AGENTS.md')).toBe('FeatherSpecVersion: 2.0.0\n');
        expect(outcome.kept).toEqual(['AGENTS.md']);
    });

    it('a completion is written only if the file still has the content it was computed from, otherwise it is computed again', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.gitignore', 'node_modules/\n');
        const classes = await classifyFiles(target, ROOT, SMALL);
        target.beforeReplace((where) => {
            if (where === '.gitignore') {
                target.setFile(ROOT, '.gitignore', 'node_modules/\n.sdd-scan/\nnew-by-user/\n');
            }
        });
        const outcome = await applySetup(target, ROOT, classes);
        const text = target.text(ROOT, '.gitignore') ?? '';
        expect(text).toBe('node_modules/\n.sdd-scan/\nnew-by-user/\n');
        expect(outcome.completed).toEqual([]);
    });

    it('negative control: without a change in between the completion is written once from the first computation', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.gitignore', 'node_modules/\n');
        await setup(target, SMALL);
        expect(target.log.filter((line) => line === 'replace .gitignore')).toHaveLength(1);
    });

    it('a changed file whose new content still lacks lines is completed from the new content', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.gitignore', 'a/\n');
        const classes = await classifyFiles(target, ROOT, SMALL);
        let changed = false;
        target.beforeReplace((where) => {
            if (where === '.gitignore' && !changed) {
                changed = true;
                target.setFile(ROOT, '.gitignore', 'a/\nb/\n');
            }
        });
        const outcome = await applySetup(target, ROOT, classes);
        expect(target.text(ROOT, '.gitignore')).toBe('a/\nb/\n# state\n.sdd-scan/\n');
        expect(outcome.completed).toEqual(['.gitignore']);
    });

    it('a .gitignore that keeps changing under the setup is left alone after a few tries, never overwritten', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.gitignore', 'a/\n');
        const classes = await classifyFiles(target, ROOT, SMALL);
        let counter = 0;
        target.beforeReplace((where) => {
            if (where === '.gitignore') {
                counter += 1;
                target.setFile(ROOT, '.gitignore', `a/\nchanging-${counter}/\n`);
            }
        });
        const outcome = await applySetup(target, ROOT, classes);
        expect(target.text(ROOT, '.gitignore')).toBe(`a/\nchanging-${counter}/\n`);
        expect(outcome).toMatchObject({ kept: [], completed: [], stopped: undefined });
        expect(target.files(ROOT).filter((name) => name.startsWith('.featherspec-setup'))).toEqual([]);
        expect(counter).toBeLessThanOrEqual(5);
    });

    it('a file to complete that vanishes is created', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.gitignore', 'a/\n');
        const classes = await classifyFiles(target, ROOT, SMALL);
        target.beforeReplace((where) => {
            if (where === '.gitignore') {
                target.remove(ROOT, '.gitignore');
            }
        });
        const outcome = await applySetup(target, ROOT, classes);
        expect(outcome.created).toContain('.gitignore');
        expect(target.text(ROOT, '.gitignore')).toBe('# state\n.sdd-scan/\n');
    });

    it('a settings.json that keeps changing under the setup is parked after a few tries, never overwritten', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.vscode/settings.json', '{"a": 1}');
        const classes = await classifyFiles(target, ROOT, SMALL);
        let counter = 0;
        target.beforeReplace((where) => {
            if (where === '.vscode/settings.json') {
                counter += 1;
                target.setFile(ROOT, '.vscode/settings.json', `{"a": ${counter + 1}}`);
            }
        });
        const outcome = await applySetup(target, ROOT, classes);
        expect(target.text(ROOT, '.vscode/settings.json')).toBe(`{"a": ${counter + 1}}`);
        expect(outcome.kept).toEqual(['.vscode/settings.json']);
        expect(target.text(ROOT, '.featherspec-setup/.vscode/settings.json')).toBe('{"x": true}');
    });

    it('a completed settings.json that turns into a folder is parked', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.vscode/settings.json', '{"a": 1}');
        const classes = await classifyFiles(target, ROOT, SMALL);
        target.beforeReplace((where) => {
            if (where === '.vscode/settings.json') {
                target.remove(ROOT, '.vscode/settings.json');
                target.setDirectory(ROOT, '.vscode/settings.json');
            }
        });
        const outcome = await applySetup(target, ROOT, classes);
        expect(outcome.kept).toEqual(['.vscode/settings.json']);
        expect(await target.kind(ROOT, '.vscode/settings.json')).toBe('directory');
    });

    it('nothing the target had before is deleted, renamed or moved: every earlier file is still there with its bytes', async () => {
        const target = createMemoryTarget();
        const before: Record<string, string> = { 'AGENTS.md': 'mine', 'CLAUDE.md': 'mine too', 'src/index.ts': 'code', 'docs/a.md': 'doc', '.claude/rules/a.md': 'my rule' };
        for (const [name, text] of Object.entries(before)) {
            target.setFile(ROOT, name, text);
        }
        await setup(target, SMALL);
        for (const [name, text] of Object.entries(before)) {
            expect(target.text(ROOT, name)).toBe(text);
        }
    });
});

describe('0014 BR-03, AC-010: a name that differs from a release path only in letter case, on a case-insensitive target', () => {
    it('an own agents.md with other content is the same path: classed by content as kept, never replaced, the release copy parked', async () => {
        const target = createMemoryTarget({ caseInsensitive: true });
        target.setFile(ROOT, 'agents.md', 'my own constitution\r\n');
        const { classes, outcome } = await setup(target, SMALL);
        expect(classes.find((entry) => entry.file.path === 'AGENTS.md')?.kind).toBe('kept');
        expect(outcome.kept).toEqual(['AGENTS.md']);
        expect(outcome.created).not.toContain('AGENTS.md');
        expect(target.files(ROOT)).toContain('agents.md');
        expect(target.files(ROOT)).not.toContain('AGENTS.md');
        expect(target.text(ROOT, 'agents.md')).toBe('my own constitution\r\n');
        expect(target.text(ROOT, '.featherspec-setup/AGENTS.md')).toBe('FeatherSpecVersion: 2.0.0\n');
        expect(target.log).not.toContain('create AGENTS.md');
    });

    it('an own claude.md with the release content in CRLF is the same: untouched, neither parked nor counted', async () => {
        const target = createMemoryTarget({ caseInsensitive: true });
        target.setFile(ROOT, 'claude.md', '@AGENTS.md\r\n');
        const { classes, outcome } = await setup(target, SMALL);
        expect(classes.find((entry) => entry.file.path === 'CLAUDE.md')?.kind).toBe('same');
        expect(outcome.kept).toEqual([]);
        expect(target.text(ROOT, 'claude.md')).toBe('@AGENTS.md\r\n');
        expect(target.files(ROOT)).not.toContain('CLAUDE.md');
    });

    it('an agents.md that appears after the confirmation answers exists to the create, is classed anew and is never replaced', async () => {
        const target = createMemoryTarget({ caseInsensitive: true });
        const classes = await classifyFiles(target, ROOT, SMALL);
        target.beforeCreate((relativePath) => {
            if (relativePath === 'AGENTS.md') {
                target.setFile(ROOT, 'agents.md', 'raced in\n');
            }
        });
        const outcome = await applySetup(target, ROOT, classes);
        expect(target.text(ROOT, 'agents.md')).toBe('raced in\n');
        expect(target.files(ROOT)).not.toContain('AGENTS.md');
        expect(outcome.kept).toEqual(['AGENTS.md']);
        expect(target.text(ROOT, '.featherspec-setup/AGENTS.md')).toBe('FeatherSpecVersion: 2.0.0\n');
    });

    it('negative control: on a case-sensitive target agents.md is another file and AGENTS.md is created beside it', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, 'agents.md', 'my own constitution\r\n');
        const { outcome } = await setup(target, SMALL);
        expect(outcome.created).toContain('AGENTS.md');
        expect(target.files(ROOT)).toEqual(expect.arrayContaining(['agents.md', 'AGENTS.md']));
    });
});

describe('0014 AC-020: a failed write stops the setup, keeps what is written and leaves the folder eligible', () => {
    it('stops at the first failure with its path and the file system\'s reason, and does not create AGENTS.md', async () => {
        const target = createMemoryTarget();
        target.failOn('.claude/rules/b.md', 'EACCES: permission denied');
        const { outcome } = await setup(target, SMALL);
        expect(outcome.stopped).toEqual({ path: '.claude/rules/b.md', reason: 'EACCES: permission denied' });
        expect(outcome.created).toEqual(['CLAUDE.md', '.claude/rules/a.md']);
        expect(outcome.notWritten).toEqual(['.claude/rules/b.md', '.gitignore', '.vscode/settings.json', 'AGENTS.md']);
        expect(await target.kind(ROOT, 'AGENTS.md')).toBeUndefined();
        expect(target.text(ROOT, 'CLAUDE.md')).toBe('@AGENTS.md\n');
    });

    it('a failure while parking writes nothing outside .featherspec-setup/', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, 'AGENTS.md', 'mine\n');
        target.setFile(ROOT, 'CLAUDE.md', 'mine\n');
        target.failOn('.featherspec-setup/CLAUDE.md', 'ENOSPC: no space left on device');
        const { outcome } = await setup(target, SMALL);
        expect(outcome.stopped?.path).toBe('.featherspec-setup/CLAUDE.md');
        expect(target.files(ROOT).filter((name) => !name.startsWith('.featherspec-setup/'))).toEqual(['AGENTS.md', 'CLAUDE.md']);
        expect(outcome.created).toEqual([]);
        expect(outcome.notWritten).toContain('.claude/rules/a.md');
    });

    it('a failure to clear .featherspec-setup/ stops before anything else is written', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, 'CLAUDE.md', 'mine\n');
        target.failOn('.featherspec-setup', 'EBUSY: resource busy');
        const { outcome } = await setup(target, SMALL);
        expect(outcome.stopped).toEqual({ path: '.featherspec-setup', reason: 'EBUSY: resource busy' });
        expect(outcome.created).toEqual([]);
        expect(target.log).toEqual([]);
    });

    it('a failing completion stops the setup and AGENTS.md is still not created', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.gitignore', 'a/\n');
        target.failOn('.gitignore', 'EPERM: operation not permitted');
        const { outcome } = await setup(target, SMALL);
        expect(outcome.stopped?.path).toBe('.gitignore');
        expect(await target.kind(ROOT, 'AGENTS.md')).toBeUndefined();
        expect(target.text(ROOT, '.gitignore')).toBe('a/\n');
    });

    it('a path below a file stops with the reason of the file system', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.claude', 'a file where a folder belongs');
        const { outcome } = await setup(target, SMALL);
        expect(outcome.stopped).toEqual({ path: '.claude/rules/a.md', reason: 'not a directory' });
    });

    it('a retry creates only what is still missing and finishes with AGENTS.md', async () => {
        const target = createMemoryTarget();
        target.failOn('.claude/rules/b.md', 'EACCES: permission denied');
        const first = await setup(target, SMALL);
        expect(first.outcome.stopped).toBeDefined();
        const retry = createMemoryTargetFrom(target);
        const second = await setup(retry, SMALL);
        expect(second.outcome.stopped).toBeUndefined();
        expect(second.outcome.created).toEqual(['.claude/rules/b.md', '.gitignore', '.vscode/settings.json', 'AGENTS.md']);
        expect(second.outcome.kept).toEqual([]);
        expect(retry.files(ROOT)).toEqual(['.claude/rules/a.md', '.claude/rules/b.md', '.gitignore', '.vscode/settings.json', 'AGENTS.md', 'CLAUDE.md']);
    });

    it('a stopped setup leaves a folder that is not a project (no AGENTS.md), so 0001 reports it as eligible again', async () => {
        const target = createMemoryTarget();
        target.failOn('.vscode/settings.json', 'EIO');
        const { outcome } = await setup(target, SMALL);
        expect(outcome.stopped?.path).toBe('.vscode/settings.json');
        expect(target.files(ROOT)).not.toContain('AGENTS.md');
    });
});

function createMemoryTargetFrom(source: MemoryTarget): MemoryTarget {
    const copy = createMemoryTarget();
    for (const name of source.files(ROOT)) {
        copy.setFile(ROOT, name, source.text(ROOT, name) ?? '');
    }
    return copy;
}

describe('0014 AC-024: the setup starts no process and writes no other way', () => {
    function sources(directory: string): string[] {
        return readdirSync(directory).flatMap((name) => {
            const full = path.join(directory, name);
            if (statSync(full).isDirectory()) {
                return name === 'testing' ? [] : sources(full);
            }
            return /\.ts$/.test(name) && !/\.test\.ts$/.test(name) ? [full] : [];
        });
    }

    const root = path.resolve(__dirname, '..', '..');
    const setupFiles = [
        ...sources(path.join(root, 'core', 'setup')),
        ...sources(path.join(root, 'adapters', 'node')).filter((name) => /(?:nodeSetupTarget|fetchReleaseHttp|tarGzArchive)\.ts$/.test(name)),
        ...sources(path.join(root, 'adapters', 'vscode')).filter((name) => /setup[A-Za-z]*\.ts$/.test(path.basename(name))),
    ];
    const FORBIDDEN = /child_process|workspace\.fs|\bspawn\b|\bexecFile?\b|\bfork\(|simple-git|isomorphic-git/;

    it('no setup source imports child_process, writes through workspace.fs or names a Git library', () => {
        expect(setupFiles.length).toBeGreaterThanOrEqual(10);
        const offenders = setupFiles.filter((name) => FORBIDDEN.test(readFileSync(name, 'utf8')));
        expect(offenders.map((name) => path.relative(root, name))).toEqual([]);
    });

    it('negative control: the pattern finds each forbidden spelling', () => {
        for (const text of ["import { exec } from 'child_process'", 'vscode.workspace.fs.writeFile(', 'spawn(', 'execFile(', "import git from 'isomorphic-git'"]) {
            expect(FORBIDDEN.test(text)).toBe(true);
        }
    });
});
