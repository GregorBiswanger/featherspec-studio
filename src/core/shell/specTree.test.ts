import { describe, expect, it } from 'vitest';
import { modelOf } from '../board/testing/boardWorld';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { readFixture } from '../lifecycle/testing/projects';
import type { ShellModel } from '../ports/shell';
import { buildSpecTree, type GroupModel, type SpecRowModel, type SpecTreeModel } from './specTree';

function spec(title: string | undefined, status: string, plan?: string): string {
    return [...(title === undefined ? [] : [`# ${title}`, '']), `**Status:** ${status}`, ...(plan === undefined ? [] : [`**Plan:** [${plan}](${plan})`]), '', '## 13. Acceptance criteria', '', '**AC-001** The system shall work.', ''].join('\n');
}

function plan(status: string): string {
    return `# Plan\n\n**Status:** ${status}\n\n- [ ] **Verified (T-001):** —\n`;
}

function treeOf(model: ShellModel, extra: { projectCount?: number } = {}): SpecTreeModel {
    return buildSpecTree({ projectActive: true, projectName: 'demo', projectCount: extra.projectCount ?? 1, state: undefined, model });
}

function groups(tree: SpecTreeModel): GroupModel[] {
    return tree.items.filter((item): item is GroupModel => item.kind === 'group');
}

function rows(tree: SpecTreeModel): SpecRowModel[] {
    return groups(tree).flatMap((group) => group.children);
}

function groupOf(tree: SpecTreeModel, label: string): GroupModel {
    const found = groups(tree).find((group) => group.label === label);
    if (found === undefined) {
        throw new Error(`no group ${label}`);
    }
    return found;
}

const MIXED = {
    '.specs/backlog/0001-idea.md': spec('Idea', 'Draft'),
    '.specs/backlog/0002-planned.md': spec('Planned', 'Draft', '0002-planned.plan.md'),
    '.specs/backlog/0002-planned.plan.md': plan('Not started'),
    '.specs/active/0003-working.md': spec('Working', 'In Progress', '0003-working.plan.md'),
    '.specs/active/0003-working.plan.md': plan('In Progress'),
    '.specs/active/0004-reviewing.md': spec('Reviewing', 'In Progress', '0004-reviewing.plan.md'),
    '.specs/active/0004-reviewing.plan.md': plan('Done'),
    '.specs/active/0005-stuck.md': spec('Stuck', 'In Progress', '0005-stuck.plan.md'),
    '.specs/active/0005-stuck.plan.md': plan('Blocked'),
    '.specs/done/0006-finished.md': spec('Finished', 'Baseline'),
    '.specs/done/0007-old.md': spec('Old', 'Deprecated'),
};

describe('0020 AC-001: the groups', () => {
    it('shows the groups that hold a spec, in the order In progress, Up next, Backlog, Done, each with its count as the description', async () => {
        const tree = treeOf(await modelOf(MIXED));
        expect(tree.message).toBeUndefined();
        expect(groups(tree).map((group) => [group.label, group.description])).toEqual([
            ['In progress', '3'],
            ['Up next', '1'],
            ['Backlog', '1'],
            ['Done', '2'],
        ]);
        expect(tree.items.every((item) => item.kind === 'group')).toBe(true);
    });

    it('puts every spec entry in exactly one group by its board state, a deprecated spec among Done', async () => {
        const tree = treeOf(await modelOf(MIXED));
        const byGroup = Object.fromEntries(groups(tree).map((group) => [group.label, group.children.map((row) => row.stem)]));
        expect(byGroup).toEqual({
            'In progress': ['0005-stuck', '0004-reviewing', '0003-working'],
            'Up next': ['0002-planned'],
            Backlog: ['0001-idea'],
            Done: ['0006-finished', '0007-old'],
        });
        expect(rows(tree)).toHaveLength(7);
    });

    it('leaves out a group with no spec', async () => {
        const tree = treeOf(await modelOf({ '.specs/active/0003-working.md': spec('Working', 'In Progress', '0003-working.plan.md'), '.specs/active/0003-working.plan.md': plan('In Progress') }));
        expect(groups(tree).map((group) => group.label)).toEqual(['In progress']);
    });
});

