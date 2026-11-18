import { describe, expect, it } from 'vitest';
import type { Diagnostic } from './diagnostics';
import { readProjectFiles } from './files';
import type { ProjectFile } from './files';
import { readProject } from './readProject';
import { createMemorySpecSource } from './testing/memorySpecSource';
import type { MemorySpecSource } from './testing/memorySpecSource';

const ROOT = 'memory://project';
const KNOWN = '1.10.0';

function specText(options: { status?: string; plan?: string; extra?: string; body?: string } = {}): string {
    const status = options.status ?? 'Draft';
    const plan = options.plan ?? '_none yet_';
    return `# Spec\n\n**Status:** ${status}\n**Plan:** ${plan}\n${options.extra ?? ''}\n## 9. Acceptance criteria\n\n${options.body ?? '- **AC-001** The system shall work.'}\n`;
}

function planText(options: { spec?: string; status?: string; body?: string } = {}): string {
    return `# Plan\n\n**Spec:** ${options.spec ?? '[s](0001-a.md)'}\n**Status:** ${options.status ?? 'Not started'}\n\n${options.body ?? ''}`;
}

async function read(files: Record<string, string>, setup?: (source: MemorySpecSource) => void, version = KNOWN): Promise<Diagnostic[]> {
    const source = createMemorySpecSource();
    for (const [file, text] of Object.entries(files)) {
        source.setFile(ROOT, file, text);
    }
    setup?.(source);
    return (await readProject(source, ROOT, version)).diagnostics;
}

function summary(diagnostics: Diagnostic[]): { problems: number; notes: number } {
    return {
        problems: diagnostics.filter((diagnostic) => diagnostic.tier === 'problem').length,
        notes: diagnostics.filter((diagnostic) => diagnostic.tier === 'note').length,
    };
}

