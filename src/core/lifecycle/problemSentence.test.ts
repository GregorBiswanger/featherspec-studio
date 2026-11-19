import { describe, expect, it } from 'vitest';
import { fixturePath } from '../discovery/testing/fixtures';
import { createNodeSpecSource } from '../../adapters/node/nodeSpecSource';
import type { Diagnostic } from '../specs/diagnostics';
import { readProject } from '../specs/readProject';
import { createMemorySpecSource, type MemorySpecSource } from '../specs/testing/memorySpecSource';
import { BASELINE_FIXTURES } from '../specs/testing/readSnapshot';
import { deriveLifecycle } from './deriveLifecycle';
import type { LifecycleDiagnostic } from './model';
import { knownProblemSentence, problemSentence } from './problemSentence';
import { noteText, planText, ROOT, specText, VERSION } from './testing/projects';

async function problemsOfMemory(setup: (source: MemorySpecSource) => void): Promise<LifecycleDiagnostic[]> {
    const source = createMemorySpecSource();
    setup(source);
    return problemsOf(await readProject(source, ROOT, VERSION));
}

function problemsOf(project: Awaited<ReturnType<typeof readProject>>): LifecycleDiagnostic[] {
    const lifecycle = deriveLifecycle(project);
    const own = lifecycle.entries.flatMap((entry) => entry.diagnostics);
    const loose = project.diagnostics.filter((diagnostic) => !own.includes(diagnostic));
    return [...own, ...loose].filter((diagnostic) => diagnostic.tier === 'problem');
}

function sentences(diagnostics: LifecycleDiagnostic[]): string[] {
    return diagnostics.map((diagnostic) => knownProblemSentence(diagnostic) ?? `FALLBACK: ${diagnostic.reason}`).sort();
}

describe('0022 AC-013: X-10, X-11, X-12 the lifecycle contradictions', () => {
    it('X-10 a spec in a folder that does not match its status names the folder and the status', async () => {
        const found = await problemsOfMemory((source) => {
            source.setFile(ROOT, '.specs/backlog/0001-a.md', specText({ status: 'In Progress' }));
            source.setFile(ROOT, '.specs/done/0002-b.md', specText({ status: 'Draft' }));
        });
        expect(sentences(found)).toEqual(['In the backlog folder, but its status is "In Progress"', 'In the done folder, but its status is "Draft"']);
    });

    it('X-10 without a status the sentence says it has none', async () => {
        const found = await problemsOfMemory((source) => source.setFile(ROOT, '.specs/backlog/0001-a.md', specText({ status: undefined })));
        expect(sentences(found)).toEqual(['In the backlog folder, but it has no status']);
    });

    it('X-11 an active spec without a plan', async () => {
        const found = await problemsOfMemory((source) => source.setFile(ROOT, '.specs/active/0001-a.md', specText({ status: 'In Progress' })));
        expect(sentences(found)).toEqual(['Active, but it has no plan']);
    });

    it('X-12 an implemented done spec without an archive link', async () => {
        const found = await problemsOfMemory((source) => source.setFile(ROOT, '.specs/done/0001-a.md', specText({ status: 'Implemented' })));
        expect(sentences(found)).toEqual(['Done, but its plan was never archived']);
    });
});

describe('0022 AC-013: X-13 to X-16 unreadable files and folders', () => {
    it('X-13, X-14, X-15, X-16 by scope: spec, plan, return note with its file name, folder', async () => {
        const found = await problemsOfMemory((source) => {
            source.setFile(ROOT, '.specs/active/0001-a.md', specText({ status: 'In Progress', plan: '[p](0001-a.plan.md)' }));
            source.setUnreadable(ROOT, '.specs/active/0001-a.plan.md', 'could not be read: EACCES');
            source.setFile(ROOT, '.specs/backlog/0002-b.md', specText());
            source.setUnreadable(ROOT, '.specs/backlog/0003-c.md', 'not valid UTF-8');
            source.setUnreadable(ROOT, '.memory-bank/activeContext.0001-T-001.md', 'could not be read: EIO');
            source.setUnlistable(ROOT, '.specs/done', 'could not be listed: EACCES');
        });
        const all = sentences(found);
        expect(all).toContain('Studio cannot read this spec');
        expect(all).toContain('Studio cannot read its plan');
        expect(all).toContain('Studio cannot read its return note activeContext.0001-T-001.md');
        expect(all).toContain('Studio cannot list this folder');
        expect(all.filter((line) => line.startsWith('FALLBACK'))).toEqual([]);
    });

    it('a symbolic link and a parse failure read like an unreadable file, never with the system message', async () => {
        const found = await problemsOfMemory((source) => {
            source.setSymlink(ROOT, '.specs/backlog/0001-a.md');
        });
        expect(sentences(found)).toEqual(['Studio cannot read this spec']);
        const parsing: Diagnostic = { kind: 'unreadable-file', tier: 'problem', scope: { file: '.specs/backlog/0004-d.plan.md' }, reason: 'parsing failed: boom' };
        expect(problemSentence(parsing)).toBe('Studio cannot read its plan');
        const symlinkFolder: Diagnostic = { kind: 'unreadable-file', tier: 'problem', scope: { file: '.specs/done' }, reason: 'symbolic link not followed' };
        expect(problemSentence(symlinkFolder)).toBe('Studio cannot list this folder');
    });
});

