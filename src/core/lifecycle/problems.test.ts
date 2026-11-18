import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import { readProject } from '../specs/readProject';
import { deriveLifecycle } from './deriveLifecycle';
import type { LifecycleEntry } from './model';
import { planText, readFixture, readMemory, specText, VERSION } from './testing/projects';

const SPEC_LINK = '[s](0001-a.md)';
const LINKED = '[0001-a.plan.md](0001-a.plan.md)';

function only(model: ReturnType<typeof deriveLifecycle>, stem = '0001-a'): LifecycleEntry {
    const entry = model.entries.find((candidate) => candidate.stem === stem);
    if (entry === undefined) {
        throw new Error('entry missing');
    }
    return entry;
}

const DOUBLE_ID = `${specText({ plan: LINKED }).trimEnd()}\n\n**AC-001** The system shall work, said twice.\n`;

describe('Problems decide R-6 (0016 AC-001 contradiction row, AC-010)', () => {
    it('AC-001 row "lifecycle contradiction": it carries the tier Problem and fails R-6', async () => {
        const entry = only(deriveLifecycle(await readMemory({ '.specs/backlog/0001-a.md': specText({ status: 'In Progress' }) })));
        const contradiction = entry.diagnostics.find((diagnostic) => diagnostic.kind === 'lifecycle-contradiction');
        expect(contradiction?.tier).toBe('problem');
        expect(entry.readiness.checks.find((check) => check.id === 'R-6')?.result).toBe('fail');
    });

    it('AC-010: a Draft in backlog/ with AC-001 defined twice and a Not started plan is Ready with two format notes', async () => {
        const entry = only(
            deriveLifecycle(await readMemory({ '.specs/backlog/0001-a.md': DOUBLE_ID, '.specs/backlog/0001-a.plan.md': planText({ spec: SPEC_LINK }) })),
        );
        expect(entry.diagnostics.map((diagnostic) => [diagnostic.kind, diagnostic.tier])).toEqual([
            ['duplicate', 'note'],
            ['duplicate', 'note'],
        ]);
        expect(entry.readiness.failing).toEqual([]);
        expect(entry.state).toBe('Ready');
    });

    it('AC-010 control: a Problem on the spec (a stem in two folders) fails R-6', async () => {
        const model = deriveLifecycle(
            await readMemory({
                '.specs/backlog/0001-a.md': specText({ plan: LINKED }),
                '.specs/active/0001-a.md': specText({ plan: LINKED, status: 'In Progress' }),
                '.specs/backlog/0001-a.plan.md': planText({ spec: SPEC_LINK }),
            }),
        );
        expect(model.entries.find((entry) => entry.key === '.specs/backlog/0001-a.md')?.readiness.failing).toContain('R-6');
    });

    it('AC-010 control: a Problem on an archived plan fails R-6', async () => {
        const entry = only(
            deriveLifecycle(
                await readMemory({
                    '.specs/backlog/0001-a.md': specText({ plan: LINKED }),
                    '.specs/backlog/0001-a.plan.md': planText({ spec: SPEC_LINK }),
                    '.specs/plan-archive/0001-a.2026-09-19.plan.md': planText({ status: 'Finished' }),
                }),
            ),
        );
        expect(entry.diagnostics.filter((diagnostic) => diagnostic.tier === 'problem')).toHaveLength(1);
        expect(entry.readiness.failing).toEqual(['R-6']);
    });

    it('AC-010 control: a Problem on a return note fails R-6', async () => {
        const entry = only(
            deriveLifecycle(
                await readMemory({
                    '.specs/backlog/0001-a.md': specText({ plan: LINKED }),
                    '.specs/backlog/0001-a.plan.md': planText({ spec: SPEC_LINK }),
                    '.memory-bank/activeContext.0001-T-001.md': '**Status:** FINISHED\n',
                }),
            ),
        );
        expect(entry.readiness.failing).toEqual(['R-6']);
    });

    it('AC-010 control: a format note on an archived plan and a note on a return note leave R-6 passing', async () => {
        const entry = only(
            deriveLifecycle(
                await readMemory({
                    '.specs/backlog/0001-a.md': specText({ plan: LINKED }),
                    '.specs/backlog/0001-a.plan.md': planText({ spec: SPEC_LINK }),
                    '.specs/plan-archive/0001-a.2026-09-19.plan.md': `${planText({ status: 'Done' })}## Open evidence\n\ntext\n`,
                }),
            ),
        );
        expect(entry.diagnostics.map((diagnostic) => diagnostic.tier)).toEqual(['note']);
        expect(entry.readiness.failing).toEqual([]);
    });
});

