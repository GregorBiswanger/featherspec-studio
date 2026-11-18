import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createModelSource } from '../shell/modelSource';
import { addProject, createShellWorld, SPEC_HEADER } from '../shell/testing/world';
import { createProjectLine } from './projectLine';
import { createStatusEntry } from './statusEntry';
import type { SpecInput } from '../overview/testing/projects';
import type { StepPickItem, StepUiPort } from '../ports/copyNextStep';
import type { ClipboardPort } from '../ports/board';
import { createCopyNextStep, type CopyNextStep } from './copyNextStep';
import { createEntryWorld, type EntryWorld } from './testing/entryWorld';

interface Fakes {
    written: string[];
    failing: boolean;
    asked: Array<{ items: StepPickItem[]; placeholder: string }>;
    informed: Array<{ text: string; action: string }>;
    warned: string[];
    calls: string[];
    pickAnswer: (items: readonly StepPickItem[]) => StepPickItem | undefined;
    informAnswer: string | undefined;
}

let world: EntryWorld;
let fakes: Fakes;
let command: CopyNextStep;

afterEach(() => world.dispose());

function setup(): void {
    world = createEntryWorld();
    fakes = { written: [], failing: false, asked: [], informed: [], warned: [], calls: [], pickAnswer: () => undefined, informAnswer: undefined };
    const clipboard: ClipboardPort = {
        async writeText(text) {
            if (fakes.failing) {
                throw new Error('no clipboard');
            }
            fakes.written.push(text);
        },
    };
    const ui: StepUiPort = {
        async pick(items, placeholder) {
            fakes.asked.push({ items: [...items], placeholder });
            return fakes.pickAnswer(items);
        },
        async inform(text, action) {
            fakes.informed.push({ text, action });
            return fakes.informAnswer;
        },
        warn: (text) => void fakes.warned.push(text),
    };
    command = createCopyNextStep({
        entry: world.entry,
        clipboard,
        ui,
        actions: {
            selectProject: async () => void fakes.calls.push('selectProject'),
            openStudio: async () => void fakes.calls.push('openStudio'),
        },
    });
}

async function ready(specs: readonly SpecInput[], extra: Record<string, string> = {}): Promise<void> {
    setup();
    await world.setSpecs(specs, extra);
    world.setProjects([{ name: 'proj' }], 'proj');
}

const BLOCKED_ACTIVE: SpecInput[] = [
    { number: '0012', kind: 'Active' },
    { number: '0020', kind: 'Blocked' },
];
const BLOCKED_LINE = '/sdd-plan .specs/active/0020-thing.md';

describe('0017 AC-019: with a current spec the command copies without asking', () => {
    it('copies the full first line, asks nothing and shows the feedback', async () => {
        await ready(BLOCKED_ACTIVE);
        await command.run();
        expect(fakes.written).toEqual([BLOCKED_LINE]);
        expect(fakes.asked).toEqual([]);
        expect(fakes.informed).toEqual([]);
        expect(fakes.calls).toEqual([]);
        expect(world.text()).toBe('$(check) Copied');
    });

    it('copies only the first line when the step has a second one', async () => {
        await ready([{ number: '0012', kind: 'Active' }], {
            '.specs/active/0012-thing.plan.md': '# Plan\n\n**Spec:** [0012-thing.md](0012-thing.md)\n**Status:** In Progress\n\n## Steps\n\n### T-001 — A\n\n- [ ] **Verified (T-001):** —\n',
        });
        await command.run();
        expect(fakes.written).toEqual(['Implement T-001 of .specs/active/0012-thing.plan.md']);
    });

    it('a selected spec is the current spec of the command too', async () => {
        await ready([...BLOCKED_ACTIVE, { number: '0007', kind: 'Ready' }]);
        world.select({ stem: '0007-thing' });
        await command.run();
        expect(fakes.written).toEqual(['Implement .specs/backlog/0007-thing.plan.md']);
    });
});

