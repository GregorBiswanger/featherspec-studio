import { STATE_LOOK } from '../../shared/protocol/stateLook';
import { describe, expect, it } from 'vitest';
import { modelOf } from '../board/testing/boardWorld';
import { problemSentence } from '../lifecycle/problemSentence';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { readFixture } from '../lifecycle/testing/projects';
import type { PanelState } from '../../shared/protocol/messages';
import type { ShellModel } from '../ports/shell';
import { buildCards } from '../board/cards';
import { arrangeBoard } from '../board/filters';
import { projectFigures } from '../overview/figures';
import { buildSpecTree, type GroupModel, type SpecRowModel, type SpecTreeModel } from './specTree';

function spec(title: string | undefined, status: string, plan?: string): string {
    return [...(title === undefined ? [] : [`# ${title}`, '']), `**Status:** ${status}`, ...(plan === undefined ? [] : [`**Plan:** [${plan}](${plan})`]), '', '## 13. Acceptance criteria', '', '**AC-001** The system shall work.', ''].join('\n');
}

function plan(status: string): string {
    return `# Plan\n\n**Status:** ${status}\n\n### T-001 — A step\n\n- [ ] **Verified (T-001):** —\n`;
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
    it('shows the groups that hold a spec, in the order In progress, Ready, Backlog, Done, each with its count as the description', async () => {
        const tree = treeOf(await modelOf(MIXED));
        expect(tree.message).toBeUndefined();
        expect(groups(tree).map((group) => [group.label, group.description])).toEqual([
            ['In progress', '3'],
            ['Ready', '1'],
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
            Ready: ['0002-planned'],
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
    it('starts In progress, Ready and Backlog expanded and Done collapsed', async () => {
        const tree = treeOf(await modelOf(MIXED));
        expect(groups(tree).map((group) => [group.label, group.collapsed])).toEqual([
            ['In progress', false],
            ['Ready', false],
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
        expect(groups(treeOf(await modelOf(MIXED))).map((group) => group.id)).toEqual(['group:inProgress', 'group:ready', 'group:backlog', 'group:done']);
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
        expect(groupOf(tree, 'In progress').children.map((row) => [row.stem.slice(0, 4), row.state])).toEqual([
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

    it('orders equal numbers in one group by path, not by stem, whatever order the model lists them in', async () => {
        const model = await modelOf({
            '.specs/backlog/0003-login.md': spec('Login', 'Draft'),
            '.specs/backlog/0003-login-page.md': spec('Login page', 'Draft'),
            '.specs/backlog/0005-alpha.md': spec('Alpha', 'Draft'),
            '.specs/backlog/0005-beta.md': spec('Beta', 'Draft'),
            '.specs/active/0004-sign.md': spec('Sign', 'In Progress', '0004-sign.plan.md'),
            '.specs/active/0004-sign.plan.md': plan('In Progress'),
            '.specs/active/0004-sign-up.md': spec('Sign up', 'In Progress', '0004-sign-up.plan.md'),
            '.specs/active/0004-sign-up.plan.md': plan('In Progress'),
        });
        const reversed: ShellModel = { ...model, lifecycle: { ...model.lifecycle, entries: [...model.lifecycle.entries].reverse() } };
        for (const given of [model, reversed]) {
            const tree = treeOf(given);
            expect(groupOf(tree, 'Backlog').children.map((row) => row.specKey)).toEqual([
                '.specs/backlog/0003-login-page.md',
                '.specs/backlog/0003-login.md',
                '.specs/backlog/0005-alpha.md',
                '.specs/backlog/0005-beta.md',
            ]);
            expect(groupOf(tree, 'In progress').children.map((row) => row.specKey)).toEqual(['.specs/active/0004-sign-up.md', '.specs/active/0004-sign.md']);
        }
    });
});

describe('0020 AC-004: the row texts', () => {
    it('the description is the step short form only, the state where there is no step, and Deprecated as before', async () => {
        const tree = treeOf(await modelOf(MIXED));
        const byStem = Object.fromEntries(rows(tree).map((row) => [row.stem, row.description]));
        expect(byStem['0004-reviewing']).toBe('/sdd-compile');
        expect(byStem['0005-stuck']).toBe('/sdd-plan');
        expect(byStem['0001-idea']).toBe('/sdd-clarify');
        expect(byStem['0006-finished']).toBe('Done');
        expect(byStem['0007-old']).toBe('Deprecated');
    });

    it('0022 AC-004: no description starts with a state name followed by " · "', async () => {
        const project = await readFixture('fs-broken');
        const trees = [treeOf(await modelOf(MIXED)), treeOf({ project, lifecycle: deriveLifecycle(project) })];
        for (const row of trees.flatMap(rows)) {
            expect(row.description, row.label).not.toMatch(/^(?:Backlog|Ready|Active|Review|Blocked|Done) · /);
        }
    });

    it('0022 AC-005: label and description of every row of the fixtures hold at most 32 characters unless the title room was raised to 12', async () => {
        const project = await readFixture('studio-0015');
        const trees = [treeOf(await modelOf(MIXED)), treeOf({ project, lifecycle: deriveLifecycle(project) })];
        for (const row of trees.flatMap(rows)) {
            const title = row.label.slice(row.label.indexOf(' ') + 1);
            expect(row.label.length + row.description.length <= 32 || title.length <= 12 + 1, row.label).toBe(true);
        }
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
        expect(row?.label).toBe('0015 Focus the…');
        expect(row?.description).toBe('/sdd-compile');
        expect(row?.accessibleLabel).toBe('0015 Focus the Studio on Visibility: No Agent Runs, a Named Next Step, Review, Verify · /sdd-compile');
    });
});

describe('0022 AC-004: the accessible label (X-05)', () => {
    it('reads number, full title, state, Deprecated, step short form and problem count in this order, each only where it applies', async () => {
        const tree = treeOf(await modelOf(MIXED));
        const byStem = Object.fromEntries(rows(tree).map((row) => [row.stem, row.accessibleLabel]));
        expect(byStem['0004-reviewing']).toBe('0004 Reviewing, Review, Verify · /sdd-compile');
        expect(byStem['0006-finished']).toBe('0006 Finished, Done');
        expect(byStem['0007-old']).toBe('0007 Old, Done, Deprecated');
    });

    it('a Problem adds its count last', async () => {
        const project = await readFixture('fs-broken');
        const row = rows(treeOf({ project, lifecycle: deriveLifecycle(project) })).find((candidate) => candidate.icon === 'warning')!;
        expect(row.accessibleLabel).toMatch(new RegExp(`^${row.label.split(' ')[0]} .+, ${row.state}(?:, [^,]+)?, 1 problem$`));
    });
});

describe('0022 AC-026: the tree takes icon and colour from the one table', () => {
    it('every state row carries the motif and the colour of STATE_LOOK, and Deprecated looks like Done', async () => {
        const tree = treeOf(await modelOf({ ...MIXED, '.specs/active/0009-ready.md': spec('Ready', 'In Progress', '0009-ready.plan.md'), '.specs/active/0009-ready.plan.md': plan('Not started') }));
        const states = new Set<string>();
        for (const row of rows(tree)) {
            const state = row.state;
            states.add(state);
            expect([row.icon, row.color], row.label).toEqual([STATE_LOOK[state].motif, STATE_LOOK[state].colour]);
        }
        expect([...states].sort()).toEqual(['Active', 'Backlog', 'Blocked', 'Done', 'Ready', 'Review']);
    });

    it('control: a Problem still overrides the look with the warning', async () => {
        const project = await readFixture('fs-broken');
        const tree = treeOf({ project, lifecycle: deriveLifecycle(project) });
        expect(rows(tree).some((row) => row.icon === 'warning' && row.color === 'problemsWarningIcon.foreground')).toBe(true);
    });
});

describe('0020 AC-005: icons and colours', () => {
    it('every state has its icon and colour', async () => {
        const tree = treeOf(await modelOf({ ...MIXED, '.specs/active/0009-ready.md': spec('Ready', 'In Progress', '0009-ready.plan.md'), '.specs/active/0009-ready.plan.md': plan('Not started') }));
        const byState = new Map(rows(tree).map((row) => [row.description === 'Deprecated' ? 'Deprecated' : row.state, [row.icon, row.color]]));
        expect(Object.fromEntries(byState)).toEqual({
            Backlog: ['list-flat', 'descriptionForeground'],
            Ready: ['pass', 'charts.blue'],
            Active: ['play', 'charts.green'],
            Review: ['eye', 'charts.orange'],
            Done: ['check', 'descriptionForeground'],
            Blocked: ['circle-slash', 'charts.red'],
            Deprecated: ['check', 'descriptionForeground'],
        });
    });

    it('a spec with a Problem carries the warning icon, keeps its state word and adds the problem count to the accessible label', async () => {
        const project = await readFixture('fs-broken');
        const tree = treeOf({ project, lifecycle: deriveLifecycle(project) });
        const broken = rows(tree).filter((row) => row.icon === 'warning');
        expect(broken.length).toBeGreaterThan(0);
        for (const row of broken) {
            expect(row.color).toBe('problemsWarningIcon.foreground');
            expect(row.accessibleLabel).toContain(`, ${row.state}`);
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
        expect(groupOf(before, 'Ready').children.map((row) => row.stem)).toEqual(['0001-a']);
        expect(groupOf(after, 'In progress').children.map((row) => row.stem)).toEqual(['0001-a']);
    });
});

describe('0020 AC-006: the tooltip', () => {
    it('a Review spec shows title, derived state, both step lines, figures, and the path, in this order, one paragraph each', async () => {
        const tree = treeOf(await modelOf(MIXED));
        const row = rows(tree).find((candidate) => candidate.stem === '0004-reviewing')!;
        expect(row.tooltip.split('\n\n')).toEqual([
            '**0004 Reviewing**',
            'Review — Plan done, waiting for review',
            'Next step: Have the result verified',
            '`/sdd-compile .specs/active/0004-reviewing.md`',
            'Then\\, after a READY verdict\\: close the spec',
            '`/sdd-lifecycle .specs/active/0004-reviewing.md`',
            'Steps 0/1 · 0%',
            '`.specs/active/0004-reviewing.md`',
        ]);
    });

    it('a state read from the file shows the state alone; a derived state adds the sentence of T-09', async () => {
        const tree = treeOf(await modelOf(MIXED));
        const lines = (stem: string) => rows(tree).find((row) => row.stem === stem)!.tooltip.split('\n\n')[1];
        expect(lines('0003-working')).toBe('Active');
        expect(lines('0002-planned')).toBe('Ready — Plan written, not started yet');
        expect(lines('0005-stuck')).toBe('Blocked — Plan or return note says Blocked');
        expect(lines('0001-idea')).toBe('Backlog');
    });

    it('a Done spec shows the rule text where no line exists, escaped, and no step lines', async () => {
        const tree = treeOf(await modelOf(MIXED));
        const row = rows(tree).find((candidate) => candidate.stem === '0006-finished')!;
        expect(row.tooltip.split('\n\n')).toEqual(['**0006 Finished**', 'Done', 'Next step: Done — no FeatherSpec step left.', '`.specs/done/0006-finished.md`']);
        expect(row.contextValue).toBe('spec');
    });

    it('a deprecated spec reads Deprecated as its state line', async () => {
        const tree = treeOf(await modelOf(MIXED));
        const row = rows(tree).find((candidate) => candidate.stem === '0007-old')!;
        expect(row.tooltip.split('\n\n')[1]).toBe('Deprecated');
    });

    it('a Problem adds one Problem line per finding with its sentence, escaped', async () => {
        const project = await readFixture('fs-broken');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const row = rows(treeOf(model)).find((candidate) => candidate.icon === 'warning')!;
        const problems = row.tooltip.split('\n\n').filter((paragraph) => paragraph.startsWith('Problem: '));
        expect(problems.length).toBe(1);
        const entry = model.lifecycle.entries.find((candidate) => candidate.key === row.specKey)!;
        const reason = entry.diagnostics.find((diagnostic) => diagnostic.tier === 'problem')!.reason;
        expect(problems[0]).toBe(`Problem: ${problemSentence(entry.diagnostics.find((diagnostic) => diagnostic.tier === 'problem')!).replace(/[!-/:-@[-`{-~]/g, (character) => `\\${character}`)}`);
        expect(reason).not.toBe('');
    });

    it('two Problems give two lines, a duplicated stem names each path', async () => {
        const tree = treeOf(await modelOf({ '.specs/backlog/0008-twin.md': spec('Twin', 'Draft'), '.specs/active/0008-twin.md': spec('Twin', 'In Progress') }));
        const twins = rows(tree).filter((row) => row.stem === '0008-twin');
        for (const twin of twins) {
            expect(twin.tooltip.split('\n\n').filter((paragraph) => paragraph.startsWith('Problem: ')).length).toBeGreaterThan(0);
            expect(twin.tooltip.endsWith(`\`${twin.specKey}\``)).toBe(true);
        }
    });

    it('Markdown characters of a title show as written, a backtick in a step line is fenced one backtick longer', async () => {
        const tree = treeOf(await modelOf({ '.specs/backlog/0001-a.md': spec('A *bold* [x](y) <b>', 'Draft'), '.specs/backlog/0002-b`c.md': spec('B', 'Draft') }));
        const [first, second] = rows(tree);
        expect(first!.tooltip.split('\n\n')[0]).toBe('**0001 A \\*bold\\* \\[x\\]\\(y\\) \\<b\\>**');
        expect(second!.tooltip).toContain('Next step: Have the spec challenged\\, then plan it\n\n``/sdd-clarify .specs/backlog/0002-b`c.md``');
    });

    it('a figure that is not available is left out, and no line is left empty', async () => {
        const tree = treeOf(await modelOf({ '.specs/backlog/0001-a.md': spec('A', 'Draft') }));
        const paragraphs = rows(tree)[0]!.tooltip.split('\n\n');
        expect(paragraphs.some((paragraph) => paragraph.startsWith('Steps') || paragraph.startsWith('Criteria'))).toBe(false);
        expect(paragraphs.every((paragraph) => paragraph.length > 0)).toBe(true);
    });

    it('the figures show steps and criteria joined by a dot, the contextValue names step and plan', async () => {
        const project = await readFixture('studio-0015');
        const model = { project, lifecycle: deriveLifecycle(project) };
        const row = rows(treeOf(model)).find((candidate) => candidate.stem === '0015-focus-on-visibility')!;
        expect(row.tooltip).toMatch(/\n\nSteps \d+\/\d+ · \d+% · Criteria 28\/30 · 93%\n\n/);
        expect(row.contextValue).toBe('spec step plan');
        expect(row.planKey).toBe('.specs/active/0015-focus-on-visibility.plan.md');
        expect(row.line).toBe('/sdd-compile .specs/active/0015-focus-on-visibility.md');
    });
});

describe('0020 AC-010: the badge', () => {
    it('counts the specs in Review and Blocked, with the singular tooltip for one', async () => {
        const tree = treeOf(await modelOf({ '.specs/active/0004-r.md': spec('R', 'In Progress', '0004-r.plan.md'), '.specs/active/0004-r.plan.md': plan('Done') }));
        expect(tree.badge).toEqual({ value: 1, tooltip: '1 spec waits for you: 1 in Review' });
    });

    it('two in Review and one Blocked read as the plural tooltip', async () => {
        const tree = treeOf(
            await modelOf({
                ...MIXED,
                '.specs/active/0008-r.md': spec('R', 'In Progress', '0008-r.plan.md'),
                '.specs/active/0008-r.plan.md': plan('Done'),
            }),
        );
        expect(tree.badge).toEqual({ value: 3, tooltip: '3 specs wait for you: 2 in Review, 1 Blocked' });
    });

    it('one Blocked alone leaves out the zero Review part', async () => {
        const tree = treeOf(await modelOf({ '.specs/active/0005-s.md': spec('S', 'In Progress', '0005-s.plan.md'), '.specs/active/0005-s.plan.md': plan('Blocked') }));
        expect(tree.badge).toEqual({ value: 1, tooltip: '1 spec waits for you: 1 Blocked' });
    });

    it('zero waiting specs give no badge; neither does a message instead of rows', async () => {
        expect(treeOf(await modelOf({ '.specs/backlog/0001-a.md': spec('A', 'Draft') })).badge).toBeUndefined();
        expect(treeOf(await modelOf({})).badge).toBeUndefined();
        expect(buildSpecTree({ projectActive: true, projectName: 'demo', projectCount: 1, state: { id: 'S5', reason: { cause: 'discovery', message: 'x' } }, model: await modelOf(MIXED) }).badge).toBeUndefined();
    });
});

describe('0020 AC-011: the view description', () => {
    it('shows the project name only for two or more projects', async () => {
        const model = await modelOf(MIXED);
        expect(treeOf(model, { projectCount: 1 }).description).toBeUndefined();
        expect(treeOf(model, { projectCount: 2 }).description).toBe('demo');
        expect(treeOf(model, { projectCount: 3 }).description).toBe('demo');
    });
});

describe('0020 AC-012: the states of the view', () => {
    const discovery: PanelState = { id: 'S5', reason: { cause: 'discovery', message: 'x' } };

    it('a loaded model keeps its groups while Refresh or Retry re-reads (S4)', async () => {
        const tree = buildSpecTree({ projectActive: true, projectName: 'demo', projectCount: 1, state: { id: 'S4' }, model: await modelOf(MIXED) });
        expect(tree.message).toBeUndefined();
        expect(groups(tree)).toHaveLength(4);
    });

    it('an active project without a loaded model shows Loading project…', () => {
        const tree = buildSpecTree({ projectActive: true, projectName: 'demo', projectCount: 1, state: { id: 'S4' }, model: undefined });
        expect(tree).toEqual({ message: 'Loading project…', items: [] });
        expect(buildSpecTree({ projectActive: true, projectName: 'demo', projectCount: 1, state: undefined, model: undefined })).toEqual({ message: 'Loading project…', items: [] });
    });

    it('S5 for discovery or listing with a project active shows its line and the rows Show output and Retry, rows of an old model gone', async () => {
        const tree = buildSpecTree({ projectActive: true, projectName: 'demo', projectCount: 1, state: discovery, model: await modelOf(MIXED) });
        expect(tree.message).toBe('The project could not be loaded: ' + tree.message?.split(': ')[1]);
        expect(tree.items.map((item) => (item.kind === 'action' ? item.label : item.kind))).toEqual(['Show output', 'Retry']);
        const listing = buildSpecTree({ projectActive: true, projectName: 'demo', projectCount: 1, state: { id: 'S5', reason: { cause: 'listing', folder: '.specs', reason: 'denied' } }, model: undefined });
        expect(listing.items.map((item) => (item.kind === 'action' ? item.label : item.kind))).toEqual(['Show output', 'Retry']);
    });

    it('S5 caused by the protocol shows what the rows say: groups with a model', async () => {
        const tree = buildSpecTree({ projectActive: true, projectName: 'demo', projectCount: 1, state: { id: 'S5', reason: { cause: 'protocol' } }, model: await modelOf(MIXED) });
        expect(groups(tree)).toHaveLength(4);
    });

    it('zero specs show the message of the Overview and no rows or badge', async () => {
        const tree = treeOf(await modelOf({}));
        expect(tree).toEqual({ message: 'No specs yet. Start with /sdd-specify', items: [] });
    });

    it('S6 and Restricted Mode do not change the rows', async () => {
        const tree = buildSpecTree({ projectActive: true, projectName: 'demo', projectCount: 1, state: { id: 'S6' }, model: await modelOf(MIXED) });
        expect(groups(tree)).toHaveLength(4);
    });
});

describe('AC-003: the Activity Bar tree model', () => {
    const none = { projectActive: false, projectName: undefined, projectCount: 0, model: undefined };
    const cases: [string, PanelState, string, string[]][] = [
        ['AC-011 S1', { id: 'S1' }, 'Open a folder to use FeatherSpec Studio.', ['Open Folder']],
        ['AC-013 S3', { id: 'S3' }, 'Several FeatherSpec projects found. Select one to continue.', ['Select project']],
        ['S4', { id: 'S4' }, 'Loading project…', []],
        ['S5', { id: 'S5', reason: { cause: 'listing', folder: '.specs', reason: 'denied' } }, 'The project could not be loaded: the lifecycle folders of .specs/ could not be listed (.specs: denied).', ['Show output', 'Retry']],
        ['AC-026 S8', { id: 'S8', name: 'demo', canSelect: true }, 'FeatherSpec project demo was not found.', ['Select project', 'Refresh']],
        [
            'AC-027 S9',
            { id: 'S9', folders: [{ folder: 'a', markers: ['.specs/ directory'] }, { folder: 'b', markers: ['AGENTS.md with a FeatherSpecVersion: line'] }] },
            'FeatherSpec project incomplete: a has no .specs/ directory. FeatherSpec project incomplete: b has no AGENTS.md with a FeatherSpecVersion: line.',
            ['Set up FeatherSpec', 'Open setup guide', 'Refresh'],
        ],
        [
            'AC-015 S9 setup-pending',
            { id: 'S9', folders: [{ folder: 'a', markers: [], setupPending: true }] },
            'FeatherSpec setup not finished: a has files to merge.',
            ['Copy merge prompt', 'Set up FeatherSpec', 'Open setup guide', 'Refresh'],
        ],
    ];

    it.each(cases)('without a project, %s shows the state text as the message and its actions as items', (_name, state, message, labels) => {
        const model = buildSpecTree({ ...none, state });
        expect(model.message).toBe(message);
        expect(model.items.map((item) => (item.kind === 'action' ? item.label : item.kind))).toEqual(labels);
        expect(model.items.every((item) => item.kind === 'action')).toBe(true);
    });

    it('AC-001: S2 shows no message and no items, so that VS Code draws the welcome content with the Set up FeatherSpec button', () => {
        expect(buildSpecTree({ ...none, state: { id: 'S2' } })).toEqual({ message: undefined, items: [], welcome: 'S2' });
    });

    it('AC-001: negative control, no other state asks for the welcome content', async () => {
        for (const state of [{ id: 'S1' }, { id: 'S3' }, { id: 'S4' }, { id: 'S9', folders: [] }] as PanelState[]) {
            expect(buildSpecTree({ ...none, state }).welcome).toBeUndefined();
        }
        expect(buildSpecTree({ projectActive: true, projectName: 'demo', projectCount: 1, state: { id: 'S2' }, model: await modelOf(MIXED) }).welcome).toBeUndefined();
    });

    it('never shows S6 or the Restricted Mode note (they appear in the panel only)', () => {
        expect(buildSpecTree({ ...none, state: { id: 'S6' } })).toEqual({ message: undefined, items: [] });
    });

    it('without a project and without a state there is nothing to show', () => {
        expect(buildSpecTree({ ...none, state: undefined })).toEqual({ message: undefined, items: [] });
    });
});

describe('0022 AC-006: the groups and their Problem hint', () => {
    const BAD_DONE = { ...MIXED, '.specs/done/0008-bad.md': spec('Bad', 'In Progress') };

    it('a group holding a spec with a Problem carries the count and the problem count, the warning icon, and the sentence as tooltip and accessible label, collapsed or not', async () => {
        const tree = treeOf(await modelOf(BAD_DONE));
        const withHint = groups(tree).filter((group) => group.icon !== undefined);
        expect(withHint.length).toBeGreaterThan(0);
        for (const group of withHint) {
            const problems = Number(/ · (\d+) problems?$/.exec(group.description)?.[1] ?? 1);
            const count = Number(group.description.split(' ')[0]);
            expect(group.description).toBe(`${count} · ${problems === 1 ? '1 problem' : `${problems} problems`}`);
            expect([group.icon, group.color]).toEqual(['warning', 'problemsWarningIcon.foreground']);
            const label = `${group.label}: ${count === 1 ? '1 spec' : `${count} specs`} · ${problems === 1 ? '1 problem' : `${problems} problems`}`;
            expect([group.tooltip, group.accessibleLabel]).toEqual([label, label]);
        }
        expect(withHint.some((group) => group.collapsed)).toBe(true);
    });

    it('a group without a Problem shows its count alone and no icon, colour, tooltip or accessible label', async () => {
        const tree = treeOf(await modelOf(MIXED));
        for (const group of groups(tree)) {
            expect(group.description).toBe(String(group.children.length));
            expect([group.icon, group.color, group.tooltip, group.accessibleLabel]).toEqual([undefined, undefined, undefined, undefined]);
        }
    });

    it('the group ID holds neither count', async () => {
        const plain = groups(treeOf(await modelOf(MIXED))).map((group) => group.id);
        const hinted = groups(treeOf(await modelOf(BAD_DONE))).map((group) => group.id);
        expect(hinted.filter((id) => plain.includes(id))).toEqual(plain);
        for (const id of [...plain, ...hinted]) {
            expect(id).not.toMatch(/\d/);
        }
    });

    it('the plural and singular forms follow X-02 and X-03 at 1 and at 2', async () => {
        const one = groups(treeOf(await modelOf({ '.specs/done/0008-bad.md': spec('Bad', 'In Progress') })));
        expect(one.map((group) => group.accessibleLabel).filter((label) => label !== undefined)[0]).toMatch(/: 1 spec · 1 problem$/);
        const two = groups(treeOf(await modelOf({ '.specs/done/0008-bad.md': spec('Bad', 'In Progress'), '.specs/done/0009-bad.md': spec('Bad two', 'In Progress') })));
        expect(two.map((group) => group.accessibleLabel).filter((label) => label !== undefined)[0]).toMatch(/: 2 specs · 2 problems$/);
    });
});

describe('0022 AC-007: one model, one Ready count', () => {
    it('the Ready group, the Overview Ready figure and the Board Ready column hold the same number, and no group reads Up next', async () => {
        const model = await modelOf(MIXED);
        const tree = treeOf(model);
        const figures = projectFigures(model);
        const overview = figures.kind === 'counts' ? figures.states.find((state) => state.state === 'Ready')!.count : -1;
        const board = arrangeBoard(buildCards(model.project, model.lifecycle), {}, 'number').find((column) => column.state === 'Ready')!.count;
        expect(Number(groupOf(tree, 'Ready').description)).toBe(overview);
        expect(overview).toBe(board);
        expect(groups(tree).map((group) => group.label)).not.toContain('Up next');
        expect(JSON.stringify(tree)).not.toMatch(/Up next|upNext/);
    });
});