describe('this repository at commit 8052f9a (0016 AC-004)', () => {
    const NOTES_PER_SPEC: Record<string, number> = {
        '0001': 7,
        '0002': 3,
        '0003': 2,
        '0004': 4,
        '0005': 2,
        '0006': 8,
        '0007': 2,
        '0008': 1,
        '0009': 1,
        '0010': 28,
        '0011': 3,
        '0012': 1,
        '0013': 1,
        '0014': 5,
        '0015': 10,
    };

    it('AC-004: 0 Problems, 78 format notes with the count per spec, and nothing for the five Successor lines', async () => {
        const project = await readFixture('repo-8052f9a');
        expect(project.specs).toHaveLength(15);
        expect(project.diagnostics.filter((diagnostic) => diagnostic.tier === 'problem')).toEqual([]);
        expect(project.diagnostics.filter((diagnostic) => diagnostic.tier === 'note')).toHaveLength(78);
        expect(project.diagnostics.filter((diagnostic) => diagnostic.reason.includes('Successor'))).toEqual([]);
        const model = deriveLifecycle(project);
        const perSpec = Object.fromEntries(model.entries.map((entry) => [entry.number, entry.diagnostics.filter((diagnostic) => diagnostic.tier === 'note').length]));
        expect(perSpec).toEqual(NOTES_PER_SPEC);
        expect(model.entries.flatMap((entry) => entry.diagnostics).filter((diagnostic) => diagnostic.tier === 'problem')).toEqual([]);
        expect(model.projectDiagnostics).toEqual([]);
    });

    it('AC-004 control: the five Deprecated specs read their successor from the header line', async () => {
        const model = deriveLifecycle(await readFixture('repo-8052f9a'));
        const deprecated = model.entries.filter((entry) => entry.deprecated !== undefined);
        expect(deprecated.map((entry) => entry.number)).toEqual(['0008', '0009', '0010', '0011', '0012']);
        expect(deprecated.every((entry) => entry.deprecated?.successor.kind === 'link')).toBe(true);
    });
});

describe("this repository's own .specs/ (0016 AC-005)", () => {
    async function problemsOf(root: string): Promise<string[]> {
        const project = await readProject(createNodeSpecSource(), root, VERSION);
        const model = deriveLifecycle(project);
        return [...project.diagnostics, ...model.entries.flatMap((entry) => entry.diagnostics)]
            .filter((diagnostic) => diagnostic.tier === 'problem')
            .map((diagnostic) => `${diagnostic.scope === 'project' ? 'project' : diagnostic.scope.file}: ${diagnostic.reason}`);
    }

    it('AC-005: the specs and plans of this repository carry no Problem', async () => {
        expect(await problemsOf(process.cwd())).toEqual([]);
    });

    it('AC-005 control: a copy with a broken Plan link has one', async () => {
        const { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = await import('node:fs');
        const { tmpdir } = await import('node:os');
        const copy = mkdtempSync(path.join(tmpdir(), 'ac005-'));
        try {
            cpSync(path.join(process.cwd(), '.specs'), path.join(copy, '.specs'), { recursive: true });
            const target = path.join(copy, '.specs', 'active', '0015-focus-on-visibility.md');
            const text = readFileSync(target, 'utf8');
            expect(text).toContain('0015-focus-on-visibility.plan.md');
            writeFileSync(target, text.replace('(0015-focus-on-visibility.plan.md)', '(0015-gone.plan.md)'));
            const problems = await problemsOf(copy);
            expect(problems.length).toBeGreaterThan(0);
            expect(problems.join('\n')).toContain('0015-gone.plan.md');
        } finally {
            rmSync(copy, { recursive: true, force: true });
        }
    });
});

