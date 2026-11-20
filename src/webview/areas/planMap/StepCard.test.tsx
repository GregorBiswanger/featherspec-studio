import { afterEach, describe, expect, it } from 'vitest';
import type { PlanStepView } from '../../../shared/protocol/planMap';
import { step } from '../../../shared/protocol/testing/planSample';
import { mount, click, type Mounted } from '../../testing/dom';
import { StepCard } from './StepCard';

let mounted: Mounted | undefined;
const copied: string[] = [];

afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
    copied.length = 0;
});

async function card(view: PlanStepView, expanded = true): Promise<HTMLElement> {
    mounted = await mount(
        <StepCard cardKey="k" step={view} expanded={expanded} tabStop links={{ fileResult: undefined, onOpen: () => undefined, copyResult: undefined, onCopy: (text) => void copied.push(text) }} onToggle={() => undefined} />,
    );
    return mounted.container.querySelector<HTMLElement>('[data-step-card]')!;
}

function visible(root: Element): string {
    const clone = root.cloneNode(true) as Element;
    clone.querySelectorAll('.visually-hidden').forEach((hidden) => hidden.remove());
    return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('0025 AC-007: the rows Verified and Reported, and the state word after a covered criterion', () => {
    it('0025 AC-007: a done step shows Verified with the short text and the full text as tooltip', async () => {
        const root = await card(step('T-001', 'done', { verified: { short: '2026-11-09 · npm test green', full: '2026-11-09 · npm test green, 3289 passed' } }));
        const row = root.querySelector<HTMLElement>('.step-card-verified')!;
        expect(visible(row)).toBe('Verified 2026-11-09 · npm test green');
        expect(row.title).toBe('2026-11-09 · npm test green, 3289 passed');
        expect(root.querySelector('.step-card-reported')).toBeNull();
    });

    it('0025 AC-007: a returned step shows Reported after the returned line, and no Verified', async () => {
        const root = await card(step('T-003', 'returned', { returned: { status: 'done' }, reported: { short: '2026-11-10 · red → green', full: '2026-11-10 · red → green 3 of 3' } }));
        const reported = root.querySelector<HTMLElement>('.step-card-reported')!;
        expect(visible(reported)).toBe('Reported 2026-11-10 · red → green');
        expect(reported.title).toBe('2026-11-10 · red → green 3 of 3');
        expect(root.querySelector('.step-card-returned')!.compareDocumentPosition(reported) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(root.querySelector('.step-card-verified')).toBeNull();
    });

    it('0025 AC-007: each Covers ID is followed by its state word only where the step view carries one', async () => {
        const root = await card(step('T-002', 'open', { covers: [{ id: 'AC-001', state: 'built' }, { id: 'AC-002' }, { id: 'AC-003', state: 'verified' }] }));
        expect(visible(root.querySelector('.step-card-covers')!)).toBe('Covers AC-001 built, AC-002, AC-003 verified');
    });

    it('0025 AC-007: a step with none of these has none of the rows', async () => {
        const root = await card(step('T-004', 'open'));
        expect(root.querySelector('.step-card-verified, .step-card-reported, .step-card-cover-state')).toBeNull();
    });
});

describe('0025 AC-008: Copy prompt in the expanded part, secondary, on the step the first line names', () => {
    it('0025 AC-008: it follows Open in plan, is secondary, copies exactly the line and is named Copy prompt: <line>', async () => {
        const line = 'Implement T-003 of .specs/active/0001-a.plan.md';
        const root = await card(step('T-003', 'next', { copy: line }));
        const more = root.querySelector('.step-card-more')!;
        const button = more.querySelector<HTMLButtonElement>('button.copy-button')!;
        expect(button.classList.contains('copy-secondary')).toBe(true);
        expect(button.getAttribute('aria-label')).toBe(`Copy prompt: ${line}`);
        expect(more.querySelector('.step-card-open')!.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        await click(button);
        expect(copied).toEqual([line]);
    });

    it('0025 AC-008: a card without a copy line has no Copy button', async () => {
        const root = await card(step('T-004', 'open'));
        expect(root.querySelector('.copy-button')).toBeNull();
    });
});

describe('0025 AC-017: the disclosure carries the whole name as tooltip', () => {
    it('0025 AC-017: title is <ID> <title>', async () => {
        const root = await card(step('T-004', 'open', { title: 'A long title that the card cuts after two lines' }), false);
        expect(root.querySelector<HTMLButtonElement>('button[data-card-toggle]')!.title).toBe('T-004 A long title that the card cuts after two lines');
    });
});
