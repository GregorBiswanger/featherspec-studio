import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { fixturePath } from '../discovery/testing/fixtures';
import { readProjectFiles } from './files';
import type { ProjectFile } from './files';
import { createMemorySpecSource } from './testing/memorySpecSource';

const ROOT = 'memory://project';

function specKeys(files: readonly ProjectFile[]): string[] {
    return files.filter((file) => file.kind === 'spec').map((file) => file.key).sort();
}

function textOf(file: ProjectFile | undefined): string | undefined {
    return file?.content.state === 'text' ? file.content.text : undefined;
}

describe('readProjectFiles', () => {
    it('AC-001: returns exactly the nine spec files of fs170-brownfield-mixed', async () => {
        const result = await readProjectFiles(createNodeSpecSource(), fixturePath('fs170-brownfield-mixed'));
        expect(specKeys(result.files)).toEqual([
            '.specs/active/0006-outbox-batch-size.md',
            '.specs/backlog/0003-direct-broker-publication.md',
            '.specs/backlog/0004-replace-authorization-service.md',
            '.specs/backlog/0005-rename-order-status-enum.md',
            '.specs/backlog/0007-auth-request-logging.md',
            '.specs/backlog/0008-order-immutability-window.md',
            '.specs/backlog/0009-billing-rounding.md',
            '.specs/done/0001-baseline-orders.md',
            '.specs/done/0002-payment-retry.md',
        ]);
        expect(result.diagnostics).toEqual([]);
    });

    it('AC-001: the README, plans, archive files, notes and other files are no spec entries', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/README.md', '# readme');
        source.setFile(ROOT, '.specs/active/.gitkeep', '');
        source.setFile(ROOT, '.specs/active/0001-one.md', '# one');
        source.setFile(ROOT, '.specs/active/0001-one.plan.md', '# plan');
        source.setFile(ROOT, '.specs/active/notes.md', '# notes');
        source.setFile(ROOT, '.specs/active/12-short.md', '# short number');
        source.setFile(ROOT, '.specs/active/0002-two.txt', 'text');
        source.setDirectory(ROOT, '.specs/active/0003-folder.md');
        source.setFile(ROOT, '.specs/plan-archive/0009-old.2026-09-19.plan.md', '# old');
        source.setFile(ROOT, '.specs/plan-archive/0009-old.md', '# misplaced spec');
        source.setFile(ROOT, '.specs/sub/0004-elsewhere.md', '# elsewhere');
        source.setFile(ROOT, '.memory-bank/activeContext.md', '# context');
        const result = await readProjectFiles(source, ROOT);
        expect(specKeys(result.files)).toEqual(['.specs/active/0001-one.md']);
        expect(result.diagnostics).toEqual([]);
    });

    it('classifies sibling plans, archived plans with date and suffix, and return notes', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/active/0007-user-login.md', '# spec');
        source.setFile(ROOT, '.specs/active/0007-user-login.plan.md', '# plan');
        source.setFile(ROOT, '.specs/plan-archive/0007-user-login.2026-09-19.plan.md', '# first');
        source.setFile(ROOT, '.specs/plan-archive/0007-user-login.2026-10-01-2.plan.md', '# second');
        source.setFile(ROOT, '.memory-bank/activeContext.0007-T-003.md', '# note');
        source.setFile(ROOT, '.memory-bank/activeContext.md', '# not a note');
        const { files } = await readProjectFiles(source, ROOT);
        const byKey = new Map(files.map((file) => [file.key, file]));
        expect(byKey.get('.specs/active/0007-user-login.plan.md')).toMatchObject({
            kind: 'plan',
            reference: '0007-user-login',
            number: '0007',
            slug: 'user-login',
            folder: 'active',
        });
        expect(byKey.get('.specs/plan-archive/0007-user-login.2026-09-19.plan.md')).toMatchObject({
            kind: 'archived-plan',
            reference: '0007-user-login',
            date: '2026-09-19',
            suffix: undefined,
        });
        expect(byKey.get('.specs/plan-archive/0007-user-login.2026-10-01-2.plan.md')).toMatchObject({
            kind: 'archived-plan',
            reference: '0007-user-login',
            date: '2026-10-01',
            suffix: 2,
        });
        expect(byKey.get('.memory-bank/activeContext.0007-T-003.md')).toMatchObject({
            kind: 'return-note',
            number: '0007',
            stepId: 'T-003',
        });
        expect(files).toHaveLength(5);
    });

    it('AC-002: the reference stays and the key follows when a spec moves to another folder', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/backlog/0005-board.md', '# board');
        const before = (await readProjectFiles(source, ROOT)).files[0];
        const again = (await readProjectFiles(source, ROOT)).files[0];
        source.move(ROOT, '.specs/backlog/0005-board.md', '.specs/active/0005-board.md');
        const after = (await readProjectFiles(source, ROOT)).files[0];
        expect(before).toMatchObject({ key: '.specs/backlog/0005-board.md', reference: '0005-board' });
        expect(again).toMatchObject({ reference: '0005-board' });
        expect(after).toMatchObject({ key: '.specs/active/0005-board.md', reference: '0005-board', folder: 'active' });
    });

    it('AC-011: one file that is not valid UTF-8 yields one unreadable-file diagnostic and every other file is returned (fs-broken)', async () => {
        const result = await readProjectFiles(createNodeSpecSource(), fixturePath('fs-broken'));
        expect(specKeys(result.files)).toEqual([
            '.specs/active/0002-invalid-utf8.md',
            '.specs/backlog/0001-valid-spec.md',
            '.specs/done/0003-also-valid.md',
        ]);
        const broken = result.files.find((file) => file.key === '.specs/active/0002-invalid-utf8.md');
        expect(broken?.content).toEqual({ state: 'unreadable', reason: 'not valid UTF-8' });
        expect(textOf(result.files.find((file) => file.key === '.specs/backlog/0001-valid-spec.md'))).toContain('# Valid spec');
        expect(result.diagnostics).toEqual([
            { kind: 'unreadable-file', tier: 'problem', scope: { file: '.specs/active/0002-invalid-utf8.md' }, reason: 'not valid UTF-8' },
        ]);
    });

    it('AC-011: an I/O error on one file names that file and reads the others', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/active/0001-fine.md', '# fine');
        source.setUnreadable(ROOT, '.specs/active/0002-denied.md', 'EACCES: permission denied');
        source.setFile(ROOT, '.memory-bank/activeContext.0001-T-001.md', '# note');
        const result = await readProjectFiles(source, ROOT);
        expect(result.files).toHaveLength(3);
        expect(result.diagnostics).toEqual([
            {
                kind: 'unreadable-file',
                tier: 'problem',
                scope: { file: '.specs/active/0002-denied.md' },
                reason: 'could not be read: EACCES: permission denied',
            },
        ]);
    });

    it('AC-011: a folder that cannot be listed becomes a diagnostic and the other folders are read', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/active/0001-fine.md', '# fine');
        source.setUnlistable(ROOT, '.specs/backlog', 'EIO: i/o error');
        const result = await readProjectFiles(source, ROOT);
        expect(specKeys(result.files)).toEqual(['.specs/active/0001-fine.md']);
        expect(result.diagnostics).toEqual([
            { kind: 'unreadable-file', tier: 'problem', scope: { file: '.specs/backlog' }, reason: 'could not be listed: EIO: i/o error' },
        ]);
    });

    it('AC-020: LF, CRLF, lone CR and a byte-order mark give the same text', async () => {
        const source = createMemorySpecSource();
        const lf = '# Title\n\n**Status:** Draft\n';
        source.setFile(ROOT, '.specs/backlog/0001-lf.md', lf);
        source.setFile(ROOT, '.specs/backlog/0002-crlf.md', lf.replace(/\n/g, '\r\n'));
        source.setFile(ROOT, '.specs/backlog/0003-cr.md', lf.replace(/\n/g, '\r'));
        source.setFile(ROOT, '.specs/backlog/0004-bom.md', `﻿${lf}`);
        source.setFile(ROOT, '.specs/backlog/0005-bom-crlf.md', `﻿${lf.replace(/\n/g, '\r\n')}`);
        const { files } = await readProjectFiles(source, ROOT);
        expect(files).toHaveLength(5);
        for (const file of files) {
            expect(textOf(file)).toBe(lf);
        }
    });

    it('AC-020: a byte-order mark and CRLF in a real file leave no trace in the text', async () => {
        const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'featherspec-files-'));
        try {
            await fs.mkdir(path.join(directory, '.specs', 'active'), { recursive: true });
            await fs.writeFile(path.join(directory, '.specs', 'active', '0001-win.md'), Buffer.from('﻿# T\r\n\r\nx\r\n', 'utf8'));
            const { files } = await readProjectFiles(createNodeSpecSource(), directory);
            expect(textOf(files[0])).toBe('# T\n\nx\n');
        } finally {
            await fs.rm(directory, { recursive: true, force: true });
        }
    });

    it('AC-023: the modification time is the number the port reported, unchanged', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/active/0001-a.md', '# a', 1_700_000_123_456.789);
        source.setFile(ROOT, '.specs/active/0001-a.plan.md', '# plan', 42);
        source.setFile(ROOT, '.memory-bank/activeContext.0001-T-001.md', '# note', 7);
        const { files } = await readProjectFiles(source, ROOT);
        expect(files.map((file) => [file.key, file.modifiedMs])).toEqual(
            expect.arrayContaining([
                ['.specs/active/0001-a.md', 1_700_000_123_456.789],
                ['.specs/active/0001-a.plan.md', 42],
                ['.memory-bank/activeContext.0001-T-001.md', 7],
            ]),
        );
    });

    it('AC-023: an unreadable file keeps the time the port reported, and a failing stat leaves it absent', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/active/0001-a.md', '# a', 5_000);
        source.setFile(ROOT, '.specs/active/0002-b.md', Uint8Array.from([0xff, 0xfe, 0xfd]), 6_000);
        source.setFile(ROOT, '.specs/active/0003-c.md', '# c', 7_000);
        source.setStatFails(ROOT, '.specs/active/0003-c.md', 'EBUSY: stat failed');
        source.setFile(ROOT, '.specs/active/0004-d.md', '# d', null);
        const { files } = await readProjectFiles(source, ROOT);
        const byKey = new Map(files.map((file) => [file.key, file]));
        expect(byKey.get('.specs/active/0002-b.md')).toMatchObject({ modifiedMs: 6_000, content: { state: 'unreadable' } });
        expect(byKey.get('.specs/active/0003-c.md')).toMatchObject({ modifiedMs: undefined, content: { state: 'text', text: '# c' } });
        expect(byKey.get('.specs/active/0004-d.md')?.modifiedMs).toBeUndefined();
        expect(byKey.get('.specs/active/0001-a.md')?.modifiedMs).toBe(5_000);
    });

    it('A-006 / AC-021: a symbolic link is reported as unreadable and never read (memory)', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/active/0001-real.md', '# real');
        source.setSymlink(ROOT, '.specs/active/0002-link.md');
        const result = await readProjectFiles(source, ROOT);
        const link = result.files.find((file) => file.key === '.specs/active/0002-link.md');
        expect(link?.content).toEqual({ state: 'unreadable', reason: 'symbolic link not followed' });
        expect(link?.modifiedMs).toBeDefined();
        expect(source.reads()).toEqual(['.specs/active/0001-real.md']);
        expect(result.diagnostics).toEqual([
            { kind: 'unreadable-file', tier: 'problem', scope: { file: '.specs/active/0002-link.md' }, reason: 'symbolic link not followed' },
        ]);
    });

    it('A-006 / AC-021: a symbolic link to a file and to a folder outside the root are not followed (real file system)', async (context) => {
        const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'featherspec-links-'));
        try {
            const root = path.join(directory, 'project');
            const outside = path.join(directory, 'outside');
            await fs.mkdir(path.join(root, '.specs', 'active'), { recursive: true });
            await fs.mkdir(outside, { recursive: true });
            await fs.writeFile(path.join(outside, '0009-outside.md'), '# outside');
            await fs.writeFile(path.join(root, '.specs', 'active', '0001-real.md'), '# real');
            try {
                await fs.symlink(path.join(outside, '0009-outside.md'), path.join(root, '.specs', 'active', '0002-link.md'));
                await fs.symlink(outside, path.join(root, '.specs', 'backlog'), 'dir');
            } catch {
                context.skip();
                return;
            }
            const result = await readProjectFiles(createNodeSpecSource(), root);
            expect(specKeys(result.files)).toEqual(['.specs/active/0001-real.md', '.specs/active/0002-link.md']);
            expect(result.files.find((file) => file.key === '.specs/active/0002-link.md')?.content).toEqual({
                state: 'unreadable',
                reason: 'symbolic link not followed',
            });
            expect(result.files.some((file) => file.key.includes('0009-outside'))).toBe(false);
            expect(result.diagnostics.map((diagnostic) => diagnostic.scope)).toEqual(
                expect.arrayContaining([{ file: '.specs/active/0002-link.md' }, { file: '.specs/backlog' }]),
            );
        } finally {
            await fs.rm(directory, { recursive: true, force: true });
        }
    });

    it('a project without .specs and .memory-bank yields no files and no diagnostics', async () => {
        const result = await readProjectFiles(createMemorySpecSource(), ROOT);
        expect(result).toEqual({ files: [], diagnostics: [] });
    });

    it('returns files in key order', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/done/0002-b.md', '# b');
        source.setFile(ROOT, '.specs/active/0003-c.md', '# c');
        source.setFile(ROOT, '.specs/backlog/0001-a.md', '# a');
        const { files } = await readProjectFiles(source, ROOT);
        expect(files.map((file) => file.key)).toEqual([...files.map((file) => file.key)].sort());
    });
});
