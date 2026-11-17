import { describe, expect, it } from 'vitest';
import type { ReleaseFile } from './releaseArchive';
import { classifyFile, classifyFiles } from './fileClasses';
import { createMemoryTarget } from './testing/memoryTarget';
import { loadRealRelease } from './testing/realRelease';

const enc = (text: string) => new TextEncoder().encode(text);
const release = (path: string, text: string): ReleaseFile => ({ path, bytes: enc(text) });
const ROOT = 'file:///w';

describe('0014 BR-04, AC-011: the class of a release file in the target', () => {
    it('a path that does not exist is missing', async () => {
        const target = createMemoryTarget();
        expect((await classifyFile(target, ROOT, release('a.md', 'x'))).kind).toBe('missing');
    });

    it('AC-011: a file with the same bytes is the same', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, 'a.md', 'x\n');
        expect((await classifyFile(target, ROOT, release('a.md', 'x\n'))).kind).toBe('same');
    });

    it('BR-03: the same after converting CRLF to LF in both, in either direction', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, 'a.md', 'one\r\ntwo\r\n');
        target.setFile(ROOT, 'b.md', 'one\ntwo\n');
        expect((await classifyFile(target, ROOT, release('a.md', 'one\ntwo\n'))).kind).toBe('same');
        expect((await classifyFile(target, ROOT, release('b.md', 'one\r\ntwo\r\n'))).kind).toBe('same');
    });

    it('BR-03: negative control, a changed word, a missing final newline or a lone CR is not the same', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, 'a.md', 'one\ntwo');
        target.setFile(ROOT, 'b.md', 'one\rtwo\n');
        target.setFile(ROOT, 'c.md', 'uno\ntwo\n');
        for (const name of ['a.md', 'b.md', 'c.md']) {
            expect((await classifyFile(target, ROOT, release(name, 'one\ntwo\n'))).kind).toBe('kept');
        }
    });

    it('binary files compare by their bytes', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, 'logo.png', new Uint8Array([0x89, 0x50, 0x0d, 0x0a, 0x1a]));
        const same: ReleaseFile = { path: 'logo.png', bytes: new Uint8Array([0x89, 0x50, 0x0a, 0x1a]) };
        expect((await classifyFile(target, ROOT, same)).kind).toBe('same');
        const other: ReleaseFile = { path: 'logo.png', bytes: new Uint8Array([0x89, 0x51, 0x0a, 0x1a]) };
        expect((await classifyFile(target, ROOT, other)).kind).toBe('kept');
    });

    it('any other file that differs, AGENTS.md and CLAUDE.md included, is kept', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, 'AGENTS.md', 'my constitution\n');
        target.setFile(ROOT, 'CLAUDE.md', '@AGENTS.md\nmine\n');
        expect((await classifyFile(target, ROOT, release('AGENTS.md', 'theirs\n'))).kind).toBe('kept');
        expect((await classifyFile(target, ROOT, release('CLAUDE.md', '@AGENTS.md\n'))).kind).toBe('kept');
    });

    it('a folder or something else at the path of a release file is kept (it exists and is not the same)', async () => {
        const target = createMemoryTarget();
        target.setDirectory(ROOT, 'a.md');
        target.setOther(ROOT, 'b.md');
        expect((await classifyFile(target, ROOT, release('a.md', 'x'))).kind).toBe('kept');
        expect((await classifyFile(target, ROOT, release('b.md', 'x'))).kind).toBe('kept');
    });

    it('a file in a folder the target lacks is missing', async () => {
        const target = createMemoryTarget();
        expect((await classifyFile(target, ROOT, release('.claude/rules/x.md', 'x'))).kind).toBe('missing');
    });

    it('a file below a path that is a file in the target is missing as seen from the file system, the write then reports it (AC-020)', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.claude', 'a file where a folder should be');
        expect((await classifyFile(target, ROOT, release('.claude/rules/x.md', 'x'))).kind).toBe('missing');
    });
});

