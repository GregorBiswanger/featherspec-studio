import { describe, expect, it } from 'vitest';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { readMemory, ROOT } from '../lifecycle/testing/projects';
import type { ShellModel } from '../ports/shell';
import { buildSpecRows } from './specRows';

async function model(files: Record<string, string>): Promise<ShellModel> {
    const project = await readMemory(files);
    return { project, lifecycle: deriveLifecycle(project) };
}

const spec = (title: string | undefined, status: string) => `${title === undefined ? '' : `# ${title}\n\n`}**Status:** ${status}\n**Plan:** _none yet_\n`;

describe('AC-007: spec rows', () => {
    it('are ordered by number and then by path', async () => {
        const m = await model({
            '.specs/active/0010-j.md': spec('J', 'In Progress'),
            '.specs/backlog/0002-b.md': spec('B', 'Draft'),
            '.specs/active/0002-b.md': spec('B again', 'In Progress'),
            '.specs/backlog/0001-a.md': spec('A', 'Draft'),
        });
        expect(buildSpecRows(m, undefined).map((row) => `${row.number} ${row.path}`)).toEqual([
            '0001 .specs/backlog/0001-a.md',
            '0002 .specs/active/0002-b.md',
            '0002 .specs/backlog/0002-b.md',
            '0010 .specs/active/0010-j.md',
        ]);
    });

    it('shows the title, or none when the spec has no title, with the board state word', async () => {
        const m = await model({ '.specs/backlog/0001-a.md': spec('Alpha', 'Draft'), '.specs/backlog/0002-b.md': spec(undefined, 'Draft') });
        const rows = buildSpecRows(m, undefined);
        expect(rows.map((row) => row.title)).toEqual(['Alpha', undefined]);
        expect(rows[0]).toMatchObject({ stem: '0001-a', state: 'Backlog', derivedRule: undefined, showPath: false, selected: false });
    });

    it('carries the derived label with its rule for a derived state (PD-004) and none for a persisted one', async () => {
        const m = await model({
            '.specs/active/0001-a.md': spec('Alpha', 'In Progress'),
            '.specs/backlog/0002-b.md': spec('Beta', 'Draft'),
        });
        const derived = m.lifecycle.entries.filter((entry) => entry.persistence === 'derived');
        const rows = buildSpecRows(m, undefined);
        expect(rows.filter((row) => row.derivedRule !== undefined)).toHaveLength(derived.length);
        for (const entry of derived) {
            expect(rows.find((row) => row.path === entry.key)?.derivedRule).toBe(entry.rule);
        }
        expect(rows.find((row) => row.stem === '0001-a')?.derivedRule).toBeUndefined();
    });

    it('shows the project-relative path for a duplicated stem only', async () => {
        const m = await model({
            '.specs/backlog/0004-x.md': spec('X', 'Draft'),
            '.specs/active/0004-x.md': spec('X', 'In Progress'),
            '.specs/backlog/0005-y.md': spec('Y', 'Draft'),
        });
        const rows = buildSpecRows(m, undefined);
        expect(rows.map((row) => row.showPath)).toEqual([true, true, false]);
    });

    it('marks the selected spec: by stem, and by stem plus path while duplicated', async () => {
        const m = await model({
            '.specs/backlog/0004-x.md': spec('X', 'Draft'),
            '.specs/active/0004-x.md': spec('X', 'In Progress'),
            '.specs/backlog/0005-y.md': spec('Y', 'Draft'),
        });
        expect(buildSpecRows(m, { projectRoot: ROOT, stem: '0005-y' }).map((row) => row.selected)).toEqual([false, false, true]);
        expect(buildSpecRows(m, { projectRoot: ROOT, stem: '0004-x', path: '.specs/backlog/0004-x.md' }).map((row) => row.selected)).toEqual([false, true, false]);
    });

    it('gives no rows without a model and for a project with zero specs', async () => {
        expect(buildSpecRows(undefined, undefined)).toEqual([]);
        expect(buildSpecRows(await model({ '.specs/README.md': '# x' }), undefined)).toEqual([]);
    });
});