describe('0020 AC-002: expand state and IDs', () => {
    it('starts In progress, Up next and Backlog expanded and Done collapsed', async () => {
        const tree = treeOf(await modelOf(MIXED));
        expect(groups(tree).map((group) => [group.label, group.collapsed])).toEqual([
            ['In progress', false],
            ['Up next', false],
            ['Backlog', false],
            ['Done', true],
        ]);
    });

    it('a group ID is the same for a count of 1 and of 3 and carries no count', async () => {
        const one = treeOf(await modelOf({ '.specs/backlog/0001-a.md': spec('A', 'Draft') }));
        const three = treeOf(await modelOf({ '.specs/backlog/0001-a.md': spec('A', 'Draft'), '.specs/backlog/0002-b.md': spec('B', 'Draft'), '.specs/backlog/0003-c.md': spec('C', 'Draft') }));
        expect(groupOf(one, 'Backlog').id).toBe(groupOf(three, 'Backlog').id);
        expect(groupOf(one, 'Backlog').id).toBe('group:backlog');
        expect(groupOf(three, 'Backlog').description).toBe('3');
        expect(groups(treeOf(await modelOf(MIXED))).map((group) => group.id)).toEqual(['group:inProgress', 'group:upNext', 'group:backlog', 'group:done']);
    });

    it('no two rows or groups of one tree share an ID', async () => {
        const tree = treeOf(await modelOf({ ...MIXED, '.specs/backlog/0008-twin.md': spec('Twin', 'Draft'), '.specs/active/0008-twin.md': spec('Twin', 'In Progress') }));
        const ids = [...groups(tree).map((group) => group.id), ...rows(tree).map((row) => row.id)];
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids).toHaveLength(4 + 9);
    });

    it('a row ID is the same before and after a move between groups', async () => {
        const before = treeOf(await modelOf({ '.specs/backlog/0001-a.md': spec('A', 'Draft') }));
        const after = treeOf(await modelOf({ '.specs/active/0001-a.md': spec('A', 'In Progress', '0001-a.plan.md'), '.specs/active/0001-a.plan.md': plan('In Progress') }));
        expect(groups(before).map((group) => group.label)).toEqual(['Backlog']);
        expect(groups(after).map((group) => group.label)).toEqual(['In progress']);
        expect(rows(after)[0]!.id).toBe(rows(before)[0]!.id);
    });

    it('a duplicated stem gets a different ID per file; the same stem in two projects gets different IDs', async () => {
        const files = { '.specs/backlog/0008-twin.md': spec('Twin', 'Draft'), '.specs/active/0008-twin.md': spec('Twin', 'In Progress') };
        const tree = treeOf(await modelOf(files));
        const twins = rows(tree).filter((row) => row.stem === '0008-twin');
        expect(twins).toHaveLength(2);
        expect(twins[0]!.id).not.toBe(twins[1]!.id);
        expect(twins.map((row) => row.path).sort()).toEqual(['.specs/active/0008-twin.md', '.specs/backlog/0008-twin.md']);

        const single = await modelOf({ '.specs/backlog/0001-a.md': spec('A', 'Draft') });
        const other: ShellModel = { ...single, project: { ...single.project, root: 'memory://other' } };
        expect(rows(treeOf(other))[0]!.id).not.toBe(rows(treeOf(single))[0]!.id);
    });
});

describe('0020 AC-003: the order', () => {
    it('orders In progress Blocked, Review, Active, then by number, then by path', async () => {
        const tree = treeOf(
            await modelOf({
                '.specs/active/0001-a.md': spec('A', 'In Progress', '0001-a.plan.md'),
                '.specs/active/0001-a.plan.md': plan('In Progress'),
                '.specs/active/0002-b.md': spec('B', 'In Progress', '0002-b.plan.md'),
                '.specs/active/0002-b.plan.md': plan('Done'),
                '.specs/active/0003-c.md': spec('C', 'In Progress', '0003-c.plan.md'),
                '.specs/active/0003-c.plan.md': plan('Blocked'),
                '.specs/active/0004-d.md': spec('D', 'In Progress', '0004-d.plan.md'),
                '.specs/active/0004-d.plan.md': plan('Done'),
                '.specs/active/0010-e.md': spec('E', 'In Progress', '0010-e.plan.md'),
                '.specs/active/0010-e.plan.md': plan('In Progress'),
            }),
        );
        expect(groupOf(tree, 'In progress').children.map((row) => [row.stem.slice(0, 4), row.description.split(' ')[0]])).toEqual([
            ['0003', 'Blocked'],
            ['0002', 'Review'],
            ['0004', 'Review'],
            ['0001', 'Active'],
            ['0010', 'Active'],
        ]);
    });

    it('orders the rows of the other groups by number, compared as numbers, then by path', async () => {
        const tree = treeOf(
            await modelOf({
                '.specs/backlog/0010-z.md': spec('Z', 'Draft'),
                '.specs/backlog/0002-y.md': spec('Y', 'Draft'),
                '.specs/backlog/0009-twin.md': spec('Twin', 'Draft'),
                '.specs/done/0009-twin.md': spec('Twin', 'Implemented'),
            }),
        );
        expect(groupOf(tree, 'Backlog').children.map((row) => row.specKey)).toEqual(['.specs/backlog/0002-y.md', '.specs/backlog/0009-twin.md', '.specs/backlog/0010-z.md']);
    });
});

