import { afterEach, describe, expect, it } from 'vitest';
import type { StatusEntryView } from '../ports/copyNextStep';
import { createEntryWorld, type EntryWorld, type FakeProject } from './testing/entryWorld';
import { escapeMarkdown } from './entryView';

let world: EntryWorld;

afterEach(() => world.dispose());

function view(): StatusEntryView {
    const last = world.last();
    if (last === undefined || last === 'hidden') {
        throw new Error('the entry is not shown');
    }
    return last;
}

function markdown(): string {
    const tooltip = view().tooltip;
    if (!('markdown' in tooltip)) {
        throw new Error('the tooltip is not Markdown');
    }
    return tooltip.markdown;
}

async function ready(specs: Parameters<EntryWorld['setSpecs']>[0], projects: FakeProject[] = [{ name: 'proj' }], extra: Record<string, string> = {}): Promise<void> {
    world = createEntryWorld();
    await world.setSpecs(specs, extra);
    world.setProjects(projects, 'proj');
}

const OPEN_LINK = '[Open Studio](command:featherspec-studio.open)';
const SWITCH_LINK = '[Switch project](command:featherspec-studio.selectProject)';

describe('0017 AC-013: the text names the current spec', () => {
    it('no selection: Review 0015, Active 0012 and Blocked 0020 give 0020 · Blocked · /sdd-plan', async () => {
        await ready([
            { number: '0015', kind: 'Review' },
            { number: '0012', kind: 'Active' },
            { number: '0020', kind: 'Blocked' },
        ]);
        expect(view().text).toBe('$(checklist) 0020 · Blocked · /sdd-plan');
        expect(view().command).toBe('copyNextStep');
    });

    it('a selected Done spec gives the same entry; a selected spec with a step wins; a selection without one falls back', async () => {
        await ready([
            { number: '0015', kind: 'Review' },
            { number: '0020', kind: 'Blocked' },
            { number: '0003', kind: 'Done' },
            { number: '0007', kind: 'Ready' },
        ]);
        world.select({ stem: '0003-thing' });
        expect(world.text()).toBe('$(checklist) 0020 · Blocked · /sdd-plan');
        world.select({ stem: '0007-thing' });
        expect(world.text()).toBe('$(checklist) 0007 · Ready · /sdd-plan');
        world.select(undefined);
        expect(world.text()).toBe('$(checklist) 0020 · Blocked · /sdd-plan');
    });
});

