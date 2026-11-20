import { describe, expect, it } from 'vitest';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { fixturePath } from '../discovery/testing/fixtures';
import { parsePlan } from './parsePlan';
import { parseSpec } from './parseSpec';
import { parseReturnNote } from './returnNote';
import { readProject } from './readProject';
import type { Parsers } from './readProject';
import { createMemorySpecSource } from './testing/memorySpecSource';

const ROOT = 'memory://project';
const VERSION = '1.10.0';
const FIXTURES = [
    'fs110-de-active-review',
    'fs110-parallel-synthetic',
    'fs110-ready-synthetic',
    'fs170-brownfield-mixed',
    'fs180-de-baselines',
    'fs180-en-done-archived',
    'fs-broken',
];

function spec(plan: string): string {
    return `# Spec\n\n**Status:** In Progress\n**Plan:** ${plan}\n\n## 1. Summary\n\ntext\n`;
}

function plan(specLink: string): string {
    return `# Plan\n\n**Spec:** ${specLink}\n**Status:** In Progress\n`;
}

describe('readProject', () => {
    it.each(FIXTURES)('reads the fixture %s without throwing and parses every readable file', async (name) => {
        const project = await readProject(createNodeSpecSource(), fixturePath(name), VERSION);
        for (const entry of project.specs) {
            expect(entry.parsed !== undefined).toBe(entry.readable);
        }
        for (const entry of project.plans) {
            expect(entry.parsed !== undefined).toBe(entry.readable);
        }
    });

    it('AC-006: a sibling plan and both archived plans are linked to their spec by stem (fs110-ready-synthetic)', async () => {
        const project = await readProject(createNodeSpecSource(), fixturePath('fs110-ready-synthetic'), VERSION);
        const ready = project.specs.find((entry) => entry.reference === '0001-ready-feature');
        const old = project.specs.find((entry) => entry.reference === '0002-old-feature');
        expect(ready?.planKeys).toEqual(['.specs/backlog/0001-ready-feature.plan.md']);
        expect(old?.planKeys).toEqual([
            '.specs/plan-archive/0002-old-feature.2026-11-01-2.plan.md',
            '.specs/plan-archive/0002-old-feature.2026-11-01.plan.md',
        ]);
        for (const entry of project.plans) {
            expect(entry.specReferences).toHaveLength(1);
        }
        expect(project.plans.find((entry) => entry.key.endsWith('2026-11-01-2.plan.md'))).toMatchObject({
            variant: 'archived',
            date: '2026-11-01',
            suffix: 2,
            folder: undefined,
        });
        expect(project.diagnostics.filter((diagnostic) => diagnostic.kind === 'orphan')).toEqual([]);
    });

    it('AC-006 (0016 §5): a sibling plan in active/ whose stem matches no spec stays in the model with no diagnostic; an archived one is a note', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/active/0001-real.md', spec('_none yet_'));
        source.setFile(ROOT, '.specs/active/0005-lost.plan.md', plan('[x](0005-lost.md)'));
        source.setFile(ROOT, '.specs/plan-archive/0006-gone.2026-09-19.plan.md', plan('[x](../done/0006-gone.md)'));
        const project = await readProject(source, ROOT, VERSION);
        expect(project.plans.map((entry) => [entry.reference, entry.specKeys])).toEqual([
            ['0005-lost', []],
            ['0006-gone', []],
        ]);
        expect(project.diagnostics.filter((diagnostic) => diagnostic.kind === 'orphan')).toEqual([
            { kind: 'orphan', tier: 'note', scope: { file: '.specs/plan-archive/0006-gone.2026-09-19.plan.md' }, reason: 'plan matches no spec (0006-gone)' },
        ]);
        expect(project.diagnostics.filter((diagnostic) => diagnostic.kind === 'dangling-link')).toEqual([]);
    });

    it('AC-006: a plan in a folder other than its spec is linked by stem without a diagnostic', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/done/0001-moved.md', spec('_none_'));
        source.setFile(ROOT, '.specs/active/0001-moved.plan.md', plan('[x](../done/0001-moved.md)'));
        const project = await readProject(source, ROOT, VERSION);
        expect(project.specs[0]?.planKeys).toEqual(['.specs/active/0001-moved.plan.md']);
        expect(project.diagnostics).toEqual([]);
    });

    it('AC-010: return notes are linked by number; DONE and BLOCKED are read (fs110-parallel-synthetic)', async () => {
        const project = await readProject(createNodeSpecSource(), fixturePath('fs110-parallel-synthetic'), VERSION);
        expect(project.returnNotes.map((note) => [note.stepId, note.parsed?.status.value, note.specReferences])).toEqual([
            ['T-003', { state: 'value', raw: 'DONE' }, ['0001-parallel-demo']],
            ['T-004', { state: 'value', raw: 'BLOCKED' }, ['0001-parallel-demo']],
        ]);
        expect(project.specs[0]?.returnNoteKeys).toHaveLength(2);
        expect(project.diagnostics).toEqual([]);
    });

    it('AC-010: a note whose number matches no spec is returned unlinked with a diagnostic', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec('_none yet_'));
        source.setFile(ROOT, '.memory-bank/activeContext.0099-T-001.md', '- **Status:** DONE');
        const project = await readProject(source, ROOT, VERSION);
        expect(project.returnNotes).toHaveLength(1);
        expect(project.returnNotes[0]?.specKeys).toEqual([]);
        expect(project.diagnostics).toEqual([
            { kind: 'orphan', tier: 'problem', scope: { file: '.memory-bank/activeContext.0099-T-001.md' }, reason: 'return note matches no spec (number 0099)' },
        ]);
    });

    it('AC-014: an unknown return-note status gives a diagnostic and keeps the value', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec('_none yet_'));
        source.setFile(ROOT, '.memory-bank/activeContext.0001-T-001.md', '- **Status:** PAUSED');
        const project = await readProject(source, ROOT, VERSION);
        expect(project.returnNotes[0]?.parsed?.status.value).toEqual({ state: 'value', raw: 'PAUSED' });
        expect(project.diagnostics.map((diagnostic) => diagnostic.kind)).toEqual(['unknown-content']);
    });

    it('AC-015: the same stem in two folders: two entries, each with a duplicate diagnostic naming the other, plans linked to both', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/backlog/0003-twin.md', spec('_none yet_'));
        source.setFile(ROOT, '.specs/active/0003-twin.md', spec('[p](0003-twin.plan.md)'));
        source.setFile(ROOT, '.specs/active/0003-twin.plan.md', plan('[s](0003-twin.md)'));
        source.setFile(ROOT, '.memory-bank/activeContext.0003-T-001.md', '- **Status:** DONE');
        const project = await readProject(source, ROOT, VERSION);
        expect(project.specs.map((entry) => entry.key)).toEqual(['.specs/active/0003-twin.md', '.specs/backlog/0003-twin.md']);
        for (const entry of project.specs) {
            expect(entry.planKeys).toEqual(['.specs/active/0003-twin.plan.md']);
            expect(entry.returnNoteKeys).toEqual(['.memory-bank/activeContext.0003-T-001.md']);
        }
        expect(project.diagnostics.filter((diagnostic) => diagnostic.kind === 'duplicate')).toEqual([
            {
                kind: 'duplicate',
                tier: 'problem',
                scope: { file: '.specs/active/0003-twin.md' },
                reason: 'reference 0003-twin also exists in .specs/backlog/0003-twin.md',
            },
            {
                kind: 'duplicate',
                tier: 'problem',
                scope: { file: '.specs/backlog/0003-twin.md' },
                reason: 'reference 0003-twin also exists in .specs/active/0003-twin.md',
            },
        ]);
    });

    it('AC-015: one number with two slugs: both entries kept with a duplicate diagnostic, notes linked to both', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/backlog/0004-first.md', spec('_none yet_'));
        source.setFile(ROOT, '.specs/backlog/0004-second.md', spec('_none yet_'));
        source.setFile(ROOT, '.memory-bank/activeContext.0004-T-002.md', '- **Status:** BLOCKED');
        const project = await readProject(source, ROOT, VERSION);
        expect(project.specs).toHaveLength(2);
        expect(project.returnNotes[0]?.specReferences).toEqual(['0004-first', '0004-second']);
        expect(project.diagnostics.filter((diagnostic) => diagnostic.kind === 'duplicate')).toEqual([
            { kind: 'duplicate', tier: 'problem', scope: { file: '.specs/backlog/0004-first.md' }, reason: 'number 0004 also used by .specs/backlog/0004-second.md' },
            { kind: 'duplicate', tier: 'problem', scope: { file: '.specs/backlog/0004-second.md' }, reason: 'number 0004 also used by .specs/backlog/0004-first.md' },
        ]);
    });

    it('AC-015: an AC defined twice in one spec reaches the project diagnostics with both occurrences kept', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/active/0001-a.md', `${spec('_none yet_')}\n- **AC-001** first\n- **AC-001** again\n`);
        const project = await readProject(source, ROOT, VERSION);
        expect(project.specs[0]?.parsed?.criteria.map((criterion) => criterion.id)).toEqual(['AC-001', 'AC-001']);
        expect(project.diagnostics.filter((diagnostic) => diagnostic.kind === 'duplicate').length).toBeGreaterThan(0);
    });

    it('AC-016: the project diagnostic comes from the reported version and the model does not depend on it', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec('_none yet_'));
        const unknown = await readProject(source, ROOT, 'unknown');
        const newer = await readProject(source, ROOT, '1.11.1');
        const known = await readProject(source, ROOT, '1.8.0-rc3');
        expect(unknown.diagnostics).toEqual([{ kind: 'unverified-version', tier: 'note', scope: 'project', reason: 'version not verified' }]);
        expect(newer.diagnostics).toEqual([{ kind: 'unverified-version', tier: 'note', scope: 'project', reason: 'newer than known' }]);
        expect(known.diagnostics).toEqual([]);
        expect(unknown.specs).toEqual(known.specs);
        expect(newer.version).toBe('1.11.1');
    });

    it('AC-017: a Plan link and a sibling plan Spec link to missing files are dangling; the archived plan Spec link is exempt', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec('[p](0001-a.plan.md)'));
        source.setFile(ROOT, '.specs/active/0002-b.md', spec('[p](../plan-archive/0002-b.2026-09-19.plan.md)'));
        source.setFile(ROOT, '.specs/active/0002-b.plan.md', plan('[s](0002-missing.md)'));
        source.setFile(ROOT, '.specs/plan-archive/0003-c.2026-09-19.plan.md', plan('[s](../done/0003-c.md)'));
        const project = await readProject(source, ROOT, VERSION);
        const dangling = project.diagnostics.filter((diagnostic) => diagnostic.kind === 'dangling-link');
        expect(dangling).toEqual([
            { kind: 'dangling-link', tier: 'problem', scope: { file: '.specs/active/0001-a.md', line: 4 }, reason: 'plan link 0001-a.plan.md points to a missing file' },
            { kind: 'dangling-link', tier: 'problem', scope: { file: '.specs/active/0002-b.md', line: 4 }, reason: 'plan link ../plan-archive/0002-b.2026-09-19.plan.md points to a missing file' },
            { kind: 'dangling-link', tier: 'problem', scope: { file: '.specs/active/0002-b.plan.md', line: 3 }, reason: 'spec link 0002-missing.md points to a missing file' },
        ]);
        expect(project.specs).toHaveLength(2);
    });

    it('AC-017: a link that resolves to an existing file is not dangling (fs110-parallel-synthetic)', async () => {
        const project = await readProject(createNodeSpecSource(), fixturePath('fs110-parallel-synthetic'), VERSION);
        expect(project.diagnostics.filter((diagnostic) => diagnostic.kind === 'dangling-link')).toEqual([]);
    });

    it('AC-021: a link that leaves the project root is dangling and its target is never stat-ed or read', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec('[p](../../../outside/0001-a.plan.md)'));
        source.setFile(ROOT, '.specs/active/0001-a.plan.md', plan('[s](/etc/secret.md)'));
        const project = await readProject(source, ROOT, VERSION);
        expect(project.diagnostics.filter((diagnostic) => diagnostic.kind === 'dangling-link')).toHaveLength(2);
        expect(source.touched().filter((touched) => touched.includes('outside') || touched.includes('secret') || touched.startsWith('..'))).toEqual([]);
    });

    it('AC-011: an internal parse error in one file becomes an unreadable-file diagnostic and the others are still returned', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/active/0001-bad.md', spec('_none yet_'));
        source.setFile(ROOT, '.specs/active/0002-good.md', spec('_none yet_'));
        const parsers: Parsers = {
            parseSpec: (text, key) => {
                if (key.includes('0001-bad')) {
                    throw new Error('boom');
                }
                return parseSpec(text, key);
            },
            parsePlan,
            parseReturnNote,
        };
        const project = await readProject(source, ROOT, VERSION, parsers);
        expect(project.specs.map((entry) => [entry.reference, entry.parsed !== undefined])).toEqual([
            ['0001-bad', false],
            ['0002-good', true],
        ]);
        expect(project.diagnostics).toEqual([
            { kind: 'unreadable-file', tier: 'problem', scope: { file: '.specs/active/0001-bad.md' }, reason: 'parsing failed: boom' },
        ]);
    });

    it('AC-011: fs-broken gives exactly one unreadable-file diagnostic and the readable specs are parsed', async () => {
        const project = await readProject(createNodeSpecSource(), fixturePath('fs-broken'), VERSION);
        expect(project.specs).toHaveLength(3);
        expect(project.specs.filter((entry) => entry.parsed !== undefined)).toHaveLength(2);
        expect(project.diagnostics).toEqual([
            { kind: 'unreadable-file', tier: 'problem', scope: { file: '.specs/active/0002-invalid-utf8.md' }, reason: 'not valid UTF-8' },
        ]);
    });

    it('AC-023: modification times of specs, plans and notes pass through to the entries', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/active/0001-a.md', spec('_none yet_'), 111);
        source.setFile(ROOT, '.specs/active/0001-a.plan.md', plan('[s](0001-a.md)'), 222);
        source.setFile(ROOT, '.memory-bank/activeContext.0001-T-001.md', '- **Status:** DONE', 333);
        const project = await readProject(source, ROOT, VERSION);
        expect([project.specs[0]?.modifiedMs, project.plans[0]?.modifiedMs, project.returnNotes[0]?.modifiedMs]).toEqual([111, 222, 333]);
    });
});
