import { describe, expect, it } from 'vitest';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import type { LifecycleEntry } from '../lifecycle/model';
import { planText, readFixture, readMemory, specText } from '../lifecycle/testing/projects';
import { readProject } from '../specs/readProject';
import { createMemorySpecSource } from '../specs/testing/memorySpecSource';
import { needsOf } from './needs';

const LINKED = '[0001-a.plan.md](0001-a.plan.md)';
const SPEC_LINK = '[s](0001-a.md)';

async function needs(files: Record<string, string>, key = '.specs/backlog/0001-a.md') {
    const project = await readMemory(files);
    const model = deriveLifecycle(project);
    const entry = model.entries.find((candidate) => candidate.key === key) as LifecycleEntry;
    return needsOf(project, entry);
}

describe('needs of a Backlog spec (0016 §6.3, AC-014)', () => {
    it('AC-014: no acceptance criterion needs acceptance criteria (R-2)', async () => {
        expect(await needs({ '.specs/backlog/0001-a.md': specText({ plan: LINKED, criteria: false }), '.specs/backlog/0001-a.plan.md': planText({ spec: SPEC_LINK }) })).toEqual([
            { text: 'needs acceptance criteria', rule: 'R-2' },
        ]);
    });

    it('AC-014: no sibling plan needs a plan (R-3)', async () => {
        expect(await needs({ '.specs/backlog/0001-a.md': specText() })).toEqual([{ text: 'needs a plan', rule: 'R-3' }]);
    });

    it('AC-014: a sibling plan the Plan line does not link needs the Plan line to link its plan (R-3)', async () => {
        expect(await needs({ '.specs/backlog/0001-a.md': specText({ plan: '_none yet_' }), '.specs/backlog/0001-a.plan.md': planText({ spec: SPEC_LINK }) })).toEqual([
            { text: 'needs the Plan line to link its plan', rule: 'R-3' },
        ]);
    });

    it.each([['In Progress'], ['Done']])('AC-014: a sibling plan with status %s says plan already started (R-4)', async (status) => {
        expect(await needs({ '.specs/backlog/0001-a.md': specText({ plan: LINKED }), '.specs/backlog/0001-a.plan.md': planText({ spec: SPEC_LINK, status }) })).toEqual([
            { text: 'plan already started', rule: 'R-4' },
        ]);
    });

    it.each([['—'], ['']])('AC-014: a sibling plan whose Status line is %j has no status (R-4)', async (status) => {
        const plan = `# Plan\n\n**Spec:** ${SPEC_LINK}\n**Status:** ${status}\n`;
        expect(await needs({ '.specs/backlog/0001-a.md': specText({ plan: LINKED }), '.specs/backlog/0001-a.plan.md': plan })).toEqual([{ text: 'plan has no status', rule: 'R-4' }]);
    });

    it('AC-014: a sibling plan without any Status line has no status (R-4)', async () => {
        const plan = `# Plan\n\n**Spec:** ${SPEC_LINK}\n`;
        expect(await needs({ '.specs/backlog/0001-a.md': specText({ plan: LINKED }), '.specs/backlog/0001-a.plan.md': plan })).toEqual([{ text: 'plan has no status', rule: 'R-4' }]);
    });

    it('AC-014: every applying need comes in the order R-2, R-3, R-4', async () => {
        const plan = `# Plan\n\n**Spec:** ${SPEC_LINK}\n**Status:** In Progress\n`;
        expect((await needs({ '.specs/backlog/0001-a.md': specText({ plan: '_none yet_', criteria: false }), '.specs/backlog/0001-a.plan.md': plan })).map((need) => need.rule)).toEqual(['R-2', 'R-3', 'R-4']);
    });

    it('AC-014: a Ready spec has no need (negative control)', async () => {
        expect(await needs({ '.specs/backlog/0001-a.md': specText({ plan: LINKED }), '.specs/backlog/0001-a.plan.md': planText({ spec: SPEC_LINK }) })).toEqual([]);
    });

    it('AC-014: only Backlog shows needs: an Active spec without criteria shows none', async () => {
        const files = { '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: LINKED, criteria: false }), '.specs/active/0001-a.plan.md': planText({ spec: SPEC_LINK, status: 'In Progress' }) };
        expect(await needs(files, '.specs/active/0001-a.md')).toEqual([]);
    });

    it('Q-4: an unreadable sibling plan gives no R-4 need (its Problem says why)', async () => {
        const source = createMemorySpecSource();
        source.setFile('memory://needs', '.specs/backlog/0001-a.md', specText({ plan: LINKED }));
        source.setUnreadable('memory://needs', '.specs/backlog/0001-a.plan.md', 'EACCES');
        const project = await readProject(source, 'memory://needs', '1.10.0');
        const entry = deriveLifecycle(project).entries[0] as LifecycleEntry;
        expect(project.diagnostics.map((diagnostic) => diagnostic.tier)).toEqual(['problem']);
        expect(needsOf(project, entry).map((need) => need.rule)).not.toContain('R-4');
    });

    it('AC-014: fs170-brownfield-mixed gives 0003 the need "needs a plan"', async () => {
        const project = await readFixture('fs170-brownfield-mixed');
        const model = deriveLifecycle(project);
        const entry = model.entries.find((candidate) => candidate.number === '0003') as LifecycleEntry;
        expect(needsOf(project, entry)).toEqual([{ text: 'needs a plan', rule: 'R-3' }]);
    });
});