describe('0017 AC-014: text, tooltip and accessible label of the current spec', () => {
    it('the tooltip reads exactly: header, the full line, the project line, the click sentence, the links', async () => {
        await ready([{ number: '0020', kind: 'Blocked' }]);
        expect(markdown()).toBe(
            [
                '**0020 · Blocked** Thing 0020',
                'Find out what blocks',
                '\\/sdd\\-plan \\.specs\\/active\\/0020\\-thing\\.md',
                'proj · FeatherSpec 1\\.10\\.0',
                'Click to copy the next step\\.',
                OPEN_LINK,
            ].join('\n\n'),
        );
    });

    it('0021 AC-007: each line shows its intent first and its prompt after it, escaped', async () => {
        await ready([{ number: '0012', kind: 'Active' }], [{ name: 'proj' }], {
            '.specs/active/0012-thing.plan.md': '# Plan\n\n**Spec:** [0012-thing.md](0012-thing.md)\n**Status:** In Progress\n\n## Steps\n\n### T-001 — A\n\n- [ ] **Verified (T-001):** —\n',
        });
        const lines = markdown().split('\n\n');
        const escape = (text: string): string => text.replace(/[!-/:-@[-`{-~]/g, (character) => `\\${character}`);
        expect(lines.slice(1, 5)).toEqual([
            escape('Continue with T-001 A'),
            escape('Implement T-001 of .specs/active/0012-thing.plan.md'),
            escape('Or: not sure where it stands? Let the agent report first'),
            escape('/sdd-plan .specs/active/0012-thing.md'),
        ]);
    });

    it('the accessible label is the text without icon, with commas, then the click sentence; no Markdown, no link', async () => {
        await ready([{ number: '0020', kind: 'Blocked' }]);
        expect(view().accessibleLabel).toBe('0020, Blocked, /sdd-plan. Click to copy the next step.');
        expect(view().accessibleLabel).not.toMatch(/\[|\]|\*\*|command:|\$\(/);
    });
});

describe('0017 AC-015: no current spec', () => {
    it('Ready specs only: "FeatherSpec · n ready" with the pick sentence', async () => {
        await ready([
            { number: '0001', kind: 'Ready' },
            { number: '0002', kind: 'Ready' },
            { number: '0003', kind: 'Backlog' },
        ]);
        expect(view().text).toBe('$(checklist) FeatherSpec · 2 ready');
        expect(view().accessibleLabel).toBe('FeatherSpec, 2 ready. Nothing in progress. Click to pick a spec and copy its next step.');
        expect(markdown()).toBe(['proj · FeatherSpec 1\\.10\\.0', 'Nothing in progress\\. Click to pick a spec and copy its next step\\.', OPEN_LINK].join('\n\n'));
        expect(view().command).toBe('copyNextStep');
    });

    it('no Ready spec: "FeatherSpec" alone; with no spec at all too', async () => {
        await ready([{ number: '0003', kind: 'Backlog' }]);
        expect(view().text).toBe('$(checklist) FeatherSpec');
        expect(view().accessibleLabel).toBe('FeatherSpec. Nothing in progress. Click to pick a spec and copy its next step.');
        await ready([]);
        expect(view().text).toBe('$(checklist) FeatherSpec');
    });

    it('while the panel state is S4 or S5 the specs are not read: "FeatherSpec" with "Click to open the Studio."', async () => {
        await ready([{ number: '0020', kind: 'Blocked' }]);
        for (const state of [{ id: 'S4' as const }, { id: 'S5' as const, reason: 'listing-failed' as never }]) {
            world.setPanelState(state);
            expect(view().text).toBe('$(checklist) FeatherSpec');
            expect(view().accessibleLabel).toBe('FeatherSpec. Click to open the Studio.');
            expect(markdown()).toBe(['proj · FeatherSpec 1\\.10\\.0', 'Click to open the Studio\\.', OPEN_LINK].join('\n\n'));
            expect(view().command).toBe('copyNextStep');
        }
        world.setPanelState(undefined);
        expect(view().text).toBe('$(checklist) 0020 · Blocked · /sdd-plan');
    });

    it('C13: a model of another project root is not the active project\'s: the specs are not read', async () => {
        await ready([{ number: '0020', kind: 'Blocked' }]);
        expect(view().text).toBe('$(checklist) 0020 · Blocked · /sdd-plan');
        const loaded = world.source.current();
        if (loaded === undefined) {
            throw new Error('no model');
        }
        world.setModel({ ...loaded, project: { ...loaded.project, root: `${loaded.project.root}-elsewhere` } });
        expect(view().text).toBe('$(checklist) FeatherSpec');
        expect(view().accessibleLabel).toBe('FeatherSpec. Click to open the Studio.');
    });

    it('no loaded model reads as specs not read', () => {
        world = createEntryWorld();
        world.setProjects([{ name: 'proj' }], 'proj');
        expect(view().text).toBe('$(checklist) FeatherSpec');
        expect(view().accessibleLabel).toBe('FeatherSpec. Click to open the Studio.');
    });
});

describe('0017 AC-017: the project pick and the project line', () => {
    it('"Switch project" shows only while two or more projects are reported (negative control: one project)', async () => {
        await ready([{ number: '0020', kind: 'Blocked' }], [{ name: 'proj' }, { name: 'other', root: 'other' }]);
        expect(markdown().endsWith(`${OPEN_LINK} · ${SWITCH_LINK}`)).toBe(true);
        await ready([{ number: '0020', kind: 'Blocked' }], [{ name: 'proj' }]);
        expect(markdown()).not.toContain('Switch project');
        expect(markdown().endsWith(OPEN_LINK)).toBe(true);
    });

    it('P3: folders that are no project (incomplete, not a project) are not counted for "Switch project"', async () => {
        await ready([{ number: '0020', kind: 'Blocked' }], [{ name: 'proj' }, { name: 'half', root: 'half', verdict: 'incomplete' }, { name: 'plain', root: 'plain', verdict: 'not-a-project' }]);
        expect(markdown()).not.toContain('Switch project');
        expect(markdown().endsWith(OPEN_LINK)).toBe(true);
        await ready([{ number: '0020', kind: 'Blocked' }], [{ name: 'proj' }, { name: 'half', root: 'half', verdict: 'incomplete' }, { name: 'second', root: 'second' }]);
        expect(markdown().endsWith(`${OPEN_LINK} · ${SWITCH_LINK}`)).toBe(true);
    });

    it('with an active project no text, tooltip or command opens the project pick', async () => {
        await ready([{ number: '0020', kind: 'Blocked' }], [{ name: 'proj' }, { name: 'other', root: 'other' }]);
        for (const state of [undefined, { id: 'S4' as const }]) {
            world.setPanelState(state);
            expect(view().command).toBe('copyNextStep');
        }
        await ready([], [{ name: 'proj' }]);
        expect(view().command).toBe('copyNextStep');
    });

    it('without an active project the line passes through with the plain tooltip and the select command', () => {
        world = createEntryWorld();
        world.line.show('Select FeatherSpec project', 'select');
        expect(world.last()).toEqual({ text: 'Select FeatherSpec project', tooltip: { plain: 'FeatherSpec Studio: select the active project' }, command: 'selectProject' });
        world.line.show('FeatherSpec project not found', 'select');
        expect(world.last()).toEqual({ text: 'FeatherSpec project not found', tooltip: { plain: 'FeatherSpec Studio: select the active project' }, command: 'selectProject' });
        expect(view().accessibleLabel).toBeUndefined();
        world.line.hide();
        expect(world.last()).toBe('hidden');
    });

    it('the project line the discovery reports while a project is active does not show as the text', async () => {
        await ready([{ number: '0020', kind: 'Blocked' }]);
        expect(world.line.current()).toEqual({ visible: true, text: 'FeatherSpec: proj (1.10.0)' });
        expect(world.shown.every((entry) => entry === 'hidden' || !entry.text.includes('FeatherSpec: proj'))).toBe(true);
    });

    it('dropping the active project returns to the line without a Markdown tooltip', async () => {
        await ready([{ number: '0020', kind: 'Blocked' }]);
        world.clearActive();
        expect(view().command).toBe('selectProject');
        expect(view().tooltip).toEqual({ plain: 'FeatherSpec Studio: select the active project' });
    });
});

describe('0017 AC-018: a change shows at once, with no timer', () => {
    it('a selection change, a state change and a step change show right after the notification', async () => {
        await ready([
            { number: '0007', kind: 'Ready' },
            { number: '0020', kind: 'Backlog' },
        ]);
        expect(world.text()).toBe('$(checklist) FeatherSpec · 1 ready');
        world.select({ stem: '0020-thing' });
        expect(world.text()).toBe('$(checklist) 0020 · Backlog · /sdd-clarify');
        await world.setSpecs([
            { number: '0007', kind: 'Ready' },
            { number: '0020', kind: 'Review' },
        ]);
        expect(world.text()).toBe('$(checklist) 0020 · Review · /sdd-compile');
        await world.setSpecs([{ number: '0007', kind: 'Ready' }, { number: '0020', kind: 'Blocked' }]);
        expect(world.text()).toBe('$(checklist) 0020 · Blocked · /sdd-plan');
    });

    it('a notification that changes nothing shows nothing again', async () => {
        await ready([{ number: '0020', kind: 'Blocked' }]);
        const before = world.shown.length;
        world.select(undefined);
        world.setPanelState(undefined);
        expect(world.shown).toHaveLength(before);
    });
});

describe('0017 AC-014: text from a file cannot become a link, a style or a command', () => {
    it('a hostile title and project name stay text; only the two own links are links (control)', async () => {
        const title = '[click](command:evil.cmd) **bold** <img src=x> `code`';
        world = createEntryWorld();
        await world.setSpecs([{ number: '0020', kind: 'Blocked', title }]);
        world.setProjects([{ name: '[p](command:evil.p)' }, { name: 'other', root: 'other' }], '[p](command:evil.p)');
        const text = markdown();
        expect(text).not.toContain('[click](');
        expect(text).not.toContain('[p](');
        expect(text).toContain(escapeMarkdown(title));
        expect(text.match(/\]\(command:/g)).toHaveLength(2);
        expect(text).toContain(OPEN_LINK);
        expect(text).toContain(SWITCH_LINK);
        expect(text.match(/\*\*/g)).toHaveLength(2);
    });

    it('escapeMarkdown escapes every ASCII punctuation character and folds line breaks', () => {
        const punctuation = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
        expect(escapeMarkdown(punctuation)).toBe([...punctuation].map((character) => `\\${character}`).join(''));
        expect(escapeMarkdown('a\r\nb')).toBe('a b');
        expect(escapeMarkdown('plain text 123')).toBe('plain text 123');
    });
});
