import { describe, expect, it } from 'vitest';
import { createMemorySpecSource } from '../specs/testing/memorySpecSource';
import { readProject } from '../specs/readProject';
import { changedPaths } from './changedPaths';
import { noteText, planText, ROOT, specText, VERSION } from './testing/projects';

const LINKED = '[0001-a.plan.md](0001-a.plan.md)';

async function world(): Promise<{ read: () => ReturnType<typeof readProject>; set: (path: string, content: string) => void; remove: (path: string) => void }> {
    const source = createMemorySpecSource();
    return {
        read: () => readProject(source, ROOT, VERSION),
        set: (path, content) => source.setFile(ROOT, path, content),
        remove: (path) => source.remove(ROOT, path),
    };
}

describe('changedPaths', () => {
    it('AC-014: names the spec, plan and note files of the stem whose content changed, sorted', async () => {
        const w = await world();
        w.set('.specs/active/0001-a.md', specText({ status: 'In Progress', plan: LINKED }));
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'In Progress' }));
        w.set('.specs/active/0002-b.md', specText({ status: 'In Progress', plan: '_none yet_' }));
        const before = await w.read();
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'Done' }));
        w.set('.memory-bank/activeContext.0001-T-001.md', noteText('DONE'));
        w.set('.specs/active/0002-b.md', specText({ status: 'In Progress', plan: '_none_' }));
        const after = await w.read();
        expect(changedPaths('0001-a', before, after)).toEqual(['.memory-bank/activeContext.0001-T-001.md', '.specs/active/0001-a.plan.md']);
    });

    it('AC-014: a moved spec names its old and its new path; an unchanged stem names nothing', async () => {
        const w = await world();
        w.set('.specs/backlog/0001-a.md', specText({ plan: '_none yet_' }));
        w.set('.specs/backlog/0003-c.md', specText({ plan: '_none yet_' }));
        const before = await w.read();
        w.remove('.specs/backlog/0001-a.md');
        w.set('.specs/active/0001-a.md', specText({ status: 'In Progress', plan: '_none yet_' }));
        const after = await w.read();
        expect(changedPaths('0001-a', before, after)).toEqual(['.specs/active/0001-a.md', '.specs/backlog/0001-a.md']);
        expect(changedPaths('0003-c', before, after)).toEqual([]);
    });

    it('AC-014: a removed plan is named; without a previous snapshot every file of the stem is named', async () => {
        const w = await world();
        w.set('.specs/active/0001-a.md', specText({ status: 'In Progress', plan: LINKED }));
        w.set('.specs/active/0001-a.plan.md', planText({ status: 'In Progress' }));
        const before = await w.read();
        w.remove('.specs/active/0001-a.plan.md');
        const after = await w.read();
        expect(changedPaths('0001-a', before, after)).toContain('.specs/active/0001-a.plan.md');
        expect(changedPaths('0001-a', undefined, before)).toEqual(['.specs/active/0001-a.md', '.specs/active/0001-a.plan.md']);
    });
});
