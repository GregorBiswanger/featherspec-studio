import { act, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { PlanWaysView } from '../../../shared/protocol/planMap';
import { click, mount, type Mounted } from '../../testing/dom';
import { Ways } from './Ways';

let mounted: Mounted | undefined;

afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
});

const PLAN = '.specs/active/0007-thing.plan.md';
const PROMPTS: PlanWaysView['prompts'] = [`Implement the whole stage 2 of ${PLAN} in sequence`, `Implement the whole stage 2 of ${PLAN} with subagents`, `Implement the whole stage 2 of ${PLAN} with other agents`];
const START_LINES = [`Implement T-003 of ${PLAN} as a parallel worker.`, `Implement T-004 of ${PLAN} as a parallel worker.`];

function view(startLines: string[] = START_LINES): PlanWaysView {
    return { stage: 2, prompts: PROMPTS, startLines };
}

let update: (ways: PlanWaysView) => Promise<void>;

function Harness(props: { ways: PlanWaysView }) {
    const [ways, setWays] = useState(props.ways);
    update = async (next) => {
        await act(async () => setWays(next));
    };
    return <Ways ways={ways} copyResult={undefined} onCopy={() => undefined} />;
}

async function show(ways: PlanWaysView = view()): Promise<HTMLElement> {
    mounted = await mount(<Harness ways={ways} />);
    return mounted.container;
}

async function expand(container: HTMLElement): Promise<void> {
    await click(container.querySelector<HTMLButtonElement>('.plan-ways-toggle')!);
}