describe('diagnostic tiers (0016 AC-001, one test per row of §6.1)', () => {
    it('AC-001 row: a clean project has no diagnostic at all (control)', async () => {
        expect(await read({ '.specs/backlog/0001-a.md': specText() })).toEqual([]);
    });

    it('AC-001 row "file or folder that cannot be read, listed or parsed": Problem', async () => {
        const diagnostics = await read({ '.specs/backlog/0001-a.md': specText() }, (source) => {
            source.setUnreadable(ROOT, '.specs/active/0002-b.md', 'EACCES');
            source.setUnlistable(ROOT, '.specs/done', 'EIO');
        });
        expect(diagnostics.map((diagnostic) => diagnostic.kind)).toEqual(['unreadable-file', 'unreadable-file']);
        expect(summary(diagnostics)).toEqual({ problems: 2, notes: 0 });
    });

    it('AC-001 row "cannot be read, listed or parsed": a reused unreadable file stays a Problem', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/backlog/0001-a.md', specText());
        const reuse = (key: string): ProjectFile => ({
            kind: 'spec',
            reference: '0001-a',
            number: '0001',
            slug: 'a',
            folder: 'backlog',
            key,
            modifiedMs: 1,
            size: 1,
            content: { state: 'unreadable', reason: 'not valid UTF-8' },
        });
        const { diagnostics } = await readProjectFiles(source, ROOT, reuse);
        expect(diagnostics.map((diagnostic) => [diagnostic.kind, diagnostic.reason])).toEqual([['unreadable-file', 'not valid UTF-8']]);
        expect(summary(diagnostics)).toEqual({ problems: 1, notes: 0 });
    });

    it('AC-001 row "cannot be read, listed or parsed": a symbolic link in place of a lifecycle folder is a Problem', async () => {
        const diagnostics = await read({ '.specs/active/0002-b.md': specText() }, (source) => {
            source.setSymlink(ROOT, '.specs/backlog');
        });
        expect(diagnostics.map((diagnostic) => [diagnostic.kind, diagnostic.scope])).toEqual([['unreadable-file', { file: '.specs/backlog' }]]);
        expect(summary(diagnostics)).toEqual({ problems: 1, notes: 0 });
    });

    it('AC-001 row "cannot be read, listed or parsed": a folder whose stat fails is a Problem', async () => {
        const source = createMemorySpecSource();
        source.setFile(ROOT, '.specs/active/0002-b.md', specText());
        const failing = {
            ...source,
            stat: async (root: string, relativePath: string) => {
                if (relativePath === '.specs/done') {
                    throw new Error('EIO');
                }
                return source.stat(root, relativePath);
            },
        };
        source.setDirectory(ROOT, '.specs/done');
        const { diagnostics } = await readProjectFiles(failing, ROOT);
        expect(diagnostics.map((diagnostic) => [diagnostic.kind, diagnostic.scope])).toEqual([['unreadable-file', { file: '.specs/done' }]]);
        expect(summary(diagnostics)).toEqual({ problems: 1, notes: 0 });
    });

    it('AC-001 row "one stem in two folders; one number with two slugs": Problem, one per entry', async () => {
        const diagnostics = await read({
            '.specs/backlog/0001-a.md': specText(),
            '.specs/active/0001-a.md': specText(),
            '.specs/backlog/0002-x.md': specText(),
            '.specs/backlog/0002-y.md': specText(),
        });
        expect(diagnostics.every((diagnostic) => diagnostic.kind === 'duplicate')).toBe(true);
        expect(summary(diagnostics)).toEqual({ problems: 4, notes: 0 });
    });

    it('AC-001 row "Plan link to a missing file; a sibling plan Spec link to a missing file while a spec has its stem": Problem', async () => {
        const diagnostics = await read({
            '.specs/backlog/0001-a.md': specText({ plan: '[p](0001-a.plan.md)' }),
            '.specs/active/0002-b.md': specText({ plan: '[p](0002-b.plan.md)' }),
            '.specs/active/0002-b.plan.md': planText({ spec: '[s](0002-gone.md)' }),
        });
        expect(diagnostics.map((diagnostic) => diagnostic.kind)).toEqual(['dangling-link', 'dangling-link']);
        expect(summary(diagnostics)).toEqual({ problems: 2, notes: 0 });
    });

    it('AC-001 row "Status of a spec, a plan or a return note outside its vocabulary": Problem', async () => {
        const diagnostics = await read({
            '.specs/backlog/0001-a.md': specText({ status: 'Half done' }),
            '.specs/backlog/0001-a.plan.md': planText({ status: 'Maybe' }),
            '.memory-bank/activeContext.0001-T-001.md': '**Status:** FINISHED\n',
        });
        expect(diagnostics.map((diagnostic) => diagnostic.kind)).toEqual(['unknown-content', 'unknown-content', 'unknown-content']);
        expect(summary(diagnostics)).toEqual({ problems: 3, notes: 0 });
    });

    it('AC-001 row "return note whose number matches no spec": Problem', async () => {
        const diagnostics = await read({
            '.specs/backlog/0001-a.md': specText(),
            '.memory-bank/activeContext.0099-T-001.md': '**Status:** DONE\n',
        });
        expect(diagnostics.map((diagnostic) => diagnostic.kind)).toEqual(['orphan']);
        expect(summary(diagnostics)).toEqual({ problems: 1, notes: 0 });
    });

    it('AC-001 row "traceability State not open, built, verified": format note', async () => {
        const table = '## Traceability\n\n| Acceptance criterion | Steps | Code / files | Test | State |\n| --- | --- | --- | --- | --- |\n| AC-001 | T-001 | a | b | done |\n';
        const diagnostics = await read({
            '.specs/backlog/0001-a.md': specText(),
            '.specs/backlog/0001-a.plan.md': planText({ body: table }),
        });
        expect(diagnostics.map((diagnostic) => diagnostic.kind)).toEqual(['unknown-content']);
        expect(summary(diagnostics)).toEqual({ problems: 0, notes: 1 });
    });

    it('AC-001 row "plan section outside the six of the skeleton": format note', async () => {
        const diagnostics = await read({
            '.specs/backlog/0001-a.md': specText(),
            '.specs/backlog/0001-a.plan.md': planText({ body: '## Approach\n\ntext\n\n## Open evidence\n\ntext\n' }),
        });
        expect(diagnostics.map((diagnostic) => diagnostic.reason)).toEqual(['Unknown plan section "Open evidence"']);
        expect(summary(diagnostics)).toEqual({ problems: 0, notes: 1 });
    });

    it('AC-001 row "AC- or FR- ID defined twice in one spec": format note, one per definition', async () => {
        const diagnostics = await read({
            '.specs/backlog/0001-a.md': specText({ body: '- **AC-001** One.\n- **AC-001** Two.' }),
        });
        expect(diagnostics.map((diagnostic) => diagnostic.kind)).toEqual(['duplicate', 'duplicate']);
        expect(summary(diagnostics)).toEqual({ problems: 0, notes: 2 });
    });

    it('AC-001 row "step field outside Covers, Files, Do, Verify, Verified, Notes": format note', async () => {
        const steps = '## Steps\n\n### T-001 — a\n\n- **Covers:** AC-001\n- **Added:** x\n- [ ] **Verified (T-001):** —\n';
        const diagnostics = await read({
            '.specs/backlog/0001-a.md': specText(),
            '.specs/backlog/0001-a.plan.md': planText({ body: steps }),
        });
        expect(diagnostics.map((diagnostic) => diagnostic.reason)).toEqual(['Step T-001 has an unknown field "Added"']);
        expect(summary(diagnostics)).toEqual({ problems: 0, notes: 1 });
    });

    it('AC-001 row "handoff field outside the five of the skeleton": format note', async () => {
        const handoff = '## Session handoff\n\n- **Done so far:** x\n- **Evidence:** y\n';
        const diagnostics = await read({
            '.specs/backlog/0001-a.md': specText(),
            '.specs/backlog/0001-a.plan.md': planText({ body: handoff }),
        });
        expect(diagnostics.map((diagnostic) => diagnostic.reason)).toEqual(['Unknown session handoff field "Evidence"']);
        expect(summary(diagnostics)).toEqual({ problems: 0, notes: 1 });
    });

    it('AC-001 row "any other skeleton deviation": format note (extra and repeated header line, step ID twice, undecidable checkbox)', async () => {
        const steps = '## Steps\n\n### T-001 — a\n\n- **Notes:** —\n\n### T-001 — again\n\n- **Covers:** [ ] AC-001\n';
        const diagnostics = await read({
            '.specs/backlog/0001-a.md': specText({ extra: '**Owner:** me\n**Status:** Draft\n' }),
            '.specs/backlog/0001-a.plan.md': planText({ body: steps }),
        });
        expect(new Set(diagnostics.map((diagnostic) => diagnostic.kind))).toEqual(new Set(['unknown-content', 'duplicate']));
        expect(diagnostics.length).toBeGreaterThanOrEqual(4);
        expect(summary(diagnostics)).toEqual({ problems: 0, notes: diagnostics.length });
    });

    it('AC-001 row "project level: another plan whose stem matches no spec, its dangling Spec link, a version not verified or newer": format note', async () => {
        const diagnostics = await read({
            '.specs/backlog/0001-a.md': specText(),
            '.specs/plan-archive/0007-gone.2026-09-19.plan.md': planText({ spec: '[s](../done/0007-gone.md)', status: 'Done' }),
            '.specs/done/0008-lost.plan.md': planText({ spec: '[s](0008-missing.md)', status: 'Done' }),
        }, undefined, '9.0.0');
        expect(diagnostics.map((diagnostic) => diagnostic.kind).sort()).toEqual(['dangling-link', 'orphan', 'orphan', 'unverified-version']);
        expect(summary(diagnostics)).toEqual({ problems: 0, notes: 4 });
    });

    it('AC-001 row "Successor header line of a Deprecated spec": compatibility, no diagnostic', async () => {
        const diagnostics = await read({
            '.specs/done/0001-a.md': specText({ status: 'Deprecated', extra: '**Successor:** [b](../backlog/0002-b.md)\n' }),
            '.specs/backlog/0002-b.md': specText(),
        });
        expect(diagnostics).toEqual([]);
    });

    it('AC-001 row "plan in backlog/ or active/ whose stem matches no spec": compatibility, no orphan and no dangling Spec link', async () => {
        const diagnostics = await read({
            '.specs/backlog/0001-a.md': specText(),
            '.specs/active/0005-abandoned.plan.md': planText({ spec: '[s](0005-abandoned.md)' }),
            '.specs/backlog/0006-abandoned.plan.md': planText({ spec: '[s](0006-abandoned.md)' }),
        });
        expect(diagnostics).toEqual([]);
    });
});
