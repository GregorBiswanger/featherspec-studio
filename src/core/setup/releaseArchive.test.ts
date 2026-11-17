import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTarGzArchive } from '../../adapters/node/tarGzArchive';
import { releaseEntries, tarGz, type TarEntrySpec } from '../../adapters/node/testing/tarWriter';
import type { ArchiveEntry, ReleaseArchivePort } from '../ports/releaseArchive';
import { checkRelease, type ReleaseCheck } from './releaseArchive';
import { archiveRefusedText, MAX_ARCHIVE_BYTES } from './setupTexts';

const real = createTarGzArchive();

function fixture(name: string): Uint8Array {
    return new Uint8Array(readFileSync(path.resolve(__dirname, '..', '..', '..', 'test', 'fixtures', 'setup', name)));
}

function fake(entries: readonly ArchiveEntry[]): ReleaseArchivePort {
    return { read: async () => ({ ok: true, entries }) };
}

function file(entryPath: string, text = 'x'): ArchiveEntry {
    return { path: entryPath, kind: 'file', bytes: new TextEncoder().encode(text) };
}

function dir(entryPath: string): ArchiveEntry {
    return { path: entryPath, kind: 'directory', bytes: new Uint8Array() };
}

const AGENTS = 'FeatherSpecVersion: 2.0.0 # managed\n';
const base = (): ArchiveEntry[] => [dir('top'), file('top/AGENTS.md', AGENTS), file('top/.specs/README.md')];

async function check(entries: readonly ArchiveEntry[]): Promise<ReleaseCheck> {
    return checkRelease(fake(entries), new Uint8Array(10));
}

function refusal(result: ReleaseCheck): string {
    if (result.ok) {
        throw new Error('expected a refusal');
    }
    return result.reason;
}

describe('0014 AC-007: the release files of the real 1.10.0 archive', () => {
    it('67 files in, 63 taken: the root CHANGELOG.md, LICENSE, README.md and featherspec-logo.png stay out, .specs/README.md and CLAUDE.md are in', async () => {
        const result = await checkRelease(real, fixture('featherspec-1.10.0.tar.gz'));
        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.version).toBe('1.10.0');
        expect(result.files).toHaveLength(63);
        const paths = result.files.map((entry) => entry.path);
        expect(paths).toContain('.specs/README.md');
        expect(paths).toContain('CLAUDE.md');
        expect(paths).toContain('AGENTS.md');
        expect(paths).toContain('.gitignore');
        expect(paths).toContain('.vscode/settings.json');
        for (const left of ['CHANGELOG.md', 'LICENSE', 'README.md', 'featherspec-logo.png']) {
            expect(paths).not.toContain(left);
        }
        expect(paths.every((entry) => !entry.startsWith('featherspec-1.10.0'))).toBe(true);
    });

    it('negative control: a README.md below a folder is a release file, only the root one is left out', async () => {
        const result = await check([...base(), file('top/README.md'), file('top/docs/README.md'), file('top/docs/LICENSE')]);
        expect(result.ok && result.files.map((entry) => entry.path)).toEqual(['AGENTS.md', '.specs/README.md', 'docs/README.md', 'docs/LICENSE']);
    });

    it('a file a later release adds is taken without a change here', async () => {
        const result = await check([...base(), file('top/.github/workflows/new-in-2.0.yml', 'on: push')]);
        expect(result.ok && result.files.map((entry) => entry.path)).toContain('.github/workflows/new-in-2.0.yml');
    });

    it('takes the bytes of the archive, not a decoded copy', async () => {
        const bytes = new Uint8Array([0, 255, 128, 10, 13]);
        const result = await check([...base(), { path: 'top/blob.bin', kind: 'file', bytes }]);
        expect(result.ok && [...(result.files.find((entry) => entry.path === 'blob.bin')?.bytes ?? [])]).toEqual([0, 255, 128, 10, 13]);
    });

    it('works on the git archive sample made by git archive (symbolic link refused, see below) and on a tar.gz built here', async () => {
        const built = tarGz(releaseEntries('featherspec-9.9.9', '9.9.9'));
        const result = await checkRelease(real, built);
        expect(result.ok && result.version).toBe('9.9.9');
        expect(result.ok && result.files.map((entry) => entry.path)).toEqual(['AGENTS.md', '.specs/README.md']);
    });
});