const radios = (container: HTMLElement) => [...container.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
const checkedWay = (container: HTMLElement) => radios(container).find((radio) => radio.checked)?.value;
const codes = (container: HTMLElement) => [...container.querySelectorAll('code')].map((code) => code.textContent);

describe('0026 AC-009: the expanded ways block is one radio group', () => {
    it('holds, in DOM order, a radiogroup named by the disclosure with three radios of one name, labelled literally, exactly one checked', async () => {
        const container = await show();
        await expand(container);
        const toggle = container.querySelector<HTMLButtonElement>('.plan-ways-toggle')!;
        const group = container.querySelector<HTMLElement>('[role="radiogroup"]')!;
        expect(group.getAttribute('aria-labelledby')).toBe(toggle.id);
        expect(toggle.textContent).toBe('Ways to run stage 2');
        expect(radios(container)).toHaveLength(3);
        expect(new Set(radios(container).map((radio) => radio.name)).size).toBe(1);
        expect(radios(container)[0]!.name).not.toBe('');
        expect(radios(container).filter((radio) => radio.checked)).toHaveLength(1);
        expect([...group.querySelectorAll('label')].map((label) => label.textContent)).toEqual([
            'In sequence · default — One chat builds the steps one after another.',
            'Subagents — The chat hands each step to a subagent; subagents cannot ask you.',
            'Other agents — Each step runs in another chat or worktree from its start line.',
        ]);
        expect(toggle.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('no element outside a toggletip region holds M-08 or an effect sentence of 0023 §5.4, and no stage prompt of an unchecked way is in the DOM', async () => {
        const container = await show();
        await expand(container);
        const text = container.textContent ?? '';
        expect(text).not.toContain('Steps joined by');
        expect(text).not.toContain('stops at the stage end and at every test review');
        expect(text).not.toContain("Where a working agreement asks for a test review");
        expect(codes(container)).toEqual([PROMPTS[0]]);
        await click(radios(container)[1]!);
        expect(codes(container)).toEqual([PROMPTS[1]]);
        expect(container.textContent).not.toContain(PROMPTS[0]);
    });

    it('negative control: the old structure (a list item per way with its prompt) is gone', async () => {
        const container = await show();
        await expand(container);
        expect(container.querySelector('li.plan-way')).toBeNull();
        expect(container.querySelectorAll('.plan-way-prompt')).toHaveLength(1);
    });
});

describe('0026 AC-010: In sequence is the one tagged way and starts checked', () => {
    it('the tagged radio is In sequence with default, checked, and the block says nothing of recommended', async () => {
        const container = await show();
        await expand(container);
        expect(checkedWay(container)).toBe('sequence');
        const tags = [...container.querySelectorAll('.plan-way-tag')];
        expect(tags.map((tag) => tag.textContent)).toEqual(['default']);
        expect(tags[0]!.closest('label')?.getAttribute('data-way')).toBe('sequence');
        expect(container.textContent?.toLowerCase()).not.toContain('recommended');
    });

    it('whatever the closing text of the plan says, nothing in the view carries a way: In sequence stays the default (D-3)', async () => {
        for (const _prose of ['Recommended: in sequence, since both steps are small.', 'Parallel: stage 2 (add vs. subtract: separate files).', 'Do not use subagents; other agents or subagents both work.', '']) {
            const container = await show();
            await expand(container);
            expect(checkedWay(container)).toBe('sequence');
            mounted?.unmount();
            mounted = undefined;
        }
    });

    it('another checked way survives a model update; a new showing (a new mount) checks In sequence again', async () => {
        const container = await show();
        await expand(container);
        await click(radios(container)[2]!);
        expect(checkedWay(container)).toBe('otherAgents');
        await update(view([...START_LINES, `Implement T-005 of ${PLAN} as a parallel worker.`]));
        expect(checkedWay(container)).toBe('otherAgents');
        mounted?.unmount();
        mounted = undefined;
        const again = await show();
        await expand(again);
        expect(checkedWay(again)).toBe('sequence');
    });
});

describe('0026 AC-011: the checked way\'s part', () => {
    it('In sequence and Subagents: their stage prompt in code with a secondary Copy prompt', async () => {
        const container = await show();
        await expand(container);
        for (const [index, prompt] of [[0, PROMPTS[0]], [1, PROMPTS[1]]] as const) {
            await click(radios(container)[index]!);
            expect(codes(container)).toEqual([prompt]);
            const copy = container.querySelector<HTMLButtonElement>('.plan-way-prompt > button.copy-button')!;
            expect(copy.classList.contains('copy-secondary')).toBe(true);
            expect(copy.getAttribute('aria-label')).toBe(`Copy prompt: ${prompt}`);
            expect(container.querySelector('.plan-start-lines')).toBeNull();
        }
    });

    it('Given fs110-parallel-synthetic without notes (start lines show), Other agents: M-10 and the start lines with icon Copies, no with other agents prompt', async () => {
        const container = await show();
        await expand(container);
        await click(radios(container)[2]!);
        expect(container.querySelector('.plan-start-lead')?.textContent).toBe('Start lines — commit first: a worktree holds committed files only.');
        expect(codes(container)).toEqual(START_LINES);
        expect(container.textContent).not.toContain('with other agents');
        const icons = [...container.querySelectorAll<HTMLButtonElement>('.plan-start-lines button.copy-icon')];
        expect(icons.map((button) => button.getAttribute('aria-label'))).toEqual(START_LINES.map((line) => `Copy prompt: ${line}`));
        expect(container.querySelector('.plan-way-prompt')).toBeNull();
    });

    it('Given a stage whose next step is outside the group (no start lines), Other agents: the with other agents prompt with a secondary Copy prompt, no M-10, no start line', async () => {
        const container = await show(view([]));
        await expand(container);
        await click(radios(container)[2]!);
        expect(codes(container)).toEqual([PROMPTS[2]]);
        expect(container.querySelector('.plan-start-lead')).toBeNull();
        expect(container.querySelector('.plan-start-lines')).toBeNull();
        expect(container.querySelector<HTMLButtonElement>('.plan-way-prompt > button.copy-button')?.classList.contains('copy-secondary')).toBe(true);
    });
});