describe('0017 AC-016: the feedback lasts 2000 ms', () => {
    it('shows Copied for 2000 ms, then the text of the underlying state; the tooltip and the command stay', async () => {
        await ready(BLOCKED_ACTIVE);
        const before = world.last();
        await command.run();
        const during = world.last();
        expect(during).toMatchObject({ text: '$(check) Copied', accessibleLabel: 'Copied', command: 'copyNextStep' });
        expect(during !== 'hidden' && before !== 'hidden' && before !== undefined && during !== undefined ? during.tooltip : undefined).toEqual(before !== 'hidden' && before !== undefined ? before.tooltip : undefined);
        world.clock.advance(1999);
        expect(world.text()).toBe('$(check) Copied');
        world.clock.advance(1);
        expect(world.text()).toBe('$(checklist) 0020 · Blocked · /sdd-plan');
        expect(world.clock.pendingTimers()).toBe(0);
    });

    it('a failed copy shows Could not copy, warns once with the sentence and restores after 2000 ms', async () => {
        await ready(BLOCKED_ACTIVE);
        fakes.failing = true;
        await command.run();
        expect(world.last()).toMatchObject({ text: '$(warning) Could not copy', accessibleLabel: 'Could not copy' });
        expect(fakes.warned).toEqual(['Could not copy to the clipboard.']);
        expect(fakes.written).toEqual([]);
        world.clock.advance(2000);
        expect(world.text()).toBe('$(checklist) 0020 · Blocked · /sdd-plan');
    });

    it('a second copy within 2 s restarts the time', async () => {
        await ready(BLOCKED_ACTIVE);
        await command.run();
        world.clock.advance(1500);
        await command.run();
        world.clock.advance(1500);
        expect(world.text()).toBe('$(check) Copied');
        world.clock.advance(500);
        expect(world.text()).toBe('$(checklist) 0020 · Blocked · /sdd-plan');
    });

    it('a change during the 2 s shows when they end, and the command copies the line of the changed state', async () => {
        await ready(BLOCKED_ACTIVE);
        await command.run();
        await world.setSpecs([{ number: '0012', kind: 'Active' }, { number: '0020', kind: 'Review' }]);
        expect(world.text()).toBe('$(check) Copied');
        world.clock.advance(2000);
        expect(world.text()).toBe('$(checklist) 0020 · Review · /sdd-compile');
        await command.run();
        expect(fakes.written.at(-1)).toBe('/sdd-compile .specs/active/0020-thing.md');
    });

    it('W2: a successful copy shows no warning and no warning text', async () => {
        await ready(BLOCKED_ACTIVE);
        await command.run();
        expect(fakes.warned).toEqual([]);
        expect(world.last()).toMatchObject({ text: '$(check) Copied', accessibleLabel: 'Copied' });
    });

    it('F8: a failure within 2 s after a success replaces the Copied text, warns once and restores 2000 ms after the failure', async () => {
        await ready(BLOCKED_ACTIVE);
        await command.run();
        world.clock.advance(1000);
        fakes.failing = true;
        await command.run();
        expect(world.last()).toMatchObject({ text: '$(warning) Could not copy', accessibleLabel: 'Could not copy' });
        expect(fakes.warned).toEqual(['Could not copy to the clipboard.']);
        world.clock.advance(1999);
        expect(world.text()).toBe('$(warning) Could not copy');
        world.clock.advance(1);
        expect(world.text()).toBe('$(checklist) 0020 · Blocked · /sdd-plan');
    });

    it('a copy that succeeds after a failure replaces the warning text', async () => {
        await ready(BLOCKED_ACTIVE);
        fakes.failing = true;
        await command.run();
        fakes.failing = false;
        await command.run();
        expect(world.text()).toBe('$(check) Copied');
    });
});

describe('0017 AC-020: no current spec, the quick pick', () => {
    const MIXED: SpecInput[] = [
        { number: '0008', kind: 'Backlog' },
        { number: '0007', kind: 'Ready' },
        { number: '0003', kind: 'Backlog', title: null },
    ];

    it('offers every spec with a step, Ready before Backlog then by number, with label, description and placeholder', async () => {
        await ready(MIXED);
        await command.run();
        expect(fakes.asked).toHaveLength(1);
        expect(fakes.asked[0]?.placeholder).toBe('Select a spec to copy its next step');
        expect(fakes.asked[0]?.items).toEqual([
            { key: '.specs/backlog/0007-thing.md', label: '0007 Thing 0007', description: 'Ready · Build · Implement' },
            { key: '.specs/backlog/0003-thing.md', label: '0003-thing', description: 'Backlog · Challenge · /sdd-clarify' },
            { key: '.specs/backlog/0008-thing.md', label: '0008 Thing 0008', description: 'Backlog · Challenge · /sdd-clarify' },
        ]);
        expect(fakes.written).toEqual([]);
    });

    it('picking copies that spec\'s full first line with the same feedback', async () => {
        await ready(MIXED);
        fakes.pickAnswer = (items) => items.find((item) => item.key.includes('0008'));
        await command.run();
        expect(fakes.written).toEqual(['/sdd-clarify .specs/backlog/0008-thing.md']);
        expect(world.text()).toBe('$(check) Copied');
    });

    it('cancelling copies nothing and shows no feedback', async () => {
        await ready(MIXED);
        const shownBefore = world.shown.length;
        await command.run();
        expect(fakes.written).toEqual([]);
        expect(fakes.warned).toEqual([]);
        expect(world.shown).toHaveLength(shownBefore);
    });

    it('with no spec that has a step: the message with "Copy", which copies /sdd-specify; dismissing copies nothing', async () => {
        await ready([{ number: '0003', kind: 'Done' }]);
        await command.run();
        expect(fakes.informed).toEqual([{ text: 'No spec has a next step to copy. Start the next spec with /sdd-specify', action: 'Copy' }]);
        expect(fakes.asked).toEqual([]);
        expect(fakes.written).toEqual([]);
        fakes.informAnswer = 'Copy';
        await command.run();
        expect(fakes.written).toEqual(['/sdd-specify']);
        expect(world.text()).toBe('$(check) Copied');
    });

    it('while the specs are not read (S4 or S5) it runs "Open" instead of copying or asking', async () => {
        await ready(BLOCKED_ACTIVE);
        world.setPanelState({ id: 'S4' });
        await command.run();
        world.setPanelState({ id: 'S5', reason: 'listing-failed' as never });
        await command.run();
        expect(fakes.calls).toEqual(['openStudio', 'openStudio']);
        expect(fakes.written).toEqual([]);
        expect(fakes.asked).toEqual([]);
    });
});