describe('0014 AC-006: the archive is refused, with the reason naming the failed check', () => {
    it('bytes that are no archive', async () => {
        expect(refusal(await checkRelease(real, new TextEncoder().encode('<html>rate limited</html>')))).toBe('it could not be read as a .tar.gz archive');
    });

    it('a download over 20 MB is refused before it is opened', async () => {
        let opened = false;
        const archive: ReleaseArchivePort = {
            read: async () => {
                opened = true;
                return { ok: true, entries: [] };
            },
        };
        const result = await checkRelease(archive, new Uint8Array(MAX_ARCHIVE_BYTES + 1));
        expect(refusal(result)).toBe('it is larger than 20 MB');
        expect(opened).toBe(false);
    });

    it('unpacked data over 20 MB (the reader reports it)', async () => {
        const archive: ReleaseArchivePort = { read: async () => ({ ok: false, failure: 'too-large' }) };
        expect(refusal(await checkRelease(archive, new Uint8Array(1)))).toBe('it is larger than 20 MB');
    });

    it('the reader gets the 20 MB limit for the unpacked size', async () => {
        let limit = 0;
        const archive: ReleaseArchivePort = {
            read: async (_bytes, max) => {
                limit = max;
                return { ok: true, entries: base() };
            },
        };
        await checkRelease(archive, new Uint8Array(1));
        expect(limit).toBe(20 * 1024 * 1024);
    });

    it('no entry, or entries with two top folders', async () => {
        expect(refusal(await check([]))).toBe('it does not have a single top folder');
        expect(refusal(await check([...base(), file('other/AGENTS.md', AGENTS)]))).toBe('it does not have a single top folder');
    });

    it('a file at the root of the archive next to the top folder', async () => {
        expect(refusal(await check([...base(), file('stray.txt')]))).toBe('it does not have a single top folder');
    });

    it('no root AGENTS.md', async () => {
        const expected = 'it has no root AGENTS.md with a FeatherSpecVersion: line that has a value';
        expect(refusal(await check([dir('top'), file('top/.specs/README.md'), file('top/sub/AGENTS.md', AGENTS)]))).toBe(expected);
    });

    it.each(['no version line here\n', 'FeatherSpecVersion:\n', 'FeatherSpecVersion: # nothing\n'])('an AGENTS.md without a value for the version line (%j)', async (text) => {
        expect(refusal(await check([dir('top'), file('top/AGENTS.md', text), file('top/.specs/README.md')]))).toBe(
            'it has no root AGENTS.md with a FeatherSpecVersion: line that has a value',
        );
    });

    it('no file below .specs/ (a folder alone does not count)', async () => {
        const expected = 'it has no file below .specs/';
        expect(refusal(await check([dir('top'), file('top/AGENTS.md', AGENTS), dir('top/.specs')]))).toBe(expected);
        expect(refusal(await check([dir('top'), file('top/AGENTS.md', AGENTS), file('top/.specsx/a.md')]))).toBe(expected);
    });

    it('an entry that is neither a file nor a folder (symbolic link, device)', async () => {
        const link: ArchiveEntry = { path: 'top/link.md', kind: 'other', bytes: new Uint8Array() };
        expect(refusal(await check([...base(), link]))).toBe('it holds an entry that is neither a file nor a folder: "top/link.md"');
    });

    it('metadata records (the archive format\'s own) are no problem', async () => {
        const result = await check([{ path: 'pax_global_header', kind: 'metadata', bytes: new Uint8Array() }, ...base()]);
        expect(result.ok).toBe(true);
    });

    it.each([
        ['absolute', '/top/etc.txt'],
        ['a drive path', 'C:/Windows/x.txt'],
        ['a backslash', 'top\\evil.txt'],
        ['a colon', 'top/a:b.txt'],
        ['a control character', 'top/a\u0007b.txt'],
        ['a DEL character', 'top/a\u007fb.txt'],
        ['a .. segment', 'top/../outside.txt'],
        ['a leading .. segment', '../top/outside.txt'],
        ['a .git segment', 'top/.git/config'],
        ['a .GIT segment', 'top/.GIT/config'],
        ['a . segment', 'top/./a.txt'],
        ['an empty segment', 'top//a.txt'],
    ])('an entry whose path is unsafe: %s', async (_name, entryPath) => {
        const reason = refusal(await check([...base(), file(entryPath)]));
        expect(reason).toBe(`it holds an entry with an unsafe path: ${JSON.stringify(entryPath)}`);
    });

    it('negative control: names that only look like the unsafe ones are fine', async () => {
        const result = await check([...base(), file('top/.gitignore'), file('top/.gitattributes'), file('top/a..b/c.txt'), file('top/my.git/x')]);
        expect(result.ok).toBe(true);
    });

    it('two entries whose paths differ only in letter case, or are the same path twice', async () => {
        expect(refusal(await check([...base(), file('top/Readme.md'), file('top/README.MD')]))).toBe(
            'it holds two entries whose paths differ at most in letter case: "top/Readme.md" and "top/README.MD"',
        );
        expect(refusal(await check([...base(), file('top/a.txt'), file('top/a.txt')]))).toBe(
            'it holds two entries whose paths differ at most in letter case: "top/a.txt" and "top/a.txt"',
        );
    });

    it('a folder entry with a trailing slash counts like the folder', async () => {
        const result = await check([dir('top/'), file('top/AGENTS.md', AGENTS), file('top/.specs/README.md')]);
        expect(result.ok).toBe(true);
    });

    it('hostile archives built as real tar.gz are refused through the real reader and write nothing (the check has no side effect)', async () => {
        const cases: [string, TarEntrySpec[], string][] = [
            ['dot dot', releaseEntries('top', '1.0.0', [{ path: 'top/../../escape.txt', content: 'x' }]), 'it holds an entry with an unsafe path: "top/../../escape.txt"'],
            ['symlink', releaseEntries('top', '1.0.0', [{ path: 'top/link', type: '2', linkname: '/etc/passwd' }]), 'it holds an entry that is neither a file nor a folder: "top/link"'],
            ['no .specs file', releaseEntries('top').filter((entry) => !entry.path.startsWith('top/.specs/')), 'it has no file below .specs/'],
        ];
        for (const [, entries, reason] of cases) {
            expect(refusal(await checkRelease(real, tarGz(entries)))).toBe(reason);
        }
    });

    it('the git archive sample is refused because of its symbolic link, with the real reader', async () => {
        expect(refusal(await checkRelease(real, fixture('git-archive-sample.tar.gz')))).toBe('it holds an entry that is neither a file nor a folder: "sample-1.0.0/link.md"');
    });
});

describe('0014 AC-006: the refusal message', () => {
    it('is "The downloaded archive is not a FeatherSpec release: <reason>."', () => {
        expect(archiveRefusedText('it has no file below .specs/')).toBe('The downloaded archive is not a FeatherSpec release: it has no file below .specs/.');
    });
});
