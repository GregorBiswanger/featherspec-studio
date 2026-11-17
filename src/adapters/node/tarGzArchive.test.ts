import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { createTarGzArchive } from './tarGzArchive';
import { tarBytes, tarGz, type TarEntrySpec } from './testing/tarWriter';

const MAX = 20 * 1024 * 1024;
const archive = createTarGzArchive();

function fixture(name: string): Uint8Array {
    return new Uint8Array(readFileSync(path.resolve(__dirname, '..', '..', '..', 'test', 'fixtures', 'setup', name)));
}

async function entriesOf(bytes: Uint8Array) {
    const result = await archive.read(bytes, MAX);
    if (!result.ok) {
        throw new Error(`unexpected refusal ${result.failure}`);
    }
    return result.entries;
}

describe('0014 AC-007: the real 1.10.0 release archive', () => {
    it('is read whole: the pax_global_header as metadata, 16 folders, 67 files, all under featherspec-1.10.0/', async () => {
        const entries = await entriesOf(fixture('featherspec-1.10.0.tar.gz'));
        expect(entries.filter((entry) => entry.kind === 'metadata').map((entry) => entry.path)).toEqual(['pax_global_header']);
        expect(entries.filter((entry) => entry.kind === 'directory')).toHaveLength(16);
        expect(entries.filter((entry) => entry.kind === 'file')).toHaveLength(67);
        expect(entries.filter((entry) => entry.kind === 'other')).toEqual([]);
        const named = entries.filter((entry) => entry.kind !== 'metadata');
        expect(named.every((entry) => entry.path === 'featherspec-1.10.0' || entry.path.startsWith('featherspec-1.10.0/'))).toBe(true);
    });

    it('carries the file bytes: AGENTS.md has the version line and the logo is not mangled as text', async () => {
        const entries = await entriesOf(fixture('featherspec-1.10.0.tar.gz'));
        const agents = entries.find((entry) => entry.path === 'featherspec-1.10.0/AGENTS.md');
        expect(new TextDecoder().decode(agents?.bytes)).toContain('FeatherSpecVersion: 1.10.0');
        const logo = entries.find((entry) => entry.path === 'featherspec-1.10.0/featherspec-logo.png');
        expect([...(logo?.bytes.slice(0, 8) ?? [])]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    });

    it('negative control: the same bytes cut short are unreadable, not a smaller archive', async () => {
        const bytes = fixture('featherspec-1.10.0.tar.gz');
        const result = await archive.read(bytes.slice(0, bytes.length - 40000), MAX);
        expect(result.ok).toBe(false);
    });
});

describe('0014 AC-006: reading a git archive', () => {
    it('reads a path split into ustar prefix and name, a pax path record, and marks a symbolic link as other', async () => {
        const entries = await entriesOf(fixture('git-archive-sample.tar.gz'));
        const byKind = (kind: string) => entries.filter((entry) => entry.kind === kind).map((entry) => entry.path);
        expect(byKind('metadata')).toEqual(['pax_global_header']);
        expect(byKind('other')).toEqual(['sample-1.0.0/link.md']);
        const files = byKind('file');
        expect(files).toContain(`sample-1.0.0/${'d'.repeat(60)}/${'e'.repeat(60)}/file-with-a-longer-name.txt`);
        expect(files).toContain(`sample-1.0.0/${'f'.repeat(130)}.txt`);
        expect(files).toContain('sample-1.0.0/AGENTS.md');
    });

    it('keeps the content of the files of the sample', async () => {
        const entries = await entriesOf(fixture('git-archive-sample.tar.gz'));
        const readme = entries.find((entry) => entry.path === 'sample-1.0.0/README.md');
        expect(new TextDecoder().decode(readme?.bytes)).toBe('readme\n');
    });
});

describe('0014 AC-006: the reader refuses what it cannot read', () => {
    const files: TarEntrySpec[] = [{ path: 'top/' }, { path: 'top/a.txt', content: 'abc' }];

    it('reads a hand-made archive (negative control for the cases below)', async () => {
        const entries = await entriesOf(tarGz(files));
        expect(entries.map((entry) => [entry.path, entry.kind])).toEqual([
            ['top/', 'directory'],
            ['top/a.txt', 'file'],
        ]);
        expect(new TextDecoder().decode(entries[1]?.bytes)).toBe('abc');
    });

    it('bytes that are not gzip are unreadable', async () => {
        const result = await archive.read(new TextEncoder().encode('not an archive'), MAX);
        expect(result).toMatchObject({ ok: false, failure: 'unreadable' });
    });

    it('gzip around something that is not tar is unreadable', async () => {
        const result = await archive.read(new Uint8Array(gzipSync(new TextEncoder().encode('x'.repeat(2000)))), MAX);
        expect(result).toMatchObject({ ok: false, failure: 'unreadable' });
    });

    it('a header with a wrong checksum is unreadable', async () => {
        const result = await archive.read(tarGz(files, { corruptChecksumOf: 1 }), MAX);
        expect(result).toMatchObject({ ok: false, failure: 'unreadable' });
    });

    it('an archive that ends inside a file is unreadable', async () => {
        const result = await archive.read(tarGz([{ path: 'top/a.txt', content: 'x'.repeat(2000) }], { endMarker: false, truncateBy: 600 }), MAX);
        expect(result).toMatchObject({ ok: false, failure: 'unreadable' });
    });

    it('a pax path record replaces the header path, a pax record for the global header does not touch the next entry', async () => {
        const entries = await entriesOf(
            tarGz([
                { path: 'pax_global_header', type: 'g', pax: { comment: 'c' } },
                { path: 'short', pax: { path: 'top/from-pax.txt' }, content: 'p' },
                { path: 'top/plain.txt', content: 'q' },
            ]),
        );
        expect(entries.map((entry) => [entry.path, entry.kind])).toEqual([
            ['PaxHeader', 'metadata'],
            ['top/from-pax.txt', 'file'],
            ['top/plain.txt', 'file'],
        ]);
    });

    it('hard links, symbolic links and device records are other', async () => {
        const entries = await entriesOf(
            tarGz([
                { path: 'top/hard', type: '1', linkname: 'top/a' },
                { path: 'top/soft', type: '2', linkname: '/etc/passwd' },
                { path: 'top/dev', type: '3' },
                { path: 'top/fifo', type: '6' },
            ]),
        );
        expect(entries.map((entry) => entry.kind)).toEqual(['other', 'other', 'other', 'other']);
    });

    it('output over the limit is refused while it is being unpacked, whatever the archive declares', async () => {
        const entry = { path: 'top/big.bin', content: new Uint8Array(3000) };
        const bytes = tarGz([entry]);
        expect(await archive.read(bytes, 1000)).toEqual({ ok: false, failure: 'too-large' });
        expect((await archive.read(bytes, 100000)).ok).toBe(true);
    });

    it('a tar of many zero bytes is not a bomb: the limit counts unpacked bytes', async () => {
        const bomb = new Uint8Array(gzipSync(new Uint8Array(5 * 1024 * 1024)));
        expect(bomb.length).toBeLessThan(10000);
        expect(await archive.read(bomb, 1024 * 1024)).toEqual({ ok: false, failure: 'too-large' });
    });

    it('an empty tar (only the end marker) has no entries', async () => {
        expect(await entriesOf(new Uint8Array(gzipSync(tarBytes([]))))).toEqual([]);
    });
});