describe('0022 AC-013: X-17, X-18 duplicates', () => {
    it('X-17 the same spec twice, X-18 a number used twice', async () => {
        const found = await problemsOfMemory((source) => {
            source.setFile(ROOT, '.specs/backlog/0001-a.md', specText());
            source.setFile(ROOT, '.specs/done/0001-a.md', specText({ status: 'Baseline' }));
            source.setFile(ROOT, '.specs/backlog/0002-b.md', specText());
            source.setFile(ROOT, '.specs/backlog/0002-c.md', specText());
        });
        const all = sentences(found);
        expect(all).toContain('The same spec also exists in .specs/done/0001-a.md');
        expect(all).toContain('The same spec also exists in .specs/backlog/0001-a.md');
        expect(all).toContain('Number 0002 is also used by .specs/backlog/0002-c.md');
        expect(all).toContain('Number 0002 is also used by .specs/backlog/0002-b.md');
        expect(all.filter((line) => line.startsWith('FALLBACK'))).toEqual([]);
    });
});

describe('0022 AC-013: X-19, X-20 dangling links', () => {
    it('X-19 the plan link of a spec points to a missing file, X-20 the spec link of a plan', async () => {
        const found = await problemsOfMemory((source) => {
            source.setFile(ROOT, '.specs/active/0001-a.md', specText({ status: 'In Progress', plan: '[p](0001-a.plan.md)' }));
            source.setFile(ROOT, '.specs/backlog/0002-b.md', specText({ plan: '[x](gone.plan.md)' }));
            source.setFile(ROOT, '.specs/active/0001-a.plan.md', planText({ spec: '[s](missing.md)' }));
        });
        const all = sentences(found);
        expect(all).toContain('Its plan gone.plan.md does not exist');
        expect(all).toContain('Its plan links a spec that does not exist: missing.md');
        expect(all.filter((line) => line.startsWith('FALLBACK'))).toEqual([]);
    });
});

describe('0022 AC-013: X-21 to X-24 unknown statuses and an orphan note', () => {
    it('X-21 an unknown spec status, X-22 an unknown plan status, X-23 an unknown return-note status', async () => {
        const found = await problemsOfMemory((source) => {
            source.setFile(ROOT, '.specs/backlog/0001-a.md', specText({ status: 'Parked' }));
            source.setFile(ROOT, '.specs/active/0002-b.md', specText({ status: 'In Progress', plan: '[p](0002-b.plan.md)' }));
            source.setFile(ROOT, '.specs/active/0002-b.plan.md', planText({ status: 'Sleeping', spec: '[s](0002-b.md)' }));
            source.setFile(ROOT, '.memory-bank/activeContext.0002-T-001.md', noteText('MAYBE'));
        });
        const all = sentences(found);
        expect(all).toContain('Its status "Parked" is not a FeatherSpec status');
        expect(all).toContain('Its plan\'s status "Sleeping" is not a FeatherSpec status');
        expect(all).toContain('Its return note\'s status "MAYBE" is not DONE or BLOCKED');
        expect(all.filter((line) => line.startsWith('FALLBACK'))).toEqual([]);
    });

    it('X-24 a return note that belongs to no spec', async () => {
        const found = await problemsOfMemory((source) => source.setFile(ROOT, '.memory-bank/activeContext.0042-T-001.md', noteText('DONE')));
        expect(sentences(found)).toEqual(['This return note belongs to no spec (number 0042)']);
    });
});

describe('0022 AC-013: the nine baseline fixtures and the fallback', () => {
    it.each(BASELINE_FIXTURES.map((fixture) => [fixture.name, fixture.version]))('every Problem of %s maps to a sentence without the fallback', async (name, version) => {
        const project = await readProject(createNodeSpecSource(), fixturePath(name!), version!);
        for (const diagnostic of problemsOf(project)) {
            const sentence = knownProblemSentence(diagnostic);
            expect(sentence, `${name}: ${diagnostic.reason}`).toBeDefined();
            expect(sentence).not.toBe(diagnostic.reason);
        }
    });

    it('fs-broken and fs170-brownfield-mixed between them show the encoding, the folder and the contradiction sentences', async () => {
        const all: string[] = [];
        for (const name of ['fs-broken', 'fs170-brownfield-mixed']) {
            const project = await readProject(createNodeSpecSource(), fixturePath(name), name === 'fs-broken' ? '1.10.0' : '1.7.0');
            all.push(...sentences(problemsOf(project)));
        }
        expect(all.length).toBeGreaterThan(0);
        expect(all.some((line) => line === 'Studio cannot read this spec')).toBe(true);
        expect(all.some((line) => /^In the \w+ folder, but /.test(line) || line === 'Done, but its plan was never archived' || line === 'Active, but it has no plan')).toBe(true);
    });

    it('a finding that none of our emitters writes falls back to its reason, and the sweep sees it as unknown', () => {
        const stray: Diagnostic = { kind: 'unknown-content', tier: 'problem', scope: { file: '.specs/backlog/0001-a.md' }, reason: 'something new' };
        expect(problemSentence(stray)).toBe('something new');
        expect(knownProblemSentence(stray)).toBeUndefined();
    });
});

