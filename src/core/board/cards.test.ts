import { describe, expect, it } from 'vitest';
import { deriveLifecycle } from '../lifecycle/deriveLifecycle';
import { noteText, planText, readFixture, readMemory, specText } from '../lifecycle/testing/projects';
import { buildBanner, buildCards } from './cards';

const LINKED = '[0001-a.plan.md](0001-a.plan.md)';

async function cardsOf(files: Record<string, string>) {
    const project = await readMemory(files);
    const lifecycle = deriveLifecycle(project);
    return { cards: buildCards(project, lifecycle), banner: buildBanner(project, lifecycle) };
}

describe('cards', () => {
    it('AC-001: nine spec files, two sharing a number, give nine cards; the duplicated stem shows its path', async () => {
        const files: Record<string, string> = {};
        for (let number = 1; number <= 7; number += 1) {
            files[`.specs/backlog/000${number}-s${number}.md`] = specText();
        }
        files['.specs/backlog/0008-twin.md'] = specText();
        files['.specs/active/0008-twin.md'] = specText({ status: 'In Progress' });
        const { cards } = await cardsOf(files);
        expect(cards).toHaveLength(9);
        const twins = cards.filter((card) => card.stem === '0008-twin');
        expect(twins.map((card) => card.path).sort()).toEqual(['.specs/active/0008-twin.md', '.specs/backlog/0008-twin.md']);
        expect(cards.filter((card) => card.stem !== '0008-twin').every((card) => card.path === undefined)).toBe(true);
    });

    it('AC-002, AC-003: each state lands in the state 0003 derives; derived states carry their label; the title comes from the spec', async () => {
        const { cards } = await cardsOf({
            '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: LINKED }),
            '.specs/active/0001-a.plan.md': planText({ status: 'Done' }),
            '.specs/active/0002-b.md': specText({ status: 'In Progress', plan: '[0002-b.plan.md](0002-b.plan.md)' }),
            '.specs/active/0002-b.plan.md': planText({ status: 'In Progress' }),
            '.specs/done/0003-c.md': specText({ status: 'Baseline' }),
        });
        expect(cards.map((card) => [card.number, card.state])).toEqual([
            ['0001', 'Review'],
            ['0002', 'Active'],
            ['0003', 'Done'],
        ]);
        expect(cards.some((card) => 'derivedRule' in card || 'lastChangeMs' in card)).toBe(false);
        expect(cards[0]?.title).toBe('Spec');
        expect(cards[0]?.titleIsStem).toBe(false);
    });

    it('AC-003: a spec without a title shows its stem in the title place', async () => {
        const { cards } = await cardsOf({ '.specs/backlog/0001-a.md': '**Status:** Draft\n\n## 1. Summary\n\nText.\n' });
        expect([cards[0]?.title, cards[0]?.titleIsStem]).toEqual(['0001-a', true]);
    });

    it('AC-004: the description comes from the first heading; none gives undefined', async () => {
        const { cards } = await cardsOf({
            '.specs/backlog/0001-a.md': '# A\n\n**Status:** Draft\n\nHandoff reference: x.\n\n## 1. Summary\n\nThe board shows specs.\n',
            '.specs/backlog/0002-b.md': '# B\n\n**Status:** Draft\n\nNo headings here.\n',
        });
        expect(cards.map((card) => card.summary)).toEqual(['The board shows specs.', undefined]);
    });

    it('AC-024: a Blocked card lists each condition: the plan and each return note by file name', async () => {
        const { cards } = await cardsOf({
            '.specs/active/0001-a.md': specText({ status: 'In Progress', plan: LINKED }),
            '.specs/active/0001-a.plan.md': planText({ status: 'Blocked' }),
            '.memory-bank/activeContext.0001-T-002.md': noteText('BLOCKED'),
        });
        expect(cards[0]?.state).toBe('Blocked');
        expect(cards[0]?.blocked).toEqual(['Blocked: plan status Blocked', 'Blocked: return note activeContext.0001-T-002.md']);
    });

    it('AC-014 (0016): a Backlog card shows the first applying need with its rule; a non-Backlog card and a Ready card show none', async () => {
        const { cards } = await cardsOf({
            '.specs/backlog/0001-a.md': specText(),
            '.specs/done/0002-b.md': specText({ status: 'Baseline' }),
            '.specs/backlog/0003-c.md': specText({ plan: '[0003-c.plan.md](0003-c.plan.md)' }),
            '.specs/backlog/0003-c.plan.md': planText({ spec: '[s](0003-c.md)' }),
        });
        expect(cards[0]?.need).toEqual({ text: 'needs a plan', rule: 'R-3' });
        expect(cards[1]?.need).toBeUndefined();
        expect(cards[2]?.need).toBeUndefined();
    });

    it('AC-014 (0016): a Backlog spec with two needs shows the first of them on its card, in the order of §6.3', async () => {
        const { cards } = await cardsOf({ '.specs/backlog/0001-a.md': specText({ criteria: false }) });
        expect(cards[0]?.need).toEqual({ text: 'needs acceptance criteria', rule: 'R-2' });
    });

    it('AC-014: fs170-brownfield-mixed gives the card of 0003 the need "needs a plan"', async () => {
        const project = await readFixture('fs170-brownfield-mixed');
        const cards = buildCards(project, deriveLifecycle(project));
        expect(cards.find((card) => card.number === '0003')?.need).toEqual({ text: 'needs a plan', rule: 'R-3' });
    });

    it('AC-024: the Deprecated marker is on the card of a Deprecated spec only', async () => {
        const { cards } = await cardsOf({
            '.specs/done/0001-a.md': specText({ status: 'Deprecated' }),
            '.specs/done/0002-b.md': specText({ status: 'Baseline' }),
        });
        expect(cards.map((card) => card.deprecated)).toEqual([true, false]);
    });

    it('AC-006: fs-broken badges 0002 (unreadable) and 0003 (contradiction) with one Problem each and no other card', async () => {
        const project = await readFixture('fs-broken');
        const cards = buildCards(project, deriveLifecycle(project));
        expect(cards.map((card) => [card.number, card.problems]).sort()).toEqual([
            ['0001', 0],
            ['0002', 1],
            ['0003', 1],
        ]);
    });

    it('AC-007: format notes alone never badge a card (fs170-brownfield-mixed: 0006 has two notes, 0002 one Problem)', async () => {
        const project = await readFixture('fs170-brownfield-mixed');
        const cards = buildCards(project, deriveLifecycle(project));
        expect(cards.find((card) => card.number === '0006')?.problems).toBe(0);
        expect(cards.find((card) => card.number === '0002')?.problems).toBe(1);
        expect(cards.filter((card) => card.problems > 0)).toHaveLength(1);
    });

    it('AC-006 control: a clean spec has no Problem', async () => {
        const clean = await cardsOf({ '.specs/backlog/0001-a.md': specText() });
        expect(clean.cards[0]?.problems).toBe(0);
    });

    it('AC-020 (0016 §5): an archived orphan plan goes to the banner, and no card is badged for them', async () => {
        const { cards, banner } = await cardsOf({
            '.specs/backlog/0001-a.md': specText(),
            '.specs/plan-archive/0009-orphan.2026-09-19.plan.md': planText({ status: 'Done' }),
        });
        expect(cards.map((card) => card.problems)).toEqual([0]);
        expect(banner.notes.map((line) => line.where)).toContain('.specs/plan-archive/0009-orphan.2026-09-19.plan.md');
        expect(banner.notes.every((line) => line.reason.length > 0)).toBe(true);
        expect(banner.problems).toEqual([]);
    });

    it('0022 AC-013: a project-level Problem of the banner carries its sentence and its reason, a format note only its reason', async () => {
        const { banner } = await cardsOf({
            '.specs/backlog/0001-a.md': specText(),
            '.memory-bank/activeContext.0042-T-001.md': noteText('DONE'),
            '.specs/plan-archive/0009-orphan.2026-09-19.plan.md': planText({ status: 'Done' }),
        });
        expect(banner.problems).toEqual([{ where: '.memory-bank/activeContext.0042-T-001.md', reason: 'return note matches no spec (number 0042)', sentence: 'This return note belongs to no spec (number 0042)' }]);
        expect(banner.notes.length).toBeGreaterThan(0);
        banner.notes.forEach((line) => expect(line).not.toHaveProperty('sentence'));
    });

    it('AC-020: a project with no diagnostic has an empty banner (negative control)', async () => {
        const { banner } = await cardsOf({ '.specs/backlog/0001-a.md': specText() });
        expect(banner).toEqual({ problems: [], notes: [] });
    });

    it('AC-009: an orphan return note is a project-level Problem and the version note is a format note, split in the banner', async () => {
        const project = await readMemory({ '.specs/backlog/0001-a.md': specText(), '.memory-bank/activeContext.0099-T-001.md': '**Status:** DONE\n' });
        const banner = buildBanner(project, deriveLifecycle(project));
        expect(banner.problems.map((line) => line.where)).toEqual(['.memory-bank/activeContext.0099-T-001.md']);
        expect(banner.notes).toEqual([]);
    });

    it('AC-009: a version that is not verified is a project-level format note, never a Problem', async () => {
        const project = { ...(await readMemory({ '.specs/backlog/0001-a.md': specText() })), version: '9.9.9', diagnostics: [{ kind: 'unverified-version' as const, tier: 'note' as const, scope: 'project' as const, reason: 'newer than known' }] };
        const banner = buildBanner(project, deriveLifecycle(project));
        expect(banner).toEqual({ problems: [], notes: [{ where: 'project', reason: 'newer than known' }] });
    });
});

describe('0017 AC-001: the step on a card', () => {
    it('a Ready card carries the short form and the full first line with the plan path', async () => {
        const { cards } = await cardsOf({
            '.specs/backlog/0007-x.md': specText({ plan: '[0007-x.plan.md](0007-x.plan.md)' }),
            '.specs/backlog/0007-x.plan.md': `${planText({ status: 'Not started' })}\n## Steps\n\n### T-003 — Step\n\n- [ ] **Verified (T-003):** —\n`,
        });
        expect(cards[0]?.state).toBe('Ready');
        expect(cards[0]?.step).toEqual({ short: 'Start T-003', line: 'Start T-003 of .specs/backlog/0007-x.plan.md', lines: [{ text: 'Start T-003 of .specs/backlog/0007-x.plan.md', intent: 'Start implementing: T-003 Step' }] });
    });

    it('a Done card has no step', async () => {
        const { cards } = await cardsOf({ '.specs/done/0001-a.md': specText({ status: 'Baseline' }) });
        expect(cards[0]?.state).toBe('Done');
        expect(cards[0]?.step).toBeUndefined();
    });
});