describe('0014 BR-04: .gitignore and .vscode/settings.json are completed, not kept', () => {
    it('a differing .gitignore with lines to add is completed; the basis is what the completion was computed from', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.gitignore', 'node_modules/\n');
        const result = await classifyFile(target, ROOT, release('.gitignore', '.sdd-scan/\n'));
        expect(result.kind).toBe('completed');
        if (result.kind === 'completed') {
            expect(new TextDecoder().decode(result.content)).toBe('node_modules/\n.sdd-scan/\n');
            expect(new TextDecoder().decode(result.basis)).toBe('node_modules/\n');
        }
    });

    it('a differing .gitignore with nothing to add is left alone', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.gitignore', 'node_modules/\n.sdd-scan/\n');
        expect((await classifyFile(target, ROOT, release('.gitignore', '.sdd-scan/\n# only a comment\n'))).kind).toBe('left');
    });

    it('a .gitignore equal after CRLF to LF is the same', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.gitignore', '.sdd-scan/\r\n');
        expect((await classifyFile(target, ROOT, release('.gitignore', '.sdd-scan/\n'))).kind).toBe('same');
    });

    it('a .gitignore with bytes that are no UTF-8 is left alone: no line can be appended safely, and its parked copy would collide with the .gitignore of .featherspec-setup/', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.gitignore', new Uint8Array([0xff, 0xfe, 0x0a]));
        expect((await classifyFile(target, ROOT, release('.gitignore', 'x\n'))).kind).toBe('left');
    });

    it('a differing settings.json with missing keys is completed and reports the kept keys', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.vscode/settings.json', '{\n  "a": 1,\n  "x": false\n}\n');
        const result = await classifyFile(target, ROOT, release('.vscode/settings.json', '{"x": true, "y": 2}'));
        expect(result.kind).toBe('completed');
        if (result.kind === 'completed') {
            expect(JSON.parse(new TextDecoder().decode(result.content))).toEqual({ a: 1, x: false, y: 2 });
            expect(result.keptSettingKeys).toEqual(['x']);
        }
    });

    it('a settings.json with nothing to add is left alone and still reports the kept keys', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.vscode/settings.json', '{"x": false}');
        const result = await classifyFile(target, ROOT, release('.vscode/settings.json', '{"x": true}'));
        expect(result).toMatchObject({ kind: 'left', keptSettingKeys: ['x'] });
    });

    it('a settings.json that is not one object is kept and parked like any other file', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.vscode/settings.json', '[1]');
        expect((await classifyFile(target, ROOT, release('.vscode/settings.json', '{"x": true}'))).kind).toBe('kept');
    });

    it('negative control: the same content under another name is kept, not completed', async () => {
        const target = createMemoryTarget();
        target.setFile(ROOT, '.vscode/other.json', '{"a": 1}');
        target.setFile(ROOT, 'sub/.gitignore', 'a\n');
        expect((await classifyFile(target, ROOT, release('.vscode/other.json', '{"x": 1}'))).kind).toBe('kept');
        expect((await classifyFile(target, ROOT, release('sub/.gitignore', 'b\n'))).kind).toBe('kept');
    });

    it('a folder at the path of .gitignore is left alone for the same reason', async () => {
        const target = createMemoryTarget();
        target.setDirectory(ROOT, '.gitignore');
        expect((await classifyFile(target, ROOT, release('.gitignore', 'x\n'))).kind).toBe('left');
    });
});

describe('0014 AC-007, AC-011: the real 1.10.0 release against folders', () => {
    it('against an empty folder every one of the 63 files is missing', async () => {
        const real = await loadRealRelease();
        const classes = await classifyFiles(createMemoryTarget(), ROOT, real.files);
        expect(classes).toHaveLength(63);
        expect(classes.every((entry) => entry.kind === 'missing')).toBe(true);
        expect(classes.map((entry) => entry.file.path)).toEqual(real.files.map((file) => file.path));
    });

    it('against a copy of itself (with CRLF line endings on the text files) every file is the same', async () => {
        const real = await loadRealRelease();
        const target = createMemoryTarget();
        for (const file of real.files) {
            const text = new TextDecoder().decode(file.bytes);
            const isText = !file.path.endsWith('.png') && !text.includes('\u0000');
            target.setFile(ROOT, file.path, isText ? enc(text.replace(/\n/g, '\r\n')) : file.bytes);
        }
        const classes = await classifyFiles(target, ROOT, real.files);
        expect(classes.filter((entry) => entry.kind !== 'same').map((entry) => `${entry.kind} ${entry.file.path}`)).toEqual([]);
    });

    it('with their own AGENTS.md, CLAUDE.md, .gitignore and settings: two kept, two completed, the rest missing', async () => {
        const real = await loadRealRelease();
        const target = createMemoryTarget();
        target.setFile(ROOT, 'AGENTS.md', '# mine\n');
        target.setFile(ROOT, 'CLAUDE.md', 'mine\n');
        target.setFile(ROOT, '.gitignore', 'node_modules/\n');
        target.setFile(ROOT, '.vscode/settings.json', '{\n  "editor.tabSize": 2\n}\n');
        const classes = await classifyFiles(target, ROOT, real.files);
        const count = (kind: string) => classes.filter((entry) => entry.kind === kind).length;
        expect(count('kept')).toBe(2);
        expect(count('completed')).toBe(2);
        expect(count('missing')).toBe(59);
        expect(classes.find((entry) => entry.file.path === 'AGENTS.md')?.kind).toBe('kept');
    });
});