describe('0022 AC-014: a sentence holds no technical word', () => {
    const BANNED = ['backlog/', 'active/', 'done/', '**', 'Plan line', 'sibling', 'stem', 'parsing', 'diagnostic'];
    const TEXT_X = 'x';
    const samples: LifecycleDiagnostic[] = [
        { kind: 'lifecycle-contradiction', tier: 'problem', contradiction: 'folder-status', scope: { file: 'a/b.md' }, reason: 'Folder backlog/ does not match status "Parked".' },
        { kind: 'lifecycle-contradiction', tier: 'problem', contradiction: 'folder-status', scope: { file: 'a/b.md' }, reason: 'Folder done/ does not match status "(missing)".' },
        { kind: 'lifecycle-contradiction', tier: 'problem', contradiction: 'active-without-plan', scope: { file: 'a/b.md' }, reason: 'active/ spec without a sibling plan.' },
        { kind: 'lifecycle-contradiction', tier: 'problem', contradiction: 'done-without-archive-link', scope: { file: 'a/b.md' }, reason: 'done/ Implemented spec without an archive link in its Plan line.' },
        { kind: 'unreadable-file', tier: 'problem', scope: { file: 'a/b.md' }, reason: 'parsing failed: nope' },
        { kind: 'unreadable-file', tier: 'problem', scope: { file: 'a/b.plan.md' }, reason: 'could not be read: nope' },
        { kind: 'unreadable-file', tier: 'problem', scope: { file: '.memory-bank/activeContext.0001-T-001.md' }, reason: 'not valid UTF-8' },
        { kind: 'unreadable-file', tier: 'problem', scope: { file: '.specs/done' }, reason: 'could not be listed: nope' },
        { kind: 'duplicate', tier: 'problem', scope: { file: 'a/b.md' }, reason: 'reference 0001-a also exists in p/q.md, r/s.md' },
        { kind: 'duplicate', tier: 'problem', scope: { file: 'a/b.md' }, reason: 'number 0001 also used by p/q.md' },
        { kind: 'dangling-link', tier: 'problem', scope: { file: 'a/b.md' }, reason: 'plan link t.md points to a missing file' },
        { kind: 'dangling-link', tier: 'problem', scope: { file: 'a/b.plan.md' }, reason: 'spec link t.md points to a missing file' },
        { kind: 'unknown-content', tier: 'problem', scope: { file: 'a/b.md' }, reason: 'unknown **Status:** value "v"' },
        { kind: 'unknown-content', tier: 'problem', scope: { file: 'a/b.plan.md' }, reason: 'Unknown plan status "v"; documented values are Not started, In Progress, Blocked, Done' },
        { kind: 'unknown-content', tier: 'problem', scope: { file: '.memory-bank/activeContext.0001-T-001.md' }, reason: 'unknown status value "v"' },
        { kind: 'orphan', tier: 'problem', scope: { file: '.memory-bank/activeContext.0001-T-001.md' }, reason: 'return note matches no spec (number 0001)' },
    ];

    function masked(sentence: string, diagnostic: LifecycleDiagnostic): string {
        const file = diagnostic.scope === 'project' ? '' : diagnostic.scope.file;
        const name = file.slice(file.lastIndexOf('/') + 1);
        return [...sentence.matchAll(/"[^"]*"|\b\d{4}\b|\b[\w./-]+\.(?:md)\b|\b(?:backlog|active|done)\b(?= folder)|\bt\.md\b|\bp\/q\.md\b|\br\/s\.md\b/g)].reduce((text, match) => text.replace(match[0], TEXT_X), sentence).replace(name, TEXT_X);
    }

    it('with every inserted path, value and number replaced by x, no sentence holds one of the nine words', () => {
        for (const diagnostic of samples) {
            const sentence = knownProblemSentence(diagnostic);
            expect(sentence, diagnostic.reason).toBeDefined();
            const plain = masked(sentence!, diagnostic);
            for (const word of BANNED) {
                expect(plain, `${diagnostic.reason} -> ${sentence}`).not.toContain(word);
            }
        }
    });

    it('negative control: the raw reasons hold the banned words, so the check can fail', () => {
        const holding = samples.filter((diagnostic) => BANNED.some((word) => diagnostic.reason.includes(word)));
        expect(holding.length).toBeGreaterThanOrEqual(6);
    });
});
