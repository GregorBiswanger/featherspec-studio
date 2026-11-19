import { act, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { PlanWaysView } from '../../../shared/protocol/planMap';
import { WAYS_LEAD_TEXT } from '../../../shared/protocol/planMapTexts';
import { click, mount, type Mounted } from '../../testing/dom';
import { Toggletip } from '../../ui/Toggletip';
import { Ways } from './Ways';

let mounted: Mounted | undefined;

afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
});

const PLAN = '.specs/active/0007-thing.plan.md';
const PROMPTS: PlanWaysView['prompts'] = [`Implement the whole stage 2 of ${PLAN} in sequence`, `Implement the whole stage 2 of ${PLAN} with subagents`, `Implement the whole stage 2 of ${PLAN} with other agents`];
const LINES = [`Implement T-003 of ${PLAN} as a parallel worker.`];

const PARAGRAPHS = [
    'Steps joined by ‖ share no file and may run in parallel. In sequence is the default; parallel pays off for large steps. Either parallel way runs the quality gates once, on the combined result, before a step is ticked.',
    'In sequence: One chat builds the steps one after another and stops at the stage end and at every test review on the way.',
    "Subagents: Where a working agreement asks for a test review, the chat first writes the stage's tests and stops for it; then it hands each step to a subagent. Subagents cannot ask you; there is no steering in between.",
    'Other agents: Each step runs from its own start line in another chat, tool or worktree and leaves a return note; a worktree holds committed files only, so commit first. Until start lines show here, the stage prompt has the chat propose that commit and print them. Once every worker is back, the next step integrates the returned steps.',
];

let update: (ways: PlanWaysView | undefined) => Promise<void>;

function Harness(props: { ways: PlanWaysView }) {
    const [ways, setWays] = useState<PlanWaysView | undefined>(props.ways);
    update = async (next) => {
        await act(async () => setWays(next));
    };
    return (
        <div>
            {ways === undefined ? null : <Ways ways={ways} copyResult={undefined} onCopy={() => undefined} />}
            <Toggletip label="About this step" glyph="?" paragraphs={['Other.']} />
        </div>
    );
}

async function show(lines = LINES): Promise<HTMLElement> {
    mounted = await mount(<Harness ways={{ stage: 2, prompts: PROMPTS, startLines: lines }} />);
    await click(mounted.container.querySelector<HTMLButtonElement>('.plan-ways-toggle')!);
    return mounted.container;
}

const about = (container: HTMLElement) => container.querySelector<HTMLButtonElement>('[data-ways] button.toggletip')!;

describe('0026 AC-012: About these ways is a toggletip with four paragraphs', () => {
    it('name and tooltip About these ways, aria-expanded, a role=status region, the four paragraphs literally, no focusable element in them', async () => {
        const container = await show();
        expect(about(container).getAttribute('aria-label')).toBe('About these ways');
        expect(about(container).getAttribute('title')).toBe('About these ways');
        expect(about(container).getAttribute('aria-expanded')).toBe('false');
        const region = container.querySelector('[data-ways] .toggletip-region')!;
        expect(region.getAttribute('role')).toBe('status');
        expect(region.textContent).toBe('');
        await click(about(container));
        expect(about(container).getAttribute('aria-expanded')).toBe('true');
        expect([...region.querySelectorAll('p')].map((paragraph) => paragraph.textContent)).toEqual(PARAGRAPHS);
        expect(PARAGRAPHS[0]).toBe(WAYS_LEAD_TEXT);
        expect(region.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0);
    });

    it('closes by Escape (focus back on the button), a second activation, an outside press and a focus move; one popup at a time with another toggletip', async () => {
        const container = await show();
        const other = container.querySelector<HTMLButtonElement>('button.toggletip:not([data-ways] button)')!;
        await click(about(container));
        await act(async () => about(container).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
        expect(about(container).getAttribute('aria-expanded')).toBe('false');
        await click(about(container));
        await click(about(container));
        expect(about(container).getAttribute('aria-expanded')).toBe('false');
        await click(about(container));
        await act(async () => document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })));
        expect(about(container).getAttribute('aria-expanded')).toBe('false');
        await click(about(container));
        await click(other);
        expect(about(container).getAttribute('aria-expanded')).toBe('false');
        expect(other.getAttribute('aria-expanded')).toBe('true');
    });

    it('stands after the radio group and before the checked way\'s part in DOM order', async () => {
        const container = await show();
        const group = container.querySelector('[role="radiogroup"]')!;
        const tip = about(container);
        const part = container.querySelector('.plan-way-prompt')!;
        expect(group.compareDocumentPosition(tip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(tip.compareDocumentPosition(part) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
});

describe('0026 AC-013: focus and state through updates', () => {
    it('the checked way\'s part changing while a radio has focus keeps focus on that radio', async () => {
        const container = await show();
        const radio = container.querySelectorAll<HTMLInputElement>('input[type="radio"]')[2]!;
        await click(radio);
        await act(async () => radio.focus());
        await update({ stage: 2, prompts: PROMPTS, startLines: [] });
        expect(document.activeElement).toBe(radio);
        expect(container.querySelector('.plan-way-prompt code')?.textContent).toBe(PROMPTS[2]);
    });

    it('an update that keeps the block keeps its expanded state and the checked way', async () => {
        const container = await show();
        await click(container.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1]!);
        await update({ stage: 2, prompts: PROMPTS, startLines: [...LINES, 'x'] });
        expect(container.querySelector('.plan-ways-toggle')?.getAttribute('aria-expanded')).toBe('true');
        expect(container.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1]!.checked).toBe(true);
    });
});
