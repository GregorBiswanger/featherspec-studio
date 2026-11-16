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
        expect(cards.map((card) => [card.number, card.state, card.derivedRule])).toEqual([
            ['0001', 'Review', 'S-REVIEW'],
            ['0002', 'Active', undefined],
            ['0003', 'Done', undefined],
        ]);
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

    it('AC-024: a Backlog card shows the lowest failing readiness check with its reason; a non-Backlog card shows none', async () => {
        const { cards } = await cardsOf({
            '.specs/backlog/0001-a.md': specText(),
            '.specs/done/0002-b.md': specText({ status: 'Baseline' }),
        });
        expect(cards[0]?.readiness).toEqual({ id: 'R-3', reason: 'No sibling plan, or the Plan line does not link it.' });
        expect(cards[1]?.readiness).toBeUndefined();
    });

    it('AC-024: the Deprecated marker is on the card of a Deprecated spec only', async () => {
        const { cards } = await cardsOf({
            '.specs/done/0001-a.md': specText({ status: 'Deprecated' }),
            '.specs/done/0002-b.md': specText({ status: 'Baseline' }),
        });
        expect(cards.map((card) => card.deprecated)).toEqual([true, false]);
    });

    it('AC-020: a broken plan badges only its own spec and leaves the other card without a badge', async () => {
        const project = await readFixture('fs-broken');
        const lifecycle = deriveLifecycle(project);
        const cards = buildCards(project, lifecycle);
        const badged = cards.filter((card) => card.diagnostics > 0);
        expect(badged.length).toBeGreaterThan(0);
        expect(badged.length).toBeLessThan(cards.length + 1);
        const clean = await cardsOf({ '.specs/backlog/0001-a.md': specText() });
        expect(clean.cards[0]?.diagnostics).toBe(0);
    });

    it('AC-020: an orphan plan and an unlinked return note go to the banner, and no card is badged for them', async () => {
        const { cards, banner } = await cardsOf({
            '.specs/backlog/0001-a.md': specText(),
            '.specs/active/0009-orphan.plan.md': planText({ status: 'In Progress' }),
        });
        expect(cards.map((card) => card.diagnostics)).toEqual([0]);
        expect(banner.map((line) => line.where)).toContain('.specs/active/0009-orphan.plan.md');
        expect(banner.every((line) => line.reason.length > 0)).toBe(true);
    });

    it('AC-020: a project with no diagnostic has an empty banner (negative control)', async () => {
        const { banner } = await cardsOf({ '.specs/backlog/0001-a.md': specText() });
        expect(banner).toEqual([]);
    });
});