describe('0017 AC-021: without an active project the command is "Select Project"', () => {
    it('runs the select action and copies nothing, also while specs are loaded', async () => {
        setup();
        await world.setSpecs(BLOCKED_ACTIVE);
        await command.run();
        world.setProjects([{ name: 'proj' }], 'proj');
        world.clearActive();
        await command.run();
        expect(fakes.calls).toEqual(['selectProject', 'selectProject']);
        expect(fakes.written).toEqual([]);
        expect(fakes.asked).toEqual([]);
    });
});

describe('0017 AC-022: Restricted Mode and reader windows change nothing', () => {
    async function run(trusted: boolean): Promise<{ text: string | undefined; written: string[]; picked: number }> {
        const shellWorld = createShellWorld({ trusted });
        try {
            addProject(shellWorld, 'proj', { '.specs/active/0001-a.md': SPEC_HEADER('In Progress'), '.specs/backlog/0002-b.md': SPEC_HEADER('Draft') });
            const line = createProjectLine();
            shellWorld.host.statusBar.show = (text) => line.show(text, 'select');
            shellWorld.host.statusBar.hide = () => line.hide();
            const shown: string[] = [];
            const entry = createStatusEntry({
                line,
                discovery: shellWorld.controller,
                shell: shellWorld.service,
                source: createModelSource(shellWorld.repository),
                item: { show: (view) => void shown.push(view.text), hide: () => void shown.push('hidden') },
                clock: shellWorld.host.clock,
                sameRoot: (first, second) => first === second,
            });
            await shellWorld.controller.start();
            await shellWorld.settle();
            const written: string[] = [];
            let picked = 0;
            const command = createCopyNextStep({
                entry,
                clipboard: { writeText: async (text) => void written.push(text) },
                ui: {
                    pick: async () => void (picked += 1),
                    inform: async () => undefined,
                    warn: () => undefined,
                },
                actions: { selectProject: async () => undefined, openStudio: async () => undefined },
            });
            await command.run();
            entry.dispose();
            return { text: shown.at(-1), written, picked };
        } finally {
            shellWorld.dispose();
        }
    }

    it('with trust off the entry and the command give the same results as with trust on', async () => {
        const trusted = await run(true);
        const restricted = await run(false);
        expect(restricted).toEqual(trusted);
        expect(trusted.written).toEqual(['/sdd-lifecycle .specs/active/0001-a.md']);
        expect(trusted.text).toBe('$(check) Copied');
    });

    it('the behaviour takes no trust, no store and no reader flag as a dependency', () => {
        const source = readFileSync(path.join(__dirname, 'copyNextStep.ts'), 'utf8') + readFileSync(path.join(__dirname, 'statusEntry.ts'), 'utf8');
        expect(source).not.toMatch(/trust|isTrusted|reader|store/i);
    });
});

describe('0020 AC-007: copy(line) is the tree\'s way to the same feedback', () => {
    it('puts the line on the clipboard and shows Copied, selecting nothing', async () => {
        await ready(BLOCKED_ACTIVE);
        await command.copy('/sdd-plan .specs/active/0020-thing.md');
        expect(fakes.written).toEqual(['/sdd-plan .specs/active/0020-thing.md']);
        expect(world.text()).toBe('$(check) Copied');
        expect(fakes.warned).toEqual([]);
        expect(fakes.calls).toEqual([]);
    });

    it('a failing clipboard shows Could not copy and the warning', async () => {
        await ready(BLOCKED_ACTIVE);
        fakes.failing = true;
        await command.copy('/sdd-plan x');
        expect(fakes.written).toEqual([]);
        expect(world.text()).toBe('$(warning) Could not copy');
        expect(fakes.warned).toEqual(['Could not copy to the clipboard.']);
    });
});