describe('0020 AC-004: the row texts', () => {
    it('a title of 24 characters is not cut; one of 25 is cut at its last space within the first 24, then …', async () => {
        const exact = 'abcdefghi jklmnopqrstuvw';
        const long = 'abcdefghi jklmnopqrstuvwx';
        expect(exact).toHaveLength(24);
        expect(long).toHaveLength(25);
        const tree = treeOf(await modelOf({ '.specs/backlog/0001-a.md': spec(exact, 'Draft'), '.specs/backlog/0002-b.md': spec(long, 'Draft') }));
        expect(rows(tree).map((row) => row.label)).toEqual([`0001 ${exact}`, '0002 abcdefghi…']);
    });

    it('the description is the state, with the short form of the next step where there is one', async () => {
        const tree = treeOf(await modelOf(MIXED));
        const byStem = Object.fromEntries(rows(tree).map((row) => [row.stem, row.description]));
        expect(byStem['0004-reviewing']).toBe('Review · /sdd-compile');
        expect(byStem['0005-stuck']).toBe('Blocked · /sdd-plan');
        expect(byStem['0001-idea']).toBe('Backlog · /sdd-clarify');
        expect(byStem['0006-finished']).toBe('Done');
        expect(byStem['0007-old']).toBe('Deprecated');
    });

    it('a title of only spaces or none shows the slug, in the label and the accessible label', async () => {
        const tree = treeOf(await modelOf({ '.specs/backlog/0001-no-title.md': spec(undefined, 'Draft'), '.specs/backlog/0002-blank.md': '#    \n\n**Status:** Draft\n' }));
        const labels = rows(tree).map((row) => [row.label, row.accessibleLabel.startsWith(`${row.label.split(' ')[0]} ${row.label.split(' ')[1]}`)]);
        expect(labels).toEqual([
            ['0001 no-title', true],
            ['0002 blank', true],
        ]);
    });

    it('the Given of AC-004: 0015 in Review shows the cut label, the description and the full accessible label', async () => {
        const project = await readFixture('studio-0015');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const row = rows(treeOf(model)).find((candidate) => candidate.stem === '0015-focus-on-visibility');
        expect(row?.label).toBe('0015 Focus the Studio on…');
        expect(row?.description).toBe('Review · /sdd-compile');
        expect(row?.accessibleLabel).toBe('0015 Focus the Studio on Visibility: No Agent Runs, a Named Next Step, Review · /sdd-compile');
    });
});

describe('0020 AC-005: icons and colours', () => {
    it('every state has its icon and colour', async () => {
        const tree = treeOf(await modelOf({ ...MIXED, '.specs/active/0009-ready.md': spec('Ready', 'In Progress', '0009-ready.plan.md'), '.specs/active/0009-ready.plan.md': plan('Not started') }));
        const byState = new Map(rows(tree).map((row) => [row.description.split(' ')[0]!, [row.icon, row.color]]));
        expect(Object.fromEntries(byState)).toEqual({
            Backlog: ['list-flat', 'descriptionForeground'],
            Ready: ['pass', 'charts.blue'],
            Active: ['play', 'charts.purple'],
            Review: ['eye', 'charts.yellow'],
            Done: ['check', 'charts.green'],
            Blocked: ['circle-slash', 'charts.red'],
            Deprecated: ['check', 'charts.green'],
        });
    });

    it('a spec with a Problem carries the warning icon, keeps its state word and adds the problem count to the accessible label', async () => {
        const project = await readFixture('fs-broken');
        const tree = treeOf({ project, lifecycle: deriveLifecycle(project) });
        const broken = rows(tree).filter((row) => row.icon === 'warning');
        expect(broken.length).toBeGreaterThan(0);
        for (const row of broken) {
            expect(row.color).toBe('problemsWarningIcon.foreground');
            expect(row.description.startsWith(row.description.split(' ')[0]!)).toBe(true);
            expect(row.accessibleLabel).toMatch(/, 1 problem$/);
        }
        expect(rows(tree).filter((row) => row.icon !== 'warning').every((row) => !/problem/.test(row.accessibleLabel))).toBe(true);
    });

    it('negative control: a spec without a Problem keeps the icon of its state', async () => {
        const tree = treeOf(await modelOf({ '.specs/backlog/0001-a.md': spec('A', 'Draft') }));
        expect(rows(tree)[0]!.icon).toBe('list-flat');
    });
});

describe('0020 AC-001, AC-005: a move changes the group', () => {
    it('a spec moved from backlog to active leaves Backlog and shows in In progress', async () => {
        const before = treeOf(await modelOf({ '.specs/backlog/0001-a.md': spec('A', 'Draft', '0001-a.plan.md'), '.specs/backlog/0001-a.plan.md': plan('Not started') }));
        const after = treeOf(await modelOf({ '.specs/active/0001-a.md': spec('A', 'In Progress', '0001-a.plan.md'), '.specs/active/0001-a.plan.md': plan('In Progress') }));
        expect(groupOf(before, 'Up next').children.map((row) => row.stem)).toEqual(['0001-a']);
        expect(groupOf(after, 'In progress').children.map((row) => row.stem)).toEqual(['0001-a']);
    });
});
